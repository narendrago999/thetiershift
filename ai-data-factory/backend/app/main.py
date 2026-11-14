from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .api import router

settings = get_settings()
app = FastAPI(title="TierShift Data Factory API", version="0.1.0", docs_url="/docs" if settings.app_env != "production" else None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"], allow_headers=["Authorization","Content-Type"])
app.include_router(router)

@app.get("/health/live")
def live():
    return {"status": "alive"}

@app.get("/health/ready")
def ready():
    from sqlalchemy import text
    from .database import engine
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready"}
