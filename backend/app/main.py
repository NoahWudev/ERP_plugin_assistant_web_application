from __future__ import annotations

from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from ly_erp.client import LyErpClient, LyErpError
from ly_erp.config import LyErpConfig, load_env_file

load_env_file()

app = FastAPI(title="ERP Assistant Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def get_erp_client() -> LyErpClient:
    return LyErpClient(LyErpConfig.from_env())


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/erp/products/search")
def search_products(
    q: str = Query("", description="品號或品名關鍵字"),
    limit: int = Query(20, ge=1, le=50),
) -> dict[str, object]:
    keyword = q.strip()
    if not keyword:
        return {"items": [], "total": 0}

    try:
        items = get_erp_client().search_products(keyword, limit=limit)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except LyErpError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "items": [item.to_dict() for item in items],
        "total": len(items),
    }
