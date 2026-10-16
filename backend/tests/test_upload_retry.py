"""A staff upload that cannot save some segments says which ones, and those can be saved again.

Only the failing segments are retried, so segments already saved are never stored twice.
OpenAI and both databases are mocked: no network, no keys.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app import classifier, file_processor, main
from app.auth import require_staff
from test_resident_text_logs import FakeClassifierOpenAI, FakeSegmenterOpenAI, SEGMENT_ONE, SEGMENT_TWO

FAILING = "FAIL-THIS-SEGMENT"
FAILING_SEGMENT = f"{SEGMENT_ONE} {FAILING}"


@pytest.fixture
def env(monkeypatch):
    segments = [SEGMENT_TWO, FAILING_SEGMENT]
    monkeypatch.setattr(classifier, "client", FakeClassifierOpenAI())
    monkeypatch.setattr(file_processor, "client", FakeSegmenterOpenAI(segments))
    monkeypatch.setattr(classifier, "_get_active_config", lambda: (None, None))
    pipeline_globals = main.store_feedback.__globals__
    postgres, neo4j = MagicMock(name="postgres_db"), MagicMock(name="neo4j_db")

    def postgres_write(row, **kwargs):
        if FAILING in row["issue_description"]:
            raise RuntimeError("postgres down")
        return "row-id"

    def neo4j_write(classified, feedback_id=None):
        if FAILING in classified.text:
            raise RuntimeError("neo4j down")

    postgres.add_feedback.side_effect = postgres_write
    neo4j.add_feedback.side_effect = neo4j_write
    monkeypatch.setitem(pipeline_globals, "postgres_db", postgres)
    monkeypatch.setitem(pipeline_globals, "db", neo4j)
    monkeypatch.setitem(pipeline_globals, "STORE_RETRY_DELAYS_SECONDS", (0, 0))
    main.app.dependency_overrides[require_staff] = lambda: None
    try:
        yield SimpleNamespace(http=TestClient(main.app), postgres=postgres, neo4j=neo4j)
    finally:
        main.app.dependency_overrides.clear()


def test_upload_reports_the_segments_it_could_not_save(env):
    response = env.http.post("/api/upload-feedback", files={"file": ("notes.txt", b"x", "text/plain")})
    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["saved_count"] == 1 and detail["total_count"] == 2
    assert detail["message"] == "1 of 2 segments could not be saved. Please try again."
    assert detail["unsaved_segments"] == [{"position": 2, "text_content": FAILING_SEGMENT}]


def test_retry_saves_only_the_segments_sent(env):
    response = env.http.post("/api/upload-feedback/retry", json={"segments": [SEGMENT_TWO]})
    assert response.status_code == 200
    assert [item["text_content"] for item in response.json()["individual_responses"]] == [SEGMENT_TWO]
    assert env.postgres.add_feedback.call_count == 1


def test_retry_that_still_fails_returns_the_unsaved_segment_again(env):
    response = env.http.post("/api/upload-feedback/retry", json={"segments": [SEGMENT_TWO, FAILING_SEGMENT]})
    assert response.status_code == 500
    assert response.json()["detail"]["unsaved_segments"] == [{"position": 2, "text_content": FAILING_SEGMENT}]


def test_retry_with_no_segments_is_rejected(env):
    response = env.http.post("/api/upload-feedback/retry", json={"segments": []})
    assert response.status_code == 422
