import getpass
import os
import re
import sys

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

if __package__:
    from .database import SessionLocal, engine
    from .models import AdminUser
    from .security import hash_password
else:
    from database import SessionLocal, engine
    from models import AdminUser
    from security import hash_password


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def main() -> int:
    jwt_secret = os.getenv("JWT_SECRET_KEY", "")
    if len(jwt_secret.encode("utf-8")) < 32:
        print("Set JWT_SECRET_KEY in backend/.env before creating an admin.")
        return 1

    email = input("Admin email: ").strip().lower()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        print("Enter a valid email address.")
        return 1

    try:
        AdminUser.__table__.create(bind=engine, checkfirst=True)
        with SessionLocal.begin() as session:
            existing_admin = session.scalar(
                select(AdminUser).where(AdminUser.email == email)
            )
            if existing_admin is not None:
                print("An admin account with that email already exists; no changes made.")
                return 0

            name = input("Admin name: ").strip()
            if not name or len(name) > 120:
                print("Admin name must contain 1 to 120 characters.")
                return 1

            password = getpass.getpass("Admin password (minimum 12 characters): ")
            confirmation = getpass.getpass("Confirm admin password: ")
            if len(password) < 12 or len(password) > 128:
                print("Password must contain 12 to 128 characters.")
                return 1
            if password != confirmation:
                print("Passwords did not match.")
                return 1

            session.add(
                AdminUser(
                    name=name,
                    email=email,
                    password_hash=hash_password(password),
                    role="admin",
                    is_active=True,
                )
            )
        print("Admin account created successfully.")
        return 0
    except SQLAlchemyError:
        print("Unable to create the admin account due to a database error.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
