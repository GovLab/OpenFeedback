"""Staff dashboard data routes report a failure (503), never an empty success. No network."""
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

FRIENDLY = main.DASHBOARD_UNAVAILABLE


@pytest.fixture
def stores(monkeypatch):
    """Staff auth bypassed; both databases replaced with mocks."""
    pg, neo = MagicMock(), MagicMock()
    monkeypatch.setattr(main, "postgres_db", pg)
    monkeypatch.setattr(main, "db", neo)
    monkeypatch.setattr(main, "system_config_manager", MagicMock())
    main.app.dependency_overrides[main.require_staff] = lambda: None
    try:
        yield SimpleNamespace(http=TestClient(main.app), pg=pg, neo=neo)
    finally:
        main.app.dependency_overrides.clear()


def test_graph_failure_is_503_not_empty_graph(stores):
    stores.neo.get_graph_data.side_effect = RuntimeError("neo4j down")
    response = stores.http.get("/api/graph")
    assert response.status_code == 503
    assert response.json() == {"detail": FRIENDLY}


def test_stats_failure_is_503_not_zero_feedback(stores):
    stores.neo.get_feedback_count.side_effect = RuntimeError("neo4j down")
    response = stores.http.get("/api/stats")
    assert response.status_code == 503
    assert response.json()["detail"] == FRIENDLY


def test_feedback_table_failure_is_503_not_empty_list(stores):
    stores.pg.get_all_feedback.side_effect = RuntimeError("postgres down")
    response = stores.http.get("/api/postgres/feedback")
    assert response.status_code == 503
    assert response.json()["detail"] == FRIENDLY


def test_verify_ids_with_one_store_down_is_503_not_ok(stores):
    stores.pg.get_all_feedback.return_value = []
    stores.neo.driver.session.side_effect = RuntimeError("neo4j down")
    response = stores.http.get("/api/verify-ids")
    assert response.status_code == 503


def test_verify_ids_with_both_stores_down_is_503_not_ok(stores):
    stores.pg.get_all_feedback.side_effect = RuntimeError("postgres down")
    stores.neo.driver.session.side_effect = RuntimeError("neo4j down")
    response = stores.http.get("/api/verify-ids")
    assert response.status_code == 503


def test_stats_still_returns_counts_when_healthy(stores):
    stores.neo.get_feedback_count.return_value = 7
    stores.neo.get_categories_summary.return_value = [{"category": "Parks", "count": 7}]
    response = stores.http.get("/api/stats")
    assert response.status_code == 200
    assert response.json() == {"total_feedback": 7, "categories": [{"category": "Parks", "count": 7}]}
