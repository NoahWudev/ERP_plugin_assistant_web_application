from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import CurrentUser, require_permission
from ly_erp.client import LyErpClient, LyErpError
from ly_erp.config import LyErpConfig

router = APIRouter(prefix="/api/erp", tags=["erp"])


@lru_cache(maxsize=1)
def get_erp_client() -> LyErpClient:
    return LyErpClient(LyErpConfig.from_env())


@router.get("/products/search")
def search_products(
    q: str = Query("", description="品號或品名關鍵字"),
    limit: int = Query(20, ge=1, le=50),
    _: CurrentUser = Depends(require_permission("erp:search")),
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
