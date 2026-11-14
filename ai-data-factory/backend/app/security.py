from functools import lru_cache
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient
from .config import get_settings
import hashlib

bearer = HTTPBearer(auto_error=False)

@lru_cache
def jwks_client():
    return PyJWKClient(get_settings().clerk_jwks_url, cache_keys=True)

def verify_clerk_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")
    settings = get_settings()
    try:
        signing_key = jwks_client().get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(credentials.credentials, signing_key.key, algorithms=["RS256"], issuer=settings.clerk_issuer, options={"verify_aud": False})
        if not claims.get("sub"):
            raise ValueError("Missing subject")
        return claims
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
