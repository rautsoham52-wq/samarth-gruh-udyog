import logging
import os
from collections.abc import Generator
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal, overload
from uuid import uuid4

from fastapi import Depends
from fastapi import Cookie
from fastapi import FastAPI
from fastapi import HTTPException
from fastapi import Header, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

if __package__:
    from .database import SessionLocal, engine
    from .models import (
        AdminUser,
        Base,
        Customer,
        Expense,
        InventoryTransaction,
        Order,
        OrderItem,
        Product,
        ProductVariant,
    )
    from .schemas import (
        AdminLoginRequest,
        AdminDashboardResponse,
        AdminOrderItemResponse,
        AdminOrderResponse,
        AdminOrderStatusUpdate,
        AdminResponse,
        ExpenseCreate,
        ExpenseResponse,
        ExpenseUpdate,
        OrderCreate,
        OrderItemResponse,
        OrderResponse,
        OrderTrackRequest,
        ProductSalesRow,
        ProductResponse,
        ProductVariantAdminResponse,
        ProductVariantCreate,
        ProductVariantPublic,
        ProductVariantUpdate,
        SalesPeriodRow,
        SalesReportResponse,
        TrackedOrderResponse,
    )
    from .security import (
        ACCESS_TOKEN_EXPIRE_MINUTES,
        ADMIN_AUTH_COOKIE,
        auth_cookie_secure,
        auth_cookie_samesite,
        create_access_token,
        decode_access_token,
        verify_password,
    )
else:
    from database import SessionLocal, engine
    from models import (
        AdminUser,
        Base,
        Customer,
        Expense,
        InventoryTransaction,
        Order,
        OrderItem,
        Product,
        ProductVariant,
    )
    from schemas import (
        AdminLoginRequest,
        AdminDashboardResponse,
        AdminOrderItemResponse,
        AdminOrderResponse,
        AdminOrderStatusUpdate,
        AdminResponse,
        ExpenseCreate,
        ExpenseResponse,
        ExpenseUpdate,
        OrderCreate,
        OrderItemResponse,
        OrderResponse,
        OrderTrackRequest,
        ProductSalesRow,
        ProductResponse,
        ProductVariantAdminResponse,
        ProductVariantCreate,
        ProductVariantPublic,
        ProductVariantUpdate,
        SalesPeriodRow,
        SalesReportResponse,
        TrackedOrderResponse,
    )
    from security import (
        ACCESS_TOKEN_EXPIRE_MINUTES,
        ADMIN_AUTH_COOKIE,
        auth_cookie_secure,
        auth_cookie_samesite,
        create_access_token,
        decode_access_token,
        verify_password,
    )


app = FastAPI(title="Navratri API")
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5176,http://127.0.0.1:5176,"
        "http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
production_frontend_origin = "https://samarth-gruh-udyog-1.onrender.com"
if production_frontend_origin not in allowed_origins:
    allowed_origins.append(production_frontend_origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
Base.metadata.create_all(bind=engine)
logger = logging.getLogger(__name__)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_admin(
    access_token: str | None = Cookie(default=None, alias=ADMIN_AUTH_COOKIE),
    db: Session = Depends(get_db),
) -> AdminUser:
    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin_id = decode_access_token(access_token)
    try:
        admin = db.get(AdminUser, admin_id)
    except SQLAlchemyError as error:
        logger.error("Unable to verify the admin session")
        raise HTTPException(
            status_code=503,
            detail="Unable to verify the admin session.",
        ) from error

    if admin is None or not admin.is_active or admin.role != "admin":
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return admin


@app.post("/admin/login", response_model=AdminResponse)
def admin_login(payload: AdminLoginRequest, response: Response, db: Session = Depends(get_db)) -> AdminUser:
    try:
        admin = db.scalar(select(AdminUser).where(AdminUser.email == payload.email))
    except SQLAlchemyError as error:
        logger.error("Unable to authenticate admin")
        raise HTTPException(
            status_code=503,
            detail="Unable to authenticate right now.",
        ) from error

    if not verify_password(payload.password, admin.password_hash if admin else None):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if admin is None or not admin.is_active or admin.role != "admin":
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(admin.id)
    response.set_cookie(
        key=ADMIN_AUTH_COOKIE,
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=auth_cookie_secure(),
        samesite=auth_cookie_samesite(),
        path="/api/admin",
    )
    return admin


@app.get("/admin/me", response_model=AdminResponse)
def read_current_admin(
    admin: AdminUser = Depends(get_current_admin),
) -> AdminUser:
    return admin


@app.post("/admin/logout")
def admin_logout(response: Response) -> dict[str, str]:
    response.delete_cookie(
        key=ADMIN_AUTH_COOKIE,
        httponly=True,
        secure=auth_cookie_secure(),
        samesite=auth_cookie_samesite(),
        path="/api/admin",
    )
    return {"message": "Logged out."}


ORDER_STATUSES = (
    "NEW",
    "ACCEPTED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
)
NEXT_ORDER_STATUS = {
    "NEW": "ACCEPTED",
    "ACCEPTED": "PREPARING",
    "PREPARING": "READY_FOR_PICKUP",
    "READY_FOR_PICKUP": "COMPLETED",
}


def normalized_order_status(status: str) -> str:
    return status.strip().upper().replace(" ", "_")


def get_admin_order_query():
    return select(Order).options(
        selectinload(Order.customer),
        selectinload(Order.items).selectinload(OrderItem.product),
    )


def make_admin_order_response(order: Order) -> AdminOrderResponse:
    return AdminOrderResponse(
        order_number=order.order_number,
        customer_name=order.customer.name,
        customer_phone=order.customer.phone,
        pickup_date=order.pickup_date,
        pickup_time=order.pickup_time,
        special_instructions=order.special_instructions,
        status=normalized_order_status(order.status),
        payment_status=order.payment_status,
        subtotal=order.subtotal,
        discount=order.discount,
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=[
            AdminOrderItemResponse(
                product_id=item.product_id,
                variant_id=item.variant_id,
                product_name=item.product.name,
                product_image=item.product.image,
                variant=item.variant,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in order.items
        ],
    )


def available_stock(variant: ProductVariant) -> int:
    return max(variant.stock_quantity - variant.reserved_quantity, 0)


@overload
def make_variant_response(
    variant: ProductVariant,
    *,
    include_admin_fields: Literal[True],
) -> ProductVariantAdminResponse: ...


@overload
def make_variant_response(
    variant: ProductVariant,
    *,
    include_admin_fields: Literal[False] = False,
) -> ProductVariantPublic: ...


def make_variant_response(
    variant: ProductVariant,
    *,
    include_admin_fields: bool = False,
) -> ProductVariantPublic | ProductVariantAdminResponse:
    common = {
        "id": variant.id,
        "name": variant.name,
        "quantity_value": variant.quantity_value,
        "unit": variant.unit,
        "selling_price": variant.selling_price,
        "is_available": variant.is_available,
        "available_quantity": available_stock(variant),
    }
    if include_admin_fields:
        return ProductVariantAdminResponse(
            **common,
            product_id=variant.product_id,
            product_name=variant.product.name,
            cost_price=variant.cost_price,
            stock_quantity=variant.stock_quantity,
            reserved_quantity=variant.reserved_quantity,
            low_stock_threshold=variant.low_stock_threshold,
            is_active=variant.is_active,
        )
    return ProductVariantPublic(**common)


def make_product_response(product: Product) -> ProductResponse:
    return ProductResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        image=product.image,
        is_available=product.is_available,
        created_at=product.created_at,
        variants=[
            ProductVariantPublic(
                id=variant.id,
                name=variant.name,
                quantity_value=variant.quantity_value,
                unit=variant.unit,
                selling_price=variant.selling_price,
                is_available=variant.is_available,
                available_quantity=available_stock(variant),
            )
            for variant in sorted(
                product.variants,
                key=lambda item: item.quantity_value
                * (Decimal("1000") if item.unit.lower() == "kg" else Decimal("1")),
            )
            if variant.is_active and variant.is_available
        ],
    )


def add_inventory_transaction(
    db: Session,
    variant: ProductVariant,
    transaction_type: str,
    *,
    quantity_change: int = 0,
    reserved_change: int = 0,
    order_id: int | None = None,
    note: str | None = None,
) -> None:
    db.add(
        InventoryTransaction(
            variant_id=variant.id,
            order_id=order_id,
            transaction_type=transaction_type,
            quantity_change=quantity_change,
            reserved_change=reserved_change,
            note=note,
        )
    )


def day_bounds(start_date: date, end_date: date):
    return func.date(func.coalesce(Order.completed_at, Order.created_at)).between(
        start_date,
        end_date,
    )


def sales_date_range(period: str, start_date: date | None, end_date: date | None):
    today = date.today()
    if start_date is not None or end_date is not None:
        if start_date is None or end_date is None or start_date > end_date:
            raise HTTPException(
                status_code=422,
                detail="Provide a valid start_date and end_date range.",
            )
        return start_date, end_date
    if period == "today":
        return today, today
    if period == "week":
        week_start = today - timedelta(days=today.weekday())
        return week_start, today
    if period == "month":
        return today.replace(day=1), today
    raise HTTPException(status_code=422, detail="Invalid sales period.")


def compute_sales_report(db: Session, start_date: date, end_date: date) -> SalesReportResponse:
    order_date_filter = day_bounds(start_date, end_date)
    completed_orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .where(func.upper(Order.status) == "COMPLETED", order_date_filter)
        .order_by(Order.completed_at, Order.id)
    ).all()
    expense_total = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), Decimal("0.00"))).where(
            Expense.expense_date.between(start_date, end_date)
        )
    ) or Decimal("0.00")

    revenue = sum((order.total_amount for order in completed_orders), Decimal("0.00"))
    product_cost = Decimal("0.00")
    uncosted_items = 0
    product_totals: dict[int, dict[str, int | Decimal | str]] = {}
    for order in completed_orders:
        for item in order.items:
            if item.unit_cost_snapshot is None:
                uncosted_items += 1
            else:
                product_cost += item.unit_cost_snapshot * item.quantity
            product_row = product_totals.setdefault(
                item.product_id,
                {
                    "product_name": item.product.name,
                    "quantity_sold": 0,
                    "revenue": Decimal("0.00"),
                },
            )
            product_row["quantity_sold"] = int(product_row["quantity_sold"]) + item.quantity
            product_row["revenue"] = Decimal(product_row["revenue"]) + item.line_total

    complete = uncosted_items == 0
    gross_profit = revenue - product_cost if complete else None
    net_profit = gross_profit - expense_total if gross_profit is not None else None
    average_order_value = (
        (revenue / len(completed_orders)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )
        if completed_orders
        else Decimal("0.00")
    )
    return SalesReportResponse(
        start_date=start_date,
        end_date=end_date,
        total_orders=len(completed_orders),
        total_revenue=revenue,
        product_cost=product_cost if complete else None,
        gross_profit=gross_profit,
        total_expenses=expense_total,
        net_profit=net_profit,
        average_order_value=average_order_value,
        cost_data_complete=complete,
        uncosted_order_items=uncosted_items,
        product_sales=[
            ProductSalesRow(
                product_id=product_id,
                product_name=str(values["product_name"]),
                quantity_sold=int(values["quantity_sold"]),
                revenue=Decimal(values["revenue"]),
            )
            for product_id, values in sorted(product_totals.items())
        ],
    )


@app.get("/admin/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardResponse:
    try:
        today_orders = db.scalar(
            select(func.count(Order.id)).where(
                func.date(Order.created_at) == func.current_date()
            )
        ) or 0
        raw_status_counts = db.execute(
            select(Order.status, func.count(Order.id)).group_by(Order.status)
        ).all()
    except SQLAlchemyError as error:
        logger.exception("Failed to load admin dashboard")
        raise HTTPException(
            status_code=500,
            detail="Unable to load the admin dashboard.",
        ) from error

    counts = {status: 0 for status in ORDER_STATUSES}
    for raw_status, count in raw_status_counts:
        normalized = normalized_order_status(raw_status)
        if normalized in counts:
            counts[normalized] += count

    today_report = compute_sales_report(db, date.today(), date.today())

    return AdminDashboardResponse(
        today_orders=today_orders,
        today_sales=today_report.total_revenue,
        new_orders=counts["NEW"],
        accepted_orders=counts["ACCEPTED"],
        preparing_orders=counts["PREPARING"],
        ready_for_pickup_orders=counts["READY_FOR_PICKUP"],
        completed_orders=counts["COMPLETED"],
        today_product_cost=today_report.product_cost,
        today_gross_profit=today_report.gross_profit,
        today_expenses=today_report.total_expenses,
        today_net_profit=today_report.net_profit,
        today_cost_data_complete=today_report.cost_data_complete,
    )


@app.get(
    "/admin/inventory",
    response_model=list[ProductVariantAdminResponse],
)
def get_admin_inventory(
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ProductVariantAdminResponse]:
    try:
        variants = db.scalars(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .where(ProductVariant.is_active.is_(True))
            .order_by(Product.name, ProductVariant.quantity_value)
            .join(Product)
        ).all()
        return [
            make_variant_response(variant, include_admin_fields=True)
            for variant in variants
        ]
    except SQLAlchemyError as error:
        logger.exception("Failed to load inventory")
        raise HTTPException(status_code=500, detail="Unable to load inventory.") from error


@app.post(
    "/admin/products/{product_id}/variants",
    response_model=ProductVariantAdminResponse,
    status_code=201,
)
def create_product_variant(
    product_id: int,
    payload: ProductVariantCreate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductVariantAdminResponse:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    variant = ProductVariant(product_id=product_id, **payload.model_dump())
    db.add(variant)
    try:
        db.commit()
        db.refresh(variant)
        return make_variant_response(variant, include_admin_fields=True)
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to create product variant")
        raise HTTPException(
            status_code=409,
            detail="A variant with that name may already exist for this product.",
        ) from error


@app.patch(
    "/admin/inventory/variants/{variant_id}",
    response_model=ProductVariantAdminResponse,
)
def update_product_variant(
    variant_id: int,
    payload: ProductVariantUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> ProductVariantAdminResponse:
    try:
        variant = db.scalar(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .where(ProductVariant.id == variant_id)
            .with_for_update()
        )
        if variant is None:
            raise HTTPException(status_code=404, detail="Product variant not found.")

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            raise HTTPException(status_code=422, detail="Provide at least one value to update.")
        if any(value is None for value in updates.values()):
            raise HTTPException(status_code=422, detail="Variant values cannot be null.")
        if "stock_quantity" in updates:
            new_stock = updates["stock_quantity"]
            if new_stock < variant.reserved_quantity:
                raise HTTPException(
                    status_code=409,
                    detail="Stock cannot be lower than currently reserved stock.",
                )
            difference = new_stock - variant.stock_quantity
            if difference:
                add_inventory_transaction(
                    db,
                    variant,
                    "ADJUSTMENT",
                    quantity_change=difference,
                    note="Admin stock adjustment",
                )
        for field, value in updates.items():
            setattr(variant, field, value)
        db.commit()
        db.refresh(variant)
        return make_variant_response(variant, include_admin_fields=True)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to update product variant")
        raise HTTPException(
            status_code=500,
            detail="Unable to update product inventory.",
        ) from error


@app.get("/admin/sales", response_model=SalesReportResponse)
def get_sales_report(
    period: str = "today",
    start_date: date | None = None,
    end_date: date | None = None,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> SalesReportResponse:
    first_day, last_day = sales_date_range(period, start_date, end_date)
    try:
        return compute_sales_report(db, first_day, last_day)
    except SQLAlchemyError as error:
        logger.exception("Failed to calculate sales report")
        raise HTTPException(
            status_code=500,
            detail="Unable to calculate the sales report.",
        ) from error


@app.get("/admin/reports/sales", response_model=list[SalesPeriodRow])
def get_sales_period_report(
    group_by: str = "daily",
    limit: int = 30,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[SalesPeriodRow]:
    period_map = {"daily": "day", "weekly": "week", "monthly": "month"}
    if group_by not in period_map:
        raise HTTPException(status_code=422, detail="group_by must be daily, weekly, or monthly.")
    if not 1 <= limit <= 90:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 90.")

    group_expression = func.date_trunc(
        period_map[group_by],
        func.coalesce(Order.completed_at, Order.created_at),
    )
    try:
        buckets = db.execute(
            select(group_expression)
            .where(func.upper(Order.status) == "COMPLETED")
            .group_by(group_expression)
            .order_by(group_expression.desc())
            .limit(limit)
        ).scalars().all()

        rows = []
        for bucket in buckets:
            first_day = bucket.date() if isinstance(bucket, datetime) else bucket
            if group_by == "weekly":
                first_day -= timedelta(days=first_day.weekday())
                last_day = first_day + timedelta(days=6)
            elif group_by == "monthly":
                from calendar import monthrange

                last_day = first_day.replace(
                    day=monthrange(first_day.year, first_day.month)[1]
                )
            else:
                last_day = first_day
            report = compute_sales_report(db, first_day, last_day)
            rows.append(
                SalesPeriodRow(
                    period_start=first_day,
                    completed_orders=report.total_orders,
                    revenue=report.total_revenue,
                    product_cost=report.product_cost,
                    gross_profit=report.gross_profit,
                    expenses=report.total_expenses,
                    net_profit=report.net_profit,
                    cost_data_complete=report.cost_data_complete,
                )
            )
        return rows
    except SQLAlchemyError as error:
        logger.exception("Failed to build sales period report")
        raise HTTPException(
            status_code=500,
            detail="Unable to build the sales report.",
        ) from error


@app.get("/admin/expenses", response_model=list[ExpenseResponse])
def get_expenses(
    start_date: date | None = None,
    end_date: date | None = None,
    category: str | None = None,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[Expense]:
    statement = select(Expense)
    if start_date is not None or end_date is not None:
        if start_date is None or end_date is None or start_date > end_date:
            raise HTTPException(status_code=422, detail="Provide a valid date range.")
        statement = statement.where(Expense.expense_date.between(start_date, end_date))
    if category:
        statement = statement.where(Expense.category == category)
    try:
        return db.scalars(
            statement.order_by(Expense.expense_date.desc(), Expense.id.desc())
        ).all()
    except SQLAlchemyError as error:
        logger.exception("Failed to load expenses")
        raise HTTPException(status_code=500, detail="Unable to load expenses.") from error


@app.post("/admin/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(
    payload: ExpenseCreate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Expense:
    expense = Expense(**payload.model_dump())
    db.add(expense)
    try:
        db.commit()
        db.refresh(expense)
        return expense
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to create expense")
        raise HTTPException(status_code=500, detail="Unable to save this expense.") from error


@app.patch("/admin/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Expense:
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Provide at least one value to update.")
    if any(
        value is None and field != "notes"
        for field, value in updates.items()
    ):
        raise HTTPException(status_code=422, detail="Expense values cannot be null.")
    for field, value in updates.items():
        setattr(expense, field, value)
    try:
        db.commit()
        db.refresh(expense)
        return expense
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to update expense")
        raise HTTPException(status_code=500, detail="Unable to update this expense.") from error


@app.delete("/admin/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    db.delete(expense)
    try:
        db.commit()
        return {"message": "Expense deleted."}
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to delete expense")
        raise HTTPException(status_code=500, detail="Unable to delete this expense.") from error


@app.get("/admin/orders", response_model=list[AdminOrderResponse])
def get_admin_orders(
    status: str | None = None,
    search: str | None = None,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[AdminOrderResponse]:
    statement = get_admin_order_query().join(Order.customer)
    if status:
        normalized_filter = normalized_order_status(status)
        if normalized_filter not in ORDER_STATUSES:
            raise HTTPException(status_code=422, detail="Invalid order status filter.")
        statement = statement.where(
            func.upper(func.replace(Order.status, " ", "_")) == normalized_filter
        )
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Order.order_number.ilike(search_term),
                Customer.name.ilike(search_term),
                Customer.phone.ilike(search_term),
            )
        )

    try:
        orders = db.scalars(
            statement.order_by(Order.created_at.desc(), Order.id.desc())
        ).all()
        return [make_admin_order_response(order) for order in orders]
    except SQLAlchemyError as error:
        logger.exception("Failed to load admin orders")
        raise HTTPException(
            status_code=500,
            detail="Unable to load orders.",
        ) from error


@app.get("/admin/orders/{order_number}", response_model=AdminOrderResponse)
def get_admin_order(
    order_number: str,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOrderResponse:
    try:
        order = db.scalar(
            get_admin_order_query().where(Order.order_number == order_number)
        )
    except SQLAlchemyError as error:
        logger.exception("Failed to load admin order")
        raise HTTPException(
            status_code=500,
            detail="Unable to load this order.",
        ) from error
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return make_admin_order_response(order)


@app.patch(
    "/admin/orders/{order_number}/status",
    response_model=AdminOrderResponse,
)
def update_admin_order_status(
    order_number: str,
    payload: AdminOrderStatusUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminOrderResponse:
    try:
        order = db.scalar(
            get_admin_order_query()
            .where(Order.order_number == order_number)
            .with_for_update(of=Order)
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found.")

        current_status = normalized_order_status(order.status)
        next_status = payload.status
        allowed_status = NEXT_ORDER_STATUS.get(current_status)
        if next_status == current_status:
            return make_admin_order_response(order)
        if next_status != "CANCELLED" and next_status != allowed_status:
            raise HTTPException(
                status_code=409,
                detail=f"Order status cannot move from {current_status} to {next_status}.",
            )
        if current_status in ("COMPLETED", "CANCELLED"):
            raise HTTPException(
                status_code=409,
                detail=f"{current_status} orders cannot be changed.",
            )

        if next_status == "ACCEPTED" and order.inventory_state == "RESERVED":
            for item in sorted(order.items, key=lambda line: line.variant_id or 0):
                if item.variant_id is None:
                    raise HTTPException(
                        status_code=409,
                        detail="This order has no inventory reservation and cannot be committed.",
                    )
                variant = db.scalar(
                    select(ProductVariant)
                    .where(ProductVariant.id == item.variant_id)
                    .with_for_update()
                )
                if (
                    variant is None
                    or variant.reserved_quantity < item.quantity
                    or variant.stock_quantity < item.quantity
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="Reserved stock is no longer available for this order.",
                    )
                variant.reserved_quantity -= item.quantity
                variant.stock_quantity -= item.quantity
                add_inventory_transaction(
                    db,
                    variant,
                    "SALE",
                    quantity_change=-item.quantity,
                    reserved_change=-item.quantity,
                    order_id=order.id,
                    note=f"Order {order.order_number} accepted",
                )
            order.inventory_state = "COMMITTED"

        if next_status == "CANCELLED":
            if order.inventory_state == "RESERVED":
                for item in sorted(order.items, key=lambda line: line.variant_id or 0):
                    if item.variant_id is None:
                        continue
                    variant = db.scalar(
                        select(ProductVariant)
                        .where(ProductVariant.id == item.variant_id)
                        .with_for_update()
                    )
                    if variant is None or variant.reserved_quantity < item.quantity:
                        raise HTTPException(
                            status_code=409,
                            detail="Unable to release the reserved inventory for this order.",
                        )
                    variant.reserved_quantity -= item.quantity
                    add_inventory_transaction(
                        db,
                        variant,
                        "RELEASE",
                        reserved_change=-item.quantity,
                        order_id=order.id,
                        note=f"Order {order.order_number} cancelled",
                    )
                order.inventory_state = "RELEASED"
            elif order.inventory_state == "COMMITTED":
                for item in sorted(order.items, key=lambda line: line.variant_id or 0):
                    if item.variant_id is None:
                        continue
                    variant = db.scalar(
                        select(ProductVariant)
                        .where(ProductVariant.id == item.variant_id)
                        .with_for_update()
                    )
                    if variant is None:
                        raise HTTPException(
                            status_code=409,
                            detail="Unable to restore the inventory for this order.",
                        )
                    variant.stock_quantity += item.quantity
                    add_inventory_transaction(
                        db,
                        variant,
                        "RETURN",
                        quantity_change=item.quantity,
                        order_id=order.id,
                        note=f"Order {order.order_number} cancelled",
                    )
                order.inventory_state = "RELEASED"

        order.status = next_status
        if next_status == "COMPLETED":
            order.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(order)
        return make_admin_order_response(order)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to update order status")
        raise HTTPException(
            status_code=500,
            detail="Unable to update the order status.",
        ) from error


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Navratri backend ready."}


@app.get("/db-test")
def database_test() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {"message": "Database connected successfully."}

    except Exception as error:
        return {
            "message": "Database connection failed.",
            "error": str(error),
        }


@app.get("/products", response_model=list[ProductResponse])
def get_products(db: Session = Depends(get_db)) -> list[ProductResponse]:
    try:
        products = db.scalars(
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.is_available.is_(True))
            .order_by(Product.id)
        ).all()
        return [make_product_response(product) for product in products]
    except SQLAlchemyError as error:
        logger.exception("Failed to fetch products")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch products.",
        ) from error


def make_order_response(order: Order) -> OrderResponse:
    return OrderResponse(
        order_number=order.order_number,
        customer_name=order.customer.name,
        pickup_date=order.pickup_date,
        pickup_time=order.pickup_time,
        status=order.status,
        special_instructions=order.special_instructions,
        subtotal=order.subtotal,
        discount=order.discount,
        total_amount=order.total_amount,
        payment_status=order.payment_status,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                product_id=item.product_id,
                variant_id=item.variant_id,
                product_name=item.product.name,
                product_image=item.product.image,
                variant=item.variant,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item in order.items
        ],
    )


@app.post("/orders", response_model=OrderResponse, status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)) -> OrderResponse:
    try:
        requested_quantities: dict[int, int] = {}
        requested_product_ids: dict[int, int] = {}
        for requested_item in payload.items:
            existing_product_id = requested_product_ids.setdefault(
                requested_item.variant_id,
                requested_item.product_id,
            )
            if existing_product_id != requested_item.product_id:
                raise HTTPException(
                    status_code=422,
                    detail="A variant cannot be associated with multiple products.",
                )
            requested_quantities[requested_item.variant_id] = (
                requested_quantities.get(requested_item.variant_id, 0)
                + requested_item.quantity
            )
        variants = {
            variant.id: variant
            for variant in db.scalars(
                select(ProductVariant)
                .options(selectinload(ProductVariant.product))
                .where(ProductVariant.id.in_(requested_quantities))
                .order_by(ProductVariant.id)
                .with_for_update()
            ).all()
        }

        missing_ids = requested_quantities.keys() - variants.keys()
        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail="One or more selected variants are no longer available.",
            )
        mismatched_variant = next(
            (
                variant
                for variant_id, variant in variants.items()
                if variant.product_id != requested_product_ids[variant_id]
            ),
            None,
        )
        if mismatched_variant:
            raise HTTPException(
                status_code=422,
                detail="The selected variant does not belong to the selected product.",
            )
        unavailable_variant = next(
            (
                variant
                for variant in variants.values()
                if not variant.product.is_available or not variant.is_available
            ),
            None,
        )
        if unavailable_variant:
            raise HTTPException(
                status_code=409,
                detail=f"{unavailable_variant.product.name} ({unavailable_variant.name}) is unavailable.",
            )
        insufficient_variant = next(
            (
                variants[variant_id]
                for variant_id, quantity in requested_quantities.items()
                if available_stock(variants[variant_id]) < quantity
            ),
            None,
        )
        if insufficient_variant:
            raise HTTPException(
                status_code=409,
                detail=f"Not enough stock for {insufficient_variant.product.name} ({insufficient_variant.name}).",
            )

        customer = db.scalar(
            select(Customer).where(Customer.phone == payload.customer_phone)
        )
        if customer is None:
            customer = Customer(
                name=payload.customer_name,
                phone=payload.customer_phone,
            )
            db.add(customer)
            db.flush()
        else:
            customer.name = payload.customer_name

        order = Order(
            order_number=f"P-{uuid4().hex[:16]}",
            customer_id=customer.id,
            status="NEW",
            inventory_state="RESERVED",
            pickup_date=payload.pickup_date,
            pickup_time=payload.pickup_time,
            special_instructions=payload.special_instructions,
            subtotal=Decimal("0.00"),
            discount=Decimal("0.00"),
            total_amount=Decimal("0.00"),
            payment_status="PAY_AT_SHOP",
        )
        db.add(order)
        db.flush()
        order.order_number = f"NB-{date.today():%Y%m%d}-{order.id:04d}"

        subtotal = Decimal("0.00")
        for variant_id, quantity in requested_quantities.items():
            variant = variants[variant_id]
            line_total = variant.selling_price * quantity
            subtotal += line_total
            variant.reserved_quantity += quantity
            order.items.append(
                OrderItem(
                    product_id=variant.product_id,
                    variant_id=variant.id,
                    variant=variant.name,
                    quantity=quantity,
                    unit_price=variant.selling_price,
                    unit_cost_snapshot=variant.cost_price,
                    line_total=line_total,
                )
            )
            add_inventory_transaction(
                db,
                variant,
                "RESERVE",
                reserved_change=quantity,
                order_id=order.id,
                note=f"Order {order.order_number} placed",
            )

        order.subtotal = subtotal
        order.discount = Decimal("0.00")
        order.total_amount = subtotal - order.discount
        db.commit()
        db.refresh(order)
        return make_order_response(order)
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.exception("Failed to create order")
        raise HTTPException(
            status_code=500,
            detail="Unable to create order. Please try again.",
        ) from error


@app.post("/orders/track", response_model=TrackedOrderResponse)
def track_order(
    payload: OrderTrackRequest,
    db: Session = Depends(get_db),
) -> TrackedOrderResponse:
    try:
        order = db.scalar(
            select(Order)
            .options(
                selectinload(Order.customer),
                selectinload(Order.items).selectinload(OrderItem.product),
            )
            .join(Order.customer)
            .where(
                Order.order_number == payload.order_number,
                Customer.phone == payload.customer_phone,
            )
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found.")

        return TrackedOrderResponse(
            order_number=order.order_number,
            customer_name=order.customer.name,
            pickup_date=order.pickup_date,
            pickup_time=order.pickup_time,
            status=normalized_order_status(order.status),
            payment_status=order.payment_status,
            created_at=order.created_at,
            items=[
                OrderItemResponse(
                    product_id=item.product_id,
                    variant_id=item.variant_id,
                    product_name=item.product.name,
                    product_image=item.product.image,
                    variant=item.variant,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_total=item.line_total,
                )
                for item in order.items
            ],
        )
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        logger.exception("Failed to fetch order")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch order.",
        ) from error


@app.get("/orders/{order_number}", response_model=OrderResponse)
def get_order(
    order_number: str,
    customer_phone: str = Header(alias="X-Customer-Phone", min_length=10, max_length=16),
    db: Session = Depends(get_db),
) -> OrderResponse:
    try:
        order = db.scalar(
            select(Order)
            .options(
                selectinload(Order.customer),
                selectinload(Order.items).selectinload(OrderItem.product),
            )
            .join(Order.customer)
            .where(
                Order.order_number == order_number,
                Customer.phone == customer_phone,
            )
        )
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        return make_order_response(order)
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        logger.exception("Failed to fetch customer order")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch order.",
        ) from error
