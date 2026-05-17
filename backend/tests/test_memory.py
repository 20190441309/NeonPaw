"""Tests for memory service and memory API."""

from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.memory_service import MemoryService, get_memory_service

# Reset singleton between tests
@pytest.fixture(autouse=True)
def _reset_singleton(tmp_path):
    """Reset memory service singleton with a fresh temp DB."""
    import app.services.memory_service as svc_mod
    db_path = str(tmp_path / "test_memories.db")
    svc_mod._memory_service = MemoryService(db_path=db_path)
    yield
    svc_mod._memory_service = None

client = TestClient(app)


# ---------------------------------------------------------------------------
# Memory Service Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def mem_service(tmp_path):
    """Create a MemoryService with a temp SQLite database."""
    db_path = str(tmp_path / "test_memories.db")
    return MemoryService(db_path=db_path)


class TestMemoryService:

    def test_add_memory(self, mem_service: MemoryService):
        result = mem_service.add_memory("我叫小野", "name")
        assert result is not None
        assert result["content"] == "我叫小野"
        assert result["category"] == "name"
        assert result["pinned"] == 0
        assert result["id"] > 0

    def test_add_empty_memory_returns_none(self, mem_service: MemoryService):
        assert mem_service.add_memory("") is None
        assert mem_service.add_memory("   ") is None

    def test_add_duplicate_returns_none(self, mem_service: MemoryService):
        mem_service.add_memory("我喜欢猫", "preference")
        result = mem_service.add_memory("我喜欢猫", "preference")
        assert result is None

    def test_add_case_insensitive_dedup(self, mem_service: MemoryService):
        mem_service.add_memory("Hello World", "custom")
        result = mem_service.add_memory("hello world", "custom")
        assert result is None

    def test_list_memories(self, mem_service: MemoryService):
        mem_service.add_memory("第一个", "custom")
        mem_service.add_memory("第二个", "custom")
        memories = mem_service.list_memories()
        assert len(memories) == 2

    def test_list_by_category(self, mem_service: MemoryService):
        mem_service.add_memory("名字", "name")
        mem_service.add_memory("偏好", "preference")
        mem_service.add_memory("目标", "goal")

        name_memories = mem_service.list_memories(category="name")
        assert len(name_memories) == 1
        assert name_memories[0]["content"] == "名字"

    def test_get_memory(self, mem_service: MemoryService):
        added = mem_service.add_memory("测试", "custom")
        result = mem_service.get_memory(added["id"])
        assert result is not None
        assert result["content"] == "测试"

    def test_get_nonexistent_returns_none(self, mem_service: MemoryService):
        assert mem_service.get_memory(99999) is None

    def test_update_memory_content(self, mem_service: MemoryService):
        added = mem_service.add_memory("旧内容", "custom")
        result = mem_service.update_memory(added["id"], content="新内容")
        assert result is not None
        assert result["content"] == "新内容"

    def test_update_memory_category(self, mem_service: MemoryService):
        added = mem_service.add_memory("测试", "custom")
        result = mem_service.update_memory(added["id"], category="preference")
        assert result is not None
        assert result["category"] == "preference"

    def test_update_memory_pinned(self, mem_service: MemoryService):
        added = mem_service.add_memory("重要", "custom")
        result = mem_service.update_memory(added["id"], pinned=True)
        assert result is not None
        assert result["pinned"] == 1

    def test_update_nonexistent_returns_none(self, mem_service: MemoryService):
        assert mem_service.update_memory(99999, content="x") is None

    def test_delete_memory(self, mem_service: MemoryService):
        added = mem_service.add_memory("删除我", "custom")
        assert mem_service.delete_memory(added["id"]) is True
        assert mem_service.get_memory(added["id"]) is None

    def test_delete_nonexistent_returns_false(self, mem_service: MemoryService):
        assert mem_service.delete_memory(99999) is False

    def test_clear_all(self, mem_service: MemoryService):
        mem_service.add_memory("a", "custom")
        mem_service.add_memory("b", "custom")
        count = mem_service.clear_all()
        assert count == 2
        assert mem_service.count() == 0

    def test_count(self, mem_service: MemoryService):
        mem_service.add_memory("a", "name")
        mem_service.add_memory("b", "preference")
        assert mem_service.count() == 2
        assert mem_service.count(category="name") == 1

    def test_invalid_category_defaults_to_custom(self, mem_service: MemoryService):
        result = mem_service.add_memory("test", "invalid_category")
        assert result is not None
        assert result["category"] == "custom"

    def test_pinned_memories_sorted_first(self, mem_service: MemoryService):
        mem_service.add_memory("普通", "custom")
        mem_service.add_memory("重要", "custom")
        # Pin the first one
        memories = mem_service.list_memories()
        first_id = memories[1]["id"]  # "普通" was added first
        mem_service.update_memory(first_id, pinned=True)

        result = mem_service.list_memories()
        assert result[0]["content"] == "普通"
        assert result[0]["pinned"] == 1


# ---------------------------------------------------------------------------
# Memory API Tests (export / import)
# ---------------------------------------------------------------------------

class TestMemoryApi:

    def test_export_empty(self):
        response = client.get("/api/memory/export")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == 1
        assert data["memories"] == []

    def test_export_with_memories(self):
        svc = get_memory_service()
        svc.add_memory("我叫小野", "name")
        svc.add_memory("我喜欢猫", "preference")

        response = client.get("/api/memory/export")
        assert response.status_code == 200
        data = response.json()
        assert len(data["memories"]) == 2
        contents = {m["content"] for m in data["memories"]}
        assert "我叫小野" in contents
        assert "我喜欢猫" in contents

    def test_import_new_memories(self):
        payload = {
            "memories": [
                {"content": "导入记忆A", "category": "name", "pinned": False},
                {"content": "导入记忆B", "category": "goal", "pinned": True},
            ]
        }
        response = client.post("/api/memory/import", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] == 2
        assert data["skipped"] == 0
        assert data["total"] == 2

        # Verify they're stored
        svc = get_memory_service()
        assert svc.count() == 2

    def test_import_dedup_existing(self):
        svc = get_memory_service()
        svc.add_memory("已有记忆", "custom")

        payload = {
            "memories": [
                {"content": "已有记忆", "category": "custom", "pinned": False},
                {"content": "新记忆", "category": "custom", "pinned": False},
            ]
        }
        response = client.post("/api/memory/import", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] == 1
        assert data["skipped"] == 1

    def test_import_empty_content_skipped(self):
        payload = {
            "memories": [
                {"content": "  ", "category": "custom", "pinned": False},
                {"content": "有效记忆", "category": "custom", "pinned": False},
            ]
        }
        response = client.post("/api/memory/import", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] == 1
        assert data["skipped"] == 1

    def test_import_empty_list(self):
        payload = {"memories": []}
        response = client.post("/api/memory/import", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["imported"] == 0
        assert data["skipped"] == 0

    def test_import_pinned_flag(self):
        payload = {
            "memories": [
                {"content": "固定记忆", "category": "habit", "pinned": True},
            ]
        }
        response = client.post("/api/memory/import", json=payload)
        assert response.status_code == 200

        svc = get_memory_service()
        memories = svc.list_memories()
        assert len(memories) == 1
        assert memories[0]["pinned"] == 1

    def test_roundtrip_export_import(self):
        # Add memories
        svc = get_memory_service()
        svc.add_memory("记忆一", "name")
        svc.add_memory("记忆二", "preference")

        # Export
        export_resp = client.get("/api/memory/export")
        export_data = export_resp.json()

        # Clear
        svc.clear_all()
        assert svc.count() == 0

        # Import
        import_resp = client.post("/api/memory/import", json=export_data)
        assert import_resp.status_code == 200
        assert import_resp.json()["imported"] == 2

        # Verify
        assert svc.count() == 2
