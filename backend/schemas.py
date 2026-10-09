from datetime import date, datetime, time
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


ExpenseCategory = Literal[
    "Raw Materials",
    "Packaging",
    "Transportation",
    "Electricity",
    "Advertisement",
    "Shop",
    "Other",
]


class ProductVariantPublic(BaseModel):
    id: int
    name: str
    quantity_value: Decimal
    unit: str
    selling_price: Decimal
    is_available: bool
    available_quantity: int


class ProductVariantAdminResponse(ProductVariantPublic):
    product_id: int
    product_name: str
    cost_price: Decimal
    stock_quantity: int
    reserved_quantity: int
    low_stock_threshold: int
    is_active: bool


class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    image: str | None
    is_available: bool
    created_at: datetime
    variants: list[ProductVariantPublic]


NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class OrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    variant_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    customer_name: NonEmptyText = Field(max_length=120)
    customer_phone: str = Field(pattern=r"^\+?[0-9]{10,15}$", max_length=16)
    pickup_date: date
    pickup_time: time
    special_instructions: str | None = Field(default=None, max_length=2000)
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    product_id: int
    variant_id: int | None
    product_name: str
    product_image: str | None
    variant: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    order_number: str
    customer_name: str
    pickup_date: date
    pickup_time: time
    status: str
    special_instructions: str | None
    subtotal: Decimal
    discount: Decimal
    total_amount: Decimal
    payment_status: str
    created_at: datetime
    items: list[OrderItemResponse]


class AdminLoginRequest(BaseModel):
    email: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            to_lower=True,
            min_length=6,
            max_length=254,
            pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        ),
    ]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class ProductVariantUpdate(BaseModel):
    selling_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    cost_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    stock_quantity: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    is_available: bool | None = None


class ProductVariantCreate(BaseModel):
    name: NonEmptyText = Field(max_length=60)
    quantity_value: Decimal = Field(gt=0, max_digits=10, decimal_places=3)
    unit: NonEmptyText = Field(max_length=20)
    selling_price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=10, decimal_places=2)
    stock_quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=5, ge=0)
    is_available: bool = False


class OrderTrackRequest(BaseModel):
    order_number: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=32)]
    customer_phone: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            min_length=10,
            max_length=16,
            pattern=r"^\+?[0-9]{10,15}$",
        ),
    ]


class TrackedOrderResponse(BaseModel):
    order_number: str
    customer_name: str
    pickup_date: date
    pickup_time: time
    status: str
    payment_status: str
    created_at: datetime
    items: list[OrderItemResponse]


class ExpenseCreate(BaseModel):
    title: NonEmptyText = Field(max_length=120)
    category: ExpenseCategory
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    expense_date: date
    notes: str | None = Field(default=None, max_length=2000)


class ExpenseUpdate(BaseModel):
    title: NonEmptyText | None = Field(default=None, max_length=120)
    category: ExpenseCategory | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    expense_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class ExpenseResponse(BaseModel):
    id: int
    title: str
    category: str
    amount: Decimal
    expense_date: date
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductSalesRow(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    revenue: Decimal


class SalesReportResponse(BaseModel):
    start_date: date
    end_date: date
    total_orders: int
    total_revenue: Decimal
    product_cost: Decimal | None
    gross_profit: Decimal | None
    total_expenses: Decimal
    net_profit: Decimal | None
    average_order_value: Decimal
    cost_data_complete: bool
    uncosted_order_items: int
    product_sales: list[ProductSalesRow]


class SalesPeriodRow(BaseModel):
    period_start: date
    completed_orders: int
    revenue: Decimal
    product_cost: Decimal | None
    gross_profit: Decimal | None
    expenses: Decimal
    net_profit: Decimal | None
    cost_data_complete: bool


class AdminResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str


class AdminDashboardResponse(BaseModel):
    today_orders: int
    today_sales: Decimal
    new_orders: int
    accepted_orders: int
    preparing_orders: int
    ready_for_pickup_orders: int
    completed_orders: int
    today_product_cost: Decimal | None
    today_gross_profit: Decimal | None
    today_expenses: Decimal
    today_net_profit: Decimal | None
    today_cost_data_complete: bool


class AdminOrderItemResponse(BaseModel):
    product_id: int
    variant_id: int | None
    product_name: str
    product_image: str | None
    variant: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class AdminOrderResponse(BaseModel):
    order_number: str
    customer_name: str
    customer_phone: str
    pickup_date: date
    pickup_time: time
    special_instructions: str | None
    status: str
    payment_status: str
    subtotal: Decimal
    discount: Decimal
    total_amount: Decimal
    created_at: datetime
    items: list[AdminOrderItemResponse]


class AdminOrderStatusUpdate(BaseModel):
    status: Literal[
        "NEW",
        "ACCEPTED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "COMPLETED",
        "CANCELLED",
    ]
