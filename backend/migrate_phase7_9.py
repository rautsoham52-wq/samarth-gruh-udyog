from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

if __package__:
    from .database import engine
    from .models import Base
else:
    from database import engine
    from models import Base


def migrate() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        inspector = inspect(engine)
        order_columns = {column["name"] for column in inspector.get_columns("orders")}
        variant_columns = {
            column["name"]
            for column in inspector.get_columns("product_variants")
        }
        item_columns = {
            column["name"] for column in inspector.get_columns("order_items")
        }

        with engine.begin() as connection:
            if "is_active" not in variant_columns:
                connection.execute(
                    text(
                        "ALTER TABLE product_variants ADD COLUMN is_active "
                        "BOOLEAN NOT NULL DEFAULT TRUE"
                    )
                )
            if "inventory_state" not in order_columns:
                connection.execute(
                    text(
                        "ALTER TABLE orders ADD COLUMN inventory_state "
                        "VARCHAR(20) NOT NULL DEFAULT 'NONE'"
                    )
                )
            if "completed_at" not in order_columns:
                connection.execute(
                    text("ALTER TABLE orders ADD COLUMN completed_at TIMESTAMPTZ")
                )
            if "variant_id" not in item_columns:
                connection.execute(
                    text(
                        "ALTER TABLE order_items ADD COLUMN variant_id INTEGER "
                        "REFERENCES product_variants(id)"
                    )
                )
            if "unit_cost_snapshot" not in item_columns:
                connection.execute(
                    text(
                        "ALTER TABLE order_items ADD COLUMN unit_cost_snapshot "
                        "NUMERIC(10, 2)"
                    )
                )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_order_items_variant_id "
                    "ON order_items (variant_id)"
                )
            )
        print("Additive schema migration completed without dropping existing data.")
    except SQLAlchemyError as error:
        raise RuntimeError(
            "Could not apply the non-destructive Phase 7-9 schema migration."
        ) from error


if __name__ == "__main__":
    migrate()
