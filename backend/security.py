import os
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from fastapi import HTTPException, status
from pwdlib import PasswordHash


ACCESS_TOKEN_EXPIRE_MINUTES = 30
ADMIN_AUTH_COOKIE = "admin_access_token"
password_hash = PasswordHash.recommended()
_dummy_password_hash = password_hash.hash("unusable-admin-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, stored_hash: str | None) -> bool:
    if stored_hash is None:
        password_hash.verify(password, _dummy_password_hash)
        return False
    return password_hash.verify(password, stored_hash)


def create_access_token(admin_id: int) -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret or len(secret.encode("utf-8")) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin authentication is not configured.",
        )

    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(admin_id),
            "role": "admin",
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        },
        secret,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> int:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret or len(secret.encode("utf-8")) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin authentication is not configured.",
        )

    try:
        claims = jwt.decode(token, secret, algorithms=["HS256"])
        if claims.get("type") != "access" or claims.get("role") != "admin":
            raise ValueError("Invalid access token claims.")
        return int(claims["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error


def auth_cookie_secure() -> bool:
    return auth_cookie_samesite() == "none" or os.getenv(
        "AUTH_COOKIE_SECURE", "false"
    ).lower() == "true"


def auth_cookie_samesite() -> Literal["strict", "lax", "none"]:
    value = os.getenv("AUTH_COOKIE_SAMESITE", "strict").lower()
    if value == "strict":
        return "strict"
    if value == "lax":
        return "lax"
    if value == "none":
        return "none"
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Admin cookie settings are invalid.",
    )
