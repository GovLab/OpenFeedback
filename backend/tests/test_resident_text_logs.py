"""Resident text never reaches the server log. A sentinel is put in every place feedback can enter.

Captures every record at DEBUG, the most the classifier logger emits. OpenAI and both
databases are mocked: no network, no keys.
"""
import asyncio
import json
import logging
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app import classifier, file_processor, main
from app.config import topic
from app.auth import require_staff

SENTINEL = "RESIDENT-SENTINEL-7f3a9c"
KNOWN_CATEGORY = next(iter(topic.context_categories))
SEGMENT_ONE = f"The bench by the east gate is broken, {SENTINEL}."
SEGMENT_TWO = "Parking at the community centre is impossible on weekday evenings."
CLASSIFICATION = {
    "category_map": {"Amenities & Facilities": ["Seating"]},
    "sentiment": "Negative",
    "priority": "High",
    "permit_type": "Other",
    "ai_summary": f"Bench is broken, {SENTINEL}.",
    "department_predicted": "Parks & Recreation",
    "urgency_level": "High",
    "impact_type": ["Safety Concern"],
    "language": "en",
}


def _completion(content=None, tool_arguments=None):
    tool_calls = None
    if tool_arguments is not None:
        tool_calls = [SimpleNamespace(function=SimpleNamespace(arguments=tool_arguments))]
    message = SimpleNamespace(role="assistant", content=content, tool_calls=tool_calls)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class FakeClassifierOpenAI:
    """Answers the classifier's calls by their shape: tool call, classification, relevance, or chatbot."""

    def __init__(self, classification=CLASSIFICATION, chatbot_message=f"Where exactly? {SENTINEL}"):
        self.classification = classification
        self.chatbot_message = chatbot_message
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def create(self, **kwargs):
        if "tools" in kwargs:
            return _completion(tool_arguments=json.dumps({"category": KNOWN_CATEGORY}))
        if kwargs["model"] == "gpt-4o":
            return _completion(content=json.dumps(self.classification))
        if "spam detection" in kwargs["messages"][0]["content"]:
            return _completion(content=json.dumps({"is_invalid": False}))
        return _completion(content=json.dumps({"needs_followup": True, "message": self.chatbot_message, "quality_score": 3}))


class FakeSegmenterOpenAI:
    def __init__(self, segments):
        self.content = json.dumps(segments)
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=lambda **kwargs: _completion(content=self.content)))


@pytest.fixture
def mocked(monkeypatch):
    """OpenAI replaced everywhere, no active config, staff auth bypassed, databases are the conftest mocks."""
    monkeypatch.setattr(classifier, "client", FakeClassifierOpenAI())
    monkeypatch.setattr(file_processor, "client", FakeSegmenterOpenAI([SEGMENT_ONE, SEGMENT_TWO]))
    monkeypatch.setattr(classifier, "_get_active_config", lambda: (None, None))
    # Patch the module main actually stores through: other tests may have re-imported feedback_pipeline
    pipeline_globals = main.store_feedback.__globals__
    postgres, neo4j = MagicMock(name="postgres_db"), MagicMock(name="neo4j_db")
    monkeypatch.setitem(pipeline_globals, "postgres_db", postgres)
    monkeypatch.setitem(pipeline_globals, "db", neo4j)
    main.app.dependency_overrides[require_staff] = lambda: None
    try:
        yield SimpleNamespace(http=TestClient(main.app), postgres=postgres, neo4j=neo4j)
    finally:
        main.app.dependency_overrides.clear()


def _assert_captured_without_sentinel(caplog):
    assert caplog.records, "nothing was logged, so the check proves nothing"
    assert SENTINEL not in caplog.text


def test_classify_logs_no_resident_text(mocked, caplog):
    caplog.set_level(logging.DEBUG)
    asyncio.run(classifier.classify_feedback(f"Benches are broken {SENTINEL}"))
    asyncio.run(classifier.classify_feedback(f"Benches are broken {SENTINEL}"))
    _assert_captured_without_sentinel(caplog)


def test_validation_failure_logs_no_resident_text(mocked, caplog, monkeypatch):
    caplog.set_level(logging.DEBUG)
    broken = dict(CLASSIFICATION, category_map={"x": f"not a list {SENTINEL}"})
    monkeypatch.setattr(classifier, "client", FakeClassifierOpenAI(classification=broken))
    result = asyncio.run(classifier.classify_feedback(f"Benches are broken {SENTINEL}"))
    assert result.category_map == {"Unclassified": ["Classification unavailable"]}
    _assert_captured_without_sentinel(caplog)


def test_relevance_failure_logs_no_resident_text(mocked, caplog, monkeypatch):
    caplog.set_level(logging.DEBUG)
    monkeypatch.setattr(classifier, "client", SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(
        create=lambda **kwargs: _completion(content=f"spam detection says {SENTINEL} is {{broken"),
    ))))
    assert classifier.detect_spam_or_invalid(f"Buy {SENTINEL}") == {"is_invalid": False}
    _assert_captured_without_sentinel(caplog)


def test_upload_logs_no_resident_text(mocked, caplog):
    caplog.set_level(logging.DEBUG)
    response = mocked.http.post(
        "/api/upload-feedback",
        files={"file": (f"{SENTINEL}.txt", f"{SEGMENT_ONE}\n{SEGMENT_TWO}".encode(), "text/plain")},
    )
    assert response.status_code == 200
    _assert_captured_without_sentinel(caplog)


def test_classify_file_endpoint_logs_no_resident_text(mocked, caplog):
    caplog.set_level(logging.DEBUG)
    response = mocked.http.post(
        "/api/classify-feedback",
        files={"file": (f"{SENTINEL}.txt", SEGMENT_ONE.encode(), "text/plain")},
    )
    assert response.status_code == 200
    _assert_captured_without_sentinel(caplog)


def test_upload_with_failed_database_logs_no_resident_text(mocked, caplog):
    caplog.set_level(logging.DEBUG)
    # A database error can echo the row it failed on, so only its type may be logged
    mocked.postgres.add_feedback.side_effect = RuntimeError(f"insert failed, params: {SENTINEL}")
    mocked.neo4j.add_feedback.side_effect = RuntimeError(f"neo4j failed, params: {SENTINEL}")
    response = mocked.http.post(
        "/api/upload-feedback",
        files={"file": ("notes.txt", SEGMENT_ONE.encode(), "text/plain")},
    )
    assert response.status_code == 500
    _assert_captured_without_sentinel(caplog)


def test_submission_with_contact_details_logs_no_resident_text(mocked, caplog):
    caplog.set_level(logging.DEBUG)
    mocked.postgres.add_feedback.side_effect = RuntimeError(f"postgres params {SENTINEL}")
    response = mocked.http.post("/api/submit-feedback", json={
        "text": f"Benches are broken {SENTINEL}",
        "contact_info": {"opted_in": True, "name": SENTINEL, "email": f"{SENTINEL}@example.com", "phone": "555-0100"},
    })
    assert response.status_code == 200
    _assert_captured_without_sentinel(caplog)


def test_feedback_agent_logs_no_resident_text(mocked, caplog):
    caplog.set_level(logging.DEBUG)
    response = mocked.http.post("/api/feedback-agent", json={
        "original_feedback": f"Benches are broken {SENTINEL}",
        "category_map": {},
        "conversation_history": [],
    })
    assert response.status_code == 200
    _assert_captured_without_sentinel(caplog)
