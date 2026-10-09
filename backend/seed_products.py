from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

if __package__:
    from .database import SessionLocal
    from .models import Product
else:
    from database import SessionLocal
    from models import Product


PRODUCTS = [
    {
        "name": "Chiwda",
        "description": "Crispy and delicious festive chiwda prepared specially for your celebrations.",
        "ingredients": "Poha, peanuts, spices, salt and oil.",
        "image": "🍘",
        "is_available": True,
    },
    {
        "name": "Chakli",
        "description": "Crunchy homemade chakli perfect for festive snacking.",
        "ingredients": "Rice flour, gram flour, spices, salt and oil.",
        "image": "🥨",
        "is_available": True,
    },
    {
        "name": "Sev",
        "description": "Fresh and crispy traditional sev with a delicious festive taste.",
        "ingredients": "Gram flour, spices, salt and oil.",
        "image": "🍜",
        "is_available": True,
    },
    {
        "name": "Khare Shankarpay",
        "description": "Crispy and savoury traditional shankarpay.",
        "ingredients": "Flour, spices, salt and oil.",
        "image": "🍪",
        "is_available": True,
    },
    {
        "name": "God Shankarpay",
        "description": "Sweet and crispy homemade shankarpay.",
        "ingredients": "Flour, sugar, ghee and cardamom.",
        "image": "🍪",
        "is_available": True,
    },
    {
        "name": "Besan Ladoo",
        "description": "Traditional soft and delicious besan ladoo.",
        "ingredients": "Gram flour, sugar, ghee and cardamom.",
        "image": "🟡",
        "is_available": True,
    },
    {
        "name": "Anarse",
        "description": "Authentic festive anarse prepared with traditional flavours.",
        "ingredients": "Rice, jaggery, sesame seeds and ghee.",
        "image": "🍘",
        "is_available": True,
    },
    {
        "name": "Balushahi",
        "description": "Soft and flaky traditional balushahi.",
        "ingredients": "Flour, sugar, ghee and curd.",
        "image": "🍩",
        "is_available": True,
    },
    {
        "name": "Rava Ladoo",
        "description": "Sweet and delicious homemade rava ladoo.",
        "ingredients": "Semolina, sugar, ghee, coconut and cardamom.",
        "image": "🟠",
        "is_available": True,
    },
    {
        "name": "Khobra Barfi",
        "description": "Rich coconut barfi made specially for festive celebrations.",
        "ingredients": "Coconut, sugar, milk and cardamom.",
        "image": "🍰",
        "is_available": True,
    },
]


def create_slug(name: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", name.lower())).strip("-")


def seed_products() -> int:
    inserted_count = 0

    with SessionLocal() as session:
        try:
            existing_slugs = set(
                session.scalars(
                    select(Product.slug).where(
                        Product.slug.in_(
                            [create_slug(product["name"]) for product in PRODUCTS]
                        )
                    )
                )
            )

            for product_data in PRODUCTS:
                slug = create_slug(product_data["name"])
                if slug in existing_slugs:
                    continue

                session.add(Product(slug=slug, **product_data))
                inserted_count += 1

            session.commit()
        except SQLAlchemyError as error:
            session.rollback()
            raise RuntimeError(
                "Could not seed products. Check the database connection and products table."
            ) from error

    return inserted_count


if __name__ == "__main__":
    try:
        count = seed_products()
    except RuntimeError as error:
        print(f"Product seeding failed: {error}")
        raise SystemExit(1) from None

    print(f"Product seeding complete. Inserted {count} new products.")
