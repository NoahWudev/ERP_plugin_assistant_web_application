from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, auth, erp, migrate, presets, quotations
from ly_erp.config import load_env_file

load_env_file()

app = FastAPI(title="ERP Assistant Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(quotations.router)
app.include_router(presets.router)
app.include_router(admin.router)
app.include_router(migrate.router)
app.include_router(erp.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
