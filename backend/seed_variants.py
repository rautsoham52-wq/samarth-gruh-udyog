from decimal import Decimal
import json

from sqlalchemy import func, inspect, select, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload, sessionmaker

if __package__:
    from .database import SessionLocal, engine
    from .models import InventoryTransaction, OrderItem, Product, ProductVariant
else:
    from database import SessionLocal, engine
    from models import InventoryTransaction, OrderItem, Product, ProductVariant


FINAL_CATALOG = {
    "chiwda": {
        "name": "Chiwda",
        "aliases": (),
        "variants": {
            "500g": ("200.00", "75.00"),
            "1kg": ("400.00", "150.00"),
        },
    },
    "chakli": {
        "name": "Chakli",
        "aliases": (),
        "variants": {
            "500g": ("200.00", "75.00"),
            "1kg": ("400.00", "150.00"),
        },
    },
    "barik-sev": {
        "name": "Barik Sev",
        "aliases": ("sev",),
        "variants": {
            "500g": ("175.00", "75.00"),
            "1kg": ("350.00", "150.00"),
        },
    },
    "masala-sev": {
        "name": "Masala Sev",
        "aliases": (),
        "variants": {
            "500g": ("200.00", "100.00"),
            "1kg": ("400.00", "200.00"),
        },
    },
    "khare-shankarpay": {
        "name": "Khare Shankarpay",
        "aliases": (),
        "variants": {
            "500g": ("175.00", "75.00"),
            "1kg": ("350.00", "150.00"),
        },
    },
    "god-shankarpay": {
        "name": "God Shankarpay",
        "aliases": (),
        "variants": {
            "500g": ("175.00", "75.00"),
            "1kg": ("350.00", "150.00"),
        },
    },
    "besan-ladoo": {
        "name": "Besan Ladoo",
        "aliases": (),
        "variants": {
            "500g": ("350.00", "200.00"),
            "1kg": ("700.00", "400.00"),
        },
    },
    "anarse": {
        "name": "Anarse",
        "aliases": (),
        "variants": {
            "500g": ("350.00", "175.00"),
            "1kg": ("700.00", "350.00"),
        },
    },
    "balushahi": {
        "name": "Balushahi",
        "aliases": (),
        "variants": {
            "500g": ("200.00", "100.00"),
            "1kg": ("400.00", "200.00"),
        },
    },
    "rava-ladoo": {
        "name": "Rava Ladoo",
        "aliases": (),
        "variants": {
            "500g": ("300.00", "200.00"),
            "1kg": ("600.00", "400.00"),
        },
    },
    "khobra-barfi": {
        "name": "Khobra Barfi",
        "aliases": (),
        "variants": {
            "500g": ("300.00", "100.00"),
            "1kg": ("600.00", "200.00"),
        },
    },
    "boondi-ladoo": {
        "name": "Boondi Ladoo",
        "aliases": (),
        "variants": {
            "500g": ("200.00", "100.00"),
            "1kg": ("400.00", "200.00"),
        },
    },
}

TARGET_VARIANT_NAMES = {"500g", "1kg"}
TARGET_STOCK = 100
TARGET_LOW_STOCK_THRESHOLD = 20


def ensure_active_variant_column(bind: Engine) -> None:
    inspector = inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("product_variants")}
    if "is_active" not in columns:
        with bind.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE product_variants "
                    "ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )


def _normalized(value: str) -> str:
    return " ".join(value.strip().casefold().replace("-", " ").split())


def _resolve_products(session: Session) -> dict[str, Product]:
    products = session.scalars(select(Product).order_by(Product.id).with_for_update()).all()
    resolved: dict[str, Product] = {}
    retired_duplicates: set[int] = set()
    resolved_ids: set[int] = set()

    for slug, definition in FINAL_CATALOG.items():
        target_name = str(definition["name"])
        aliases = {str(alias) for alias in definition["aliases"]}
        accepted_names = {_normalized(target_name), *(_normalized(alias) for alias in aliases)}
        candidates = [
            product
            for product in products
            if product.slug.casefold() == slug
            or _normalized(product.name) in accepted_names
            or (slug == "barik-sev" and product.slug.casefold() == "sev")
        ]
        candidates = list({product.id: product for product in candidates}.values())
        if candidates:
            candidates.sort(
                key=lambda product: (
                    product.slug.casefold() != slug,
                    product.id,
                )
            )
            product = candidates[0]
            retired_duplicates.update(candidate.id for candidate in candidates[1:])
        else:
            product = Product(
                name=target_name,
                slug=slug,
                is_available=True,
            )
            session.add(product)
            session.flush()
            products.append(product)

        slug_owner = next(
            (
                existing
                for existing in products
                if existing.slug == slug and existing.id != product.id
            ),
            None,
        )
        if slug_owner is not None:
            raise RuntimeError(
                f"Cannot safely assign catalog slug {slug!r}; product ID "
                f"{slug_owner.id} already owns it."
            )
        if product.id in resolved_ids:
            raise RuntimeError(f"Product ID {product.id} matched multiple final catalog entries.")
        resolved[slug] = product
        resolved_ids.add(product.id)

    target_ids = {product.id for product in resolved.values()}
    for product in products:
        if product.id not in target_ids or product.id in retired_duplicates:
            product.is_available = False
            for variant in product.variants:
                variant.is_active = False
                variant.is_available = False

    for slug, product in resolved.items():
        product.name = str(FINAL_CATALOG[slug]["name"])
        product.slug = slug
        product.is_available = True
    return resolved


def _variant_name(name: str) -> str | None:
    normalized = name.strip().casefold()
    return normalized if normalized in TARGET_VARIANT_NAMES else None


def _set_variant(
    session: Session,
    product: Product,
    name: str,
    selling_price: str,
    cost_price: str,
) -> None:
    matches = [
        variant
        for variant in product.variants
        if _variant_name(variant.name) == name
    ]
    if len(matches) > 1:
        raise RuntimeError(
            f"Product ID {product.id} has duplicate {name} variants; "
            "resolve the duplicate rows before applying the final catalog."
        )
    if matches:
        variant = matches[0]
    else:
        quantity, unit = (Decimal("500"), "g") if name == "500g" else (Decimal("1"), "kg")
        variant = ProductVariant(
            product_id=product.id,
            name=name,
            quantity_value=quantity,
            unit=unit,
            selling_price=Decimal(selling_price),
            cost_price=Decimal(cost_price),
            stock_quantity=0,
            reserved_quantity=0,
            low_stock_threshold=TARGET_LOW_STOCK_THRESHOLD,
            is_active=True,
            is_available=True,
        )
        session.add(variant)
        session.flush()
        product.variants.append(variant)

    if variant.reserved_quantity > TARGET_STOCK:
        raise RuntimeError(
            f"Variant ID {variant.id} has {variant.reserved_quantity} reserved units; "
            f"the requested stock of {TARGET_STOCK} cannot safely cover those reservations."
        )
    stock_difference = TARGET_STOCK - variant.stock_quantity
    variant.name = name
    variant.quantity_value = Decimal("500") if name == "500g" else Decimal("1")
    variant.unit = "g" if name == "500g" else "kg"
    variant.selling_price = Decimal(selling_price)
    variant.cost_price = Decimal(cost_price)
    variant.stock_quantity = TARGET_STOCK
    variant.low_stock_threshold = TARGET_LOW_STOCK_THRESHOLD
    variant.is_active = True
    variant.is_available = True
    if stock_difference:
        session.add(
            InventoryTransaction(
                variant=variant,
                transaction_type="ADJUSTMENT",
                quantity_change=stock_difference,
                note="Final business catalog stock set to 100",
            )
        )


def apply_final_catalog(bind: Engine, session_factory: sessionmaker[Session]) -> dict[str, int]:
    ensure_active_variant_column(bind)
    try:
        with session_factory() as session, session.begin():
            product_rows = _resolve_products(session)
            for slug, product in product_rows.items():
                desired = FINAL_CATALOG[slug]["variants"]
                for variant in product.variants:
                    variant.is_active = False
                    variant.is_available = False
                for name, prices in desired.items():
                    selling_price, cost_price = prices
                    _set_variant(
                        session,
                        product,
                        name,
                        str(selling_price),
                        str(cost_price),
                    )
            session.flush()
            return {
                "active_products": sum(1 for product in product_rows.values() if product.is_available),
                "active_variants": session.scalar(
                    select(func.count(ProductVariant.id))
                    .join(Product)
                    .where(
                        Product.is_available.is_(True),
                        ProductVariant.is_active.is_(True),
                    )
                )
            }
    except (SQLAlchemyError, RuntimeError):
        raise


def seed_final_catalog() -> dict[str, int]:
    try:
        result = apply_final_catalog(engine, SessionLocal)
    except (SQLAlchemyError, RuntimeError) as error:
        raise RuntimeError(
            "Final catalog update failed and its product/variant changes were rolled back."
        ) from error
    return result


def inspect_existing_catalog(
    bind: Engine,
    session_factory: sessionmaker[Session],
) -> list[dict[str, object]]:
    ensure_active_variant_column(bind)
    with session_factory() as session:
        products = session.scalars(
            select(Product)
            .options(selectinload(Product.variants))
            .order_by(Product.id)
        ).all()
        reference_counts = dict(
            session.execute(
                select(OrderItem.variant_id, func.count(OrderItem.id))
                .where(OrderItem.variant_id.is_not(None))
                .group_by(OrderItem.variant_id)
            ).all()
        )
        return [
            {
                "product_id": product.id,
                "name": product.name,
                "slug": product.slug,
                "active": product.is_available,
                "variants": [
                    {
                        "variant_id": variant.id,
                        "name": variant.name,
                        "active": variant.is_active,
                        "available": variant.is_available,
                        "order_item_references": reference_counts.get(variant.id, 0),
                    }
                    for variant in product.variants
                ],
            }
            for product in products
        ]


if __name__ == "__main__":
    print("Existing catalog mapping (before catalog changes):")
    print(json.dumps(inspect_existing_catalog(engine, SessionLocal), indent=2))
    print("Final catalog reconciliation:")
    print(seed_final_catalog())
