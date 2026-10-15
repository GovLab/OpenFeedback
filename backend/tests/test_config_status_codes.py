"""Config routes answer 404/400 for bad input, not 500. No databases, keys or network."""
import asyncio
import os
from types import SimpleNamespace
from unittest.mock import MagicMock

os.environ.update({
    "OPENAI_API_KEY": "test-key",
    "AWS_NEO4J_URI": "bolt://127.0.0.1:1",
    "AWS_NEO4J_USERNAME": "test",
    "AWS_NEO4J_PASSWORD": "test",
    "POSTGRES_HOST": "127.0.0.1",
    "POSTGRES_PORT": "1",
    "POSTGRES_DB": "test",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "STAFF_PASSWORD": "test-staff-password",
    "SESSION_SECRET": "t" * 40,
})

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402


@pytest.fixture
def client(monkeypatch):
    """Staff auth bypassed; config manager and databases replaced with mocks."""
    manager = MagicMock()
    monkeypatch.setattr(main, "system_config_manager", manager)
    monkeypatch.setattr(main, "postgres_db", MagicMock())
    monkeypatch.setattr(main, "db", MagicMock())
    main.app.dependency_overrides[main.require_staff] = lambda: None
    try:
        yield SimpleNamespace(http=TestClient(main.app), manager=manager)
    finally:
        main.app.dependency_overrides.clear()


def test_active_config_missing_returns_404(client):
    client.manager.get_active_config.return_value = None
    response = client.http.get("/api/config")
    assert response.status_code == 404
    assert "No active configuration" in response.json()["detail"]


def test_config_version_not_found_returns_404(client):
    client.manager.get_config_by_version.return_value = None
    response = client.http.get("/api/config/99")
    assert response.status_code == 404
    assert response.json()["detail"] == "Configuration version 99 not found."


def test_activate_unknown_version_returns_404(client):
    client.manager.activate_version.return_value = False
    response = client.http.put("/api/config/activate/99")
    assert response.status_code == 404


def test_delete_unknown_version_returns_404(client):
    client.manager.delete_version.return_value = False
    response = client.http.delete("/api/config/99")
    assert response.status_code == 404


def test_delete_active_version_returns_400(client):
    client.manager.delete_version.side_effect = ValueError("Cannot delete the active version")
    response = client.http.delete("/api/config/1")
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete the active version"


def test_unexpected_config_failure_still_returns_500(client):
    client.manager.get_config_by_version.side_effect = RuntimeError("db down")
    response = client.http.get("/api/config/1")
    assert response.status_code == 500


def test_classify_upload_with_no_text_returns_400(client, monkeypatch):
    async def no_text(_file):
        return [], "txt"

    monkeypatch.setattr(main.FileProcessor, "extract_and_segment_text", no_text)
    response = client.http.post(
        "/api/classify-feedback",
        files={"file": ("empty.txt", b"   ", "text/plain")},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "No text content found in the uploaded file"
