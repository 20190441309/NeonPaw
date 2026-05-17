"""Memory API endpoints for server-side persistent memory."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, Field

from app.services.memory_service import VALID_CATEGORIES, get_memory_service

router = APIRouter(prefix="/api/memory", tags=["memory"])


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class MemoryCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    category: str = Field(default="custom")


class MemoryUpdateRequest(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=500)
    category: str | None = None
    pinned: bool | None = None


class MemoryItem(BaseModel):
    id: int
    content: str
    category: str
    pinned: bool
    created_at: str
    updated_at: str


class MemoryListResponse(BaseModel):
    memories: list[MemoryItem]
    total: int
    categories: list[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=MemoryListResponse)
async def list_memories(category: str | None = None):
    svc = get_memory_service()
    memories = svc.list_memories(category)
    return MemoryListResponse(
        memories=[
            MemoryItem(
                id=m["id"],
                content=m["content"],
                category=m["category"],
                pinned=bool(m["pinned"]),
                created_at=m["created_at"],
                updated_at=m["updated_at"],
            )
            for m in memories
        ],
        total=svc.count(),
        categories=sorted(VALID_CATEGORIES),
    )


@router.post("", response_model=MemoryItem, status_code=201)
async def create_memory(request: MemoryCreateRequest):
    svc = get_memory_service()
    result = svc.add_memory(request.content, request.category)
    if result is None:
        raise HTTPException(status_code=409, detail="Memory already exists or content is empty.")
    return MemoryItem(
        id=result["id"],
        content=result["content"],
        category=result["category"],
        pinned=bool(result["pinned"]),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
    )


@router.put("/{memory_id}", response_model=MemoryItem)
async def update_memory(memory_id: int, request: MemoryUpdateRequest):
    svc = get_memory_service()
    result = svc.update_memory(
        memory_id,
        content=request.content,
        category=request.category,
        pinned=request.pinned,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return MemoryItem(
        id=result["id"],
        content=result["content"],
        category=result["category"],
        pinned=bool(result["pinned"]),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
    )


@router.delete("/{memory_id}")
async def delete_memory(memory_id: int):
    svc = get_memory_service()
    deleted = svc.delete_memory(memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return {"deleted": True}


@router.delete("")
async def clear_all_memories():
    svc = get_memory_service()
    count = svc.clear_all()
    return {"deleted": count}


# ---------------------------------------------------------------------------
# Export / Import
# ---------------------------------------------------------------------------

class MemoryExportItem(BaseModel):
    content: str
    category: str
    pinned: bool


class MemoryImportRequest(BaseModel):
    memories: list[MemoryExportItem]


class MemoryImportResponse(BaseModel):
    imported: int
    skipped: int
    total: int


@router.get("/export")
async def export_memories():
    svc = get_memory_service()
    memories = svc.list_memories()
    return {
        "version": 1,
        "memories": [
            MemoryExportItem(
                content=m["content"],
                category=m["category"],
                pinned=bool(m["pinned"]),
            )
            for m in memories
        ],
    }


@router.post("/import", response_model=MemoryImportResponse)
async def import_memories(request: MemoryImportRequest):
    svc = get_memory_service()
    imported = 0
    skipped = 0
    for item in request.memories:
        content = item.content.strip()
        if not content:
            skipped += 1
            continue
        result = svc.add_memory(content, item.category or "custom")
        if result is None:
            skipped += 1
        else:
            imported += 1
            if item.pinned:
                svc.update_memory(result["id"], pinned=True)
    return MemoryImportResponse(
        imported=imported,
        skipped=skipped,
        total=len(request.memories),
    )
