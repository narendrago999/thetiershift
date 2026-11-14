import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from .config import get_settings
from .models import User

def clerk_user(clerk_user_id: str) -> dict:
    settings = get_settings()
    response = httpx.get(f"https://api.clerk.com/v1/users/{clerk_user_id}", headers={"Authorization": f"Bearer {settings.clerk_secret_key}"}, timeout=12.0)
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Unable to verify your Clerk account")
    return response.json()

def sync_clerk_user(db: Session, clerk_user_id: str) -> User:
    payload = clerk_user(clerk_user_id)
    addresses = payload.get("email_addresses", [])
    primary_id = payload.get("primary_email_address_id")
    primary = next((x for x in addresses if x.get("id") == primary_id), None) or (addresses[0] if addresses else None)
    if not primary or not primary.get("email_address"):
        raise HTTPException(status_code=403, detail="A verified email address is required")
    verified = primary.get("verification", {}).get("status") == "verified"
    email = primary["email_address"].strip().lower()
    name = " ".join(x for x in [payload.get("first_name"), payload.get("last_name")] if x)
    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).one_or_none()
    if user is None:
        user = User(id=str(uuid4()), clerk_user_id=clerk_user_id, email=email, email_verified=verified, full_name=name, image_url=payload.get("image_url"))
        db.add(user)
    else:
        user.email, user.email_verified, user.full_name, user.image_url = email, verified, name, payload.get("image_url")
    db.commit()
    db.refresh(user)
    return user
