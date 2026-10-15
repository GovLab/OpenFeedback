"""Never lose a submission. Databases and OpenAI are mocked: no network, no keys."""
import asyncio
import importlib
import logging
import sys
import types
from unittest.mock import MagicMock

import pytest

from app.models import ClassifiedFeedback
from app.relevance import (
    NOT_RELEVANT_CATEGORY,
    SYSTEM_CATEGORIES,
    UNCLASSIFIED_CATEGORY,
    is_deprecated_category,
    is_deprecated_subcategory,
)


def _good(text="Park benches are broken"):
    return ClassifiedFeedback(
        text=text,
        category_map={"Amenities & Facilities": ["Seating"]},
        sentiment="Negative", priority="Medium", ai_summary="Broken benches",
        department_predicted="Parks", urgency_level="Medium", impact_type=[], language="en",
        config_version=3,
    )


@pytest.fixture
def pipeline(monkeypatch):
    """app.feedback_pipeline imported against stub classifier and database modules."""
    stubs = {
        "app.classifier": types.SimpleNamespace(classify_feedback=None, detect_spam_or_invalid=None),
        "app.database": types.SimpleNamespace(db=MagicMock()),
        "app.postgres_db": types.SimpleNamespace(postgres_db=MagicMock()),
    }
    for name, module in stubs.items():
        monkeypatch.setitem(sys.modules, name, module)
    sys.modules.pop("app.feedback_pipeline", None)
    module = importlib.import_module("app.feedback_pipeline")
    module.classifier_stub = stubs["app.classifier"]
    yield module
    sys.modules.pop("app.feedback_pipeline", None)


def _wire(pipeline, monkeypatch, classify, relevance=None):
    async def fake_classify(text):
        return classify(text)

    monkeypatch.setattr(pipeline, "classify_feedback", fake_classify)
    monkeypatch.setattr(pipeline, "detect_spam_or_invalid", relevance or (lambda t: {"is_invalid": False}))


def _boom(_text):
    raise RuntimeError("OpenAI down")


def test_classification_failure_still_stores_with_fallback(pipeline, monkeypatch):
    _wire(pipeline, monkeypatch, _boom)
    contact = {"opted_in": True, "name": "Sam", "email": "s@example.org", "phone": None}

    result = asyncio.run(pipeline.process_submission("The bridge is unsafe", contact))

    assert result.category_map == {UNCLASSIFIED_CATEGORY: ["Classification unavailable"]}
    assert result.ai_summary == "Classification unavailable" and result.urgency_level == "Low"
    row = pipeline.postgres_db.add_feedback.call_args.args[0]
    assert row["issue_description"] == "The bridge is unsafe"
    assert row["category"] == UNCLASSIFIED_CATEGORY and row["urgency_level"] == "Low"
    assert row["followup_opt_in"] is True and row["user_contact_info"]["email"] == "s@example.org"
    assert row["timestamp_processed"] is not None
    stored_in_graph = pipeline.db.add_feedback.call_args.args[0]
    assert stored_in_graph.text == "The bridge is unsafe"
    assert stored_in_graph.category_map == result.category_map


def test_not_relevant_is_still_tagged(pipeline, monkeypatch):
    _wire(pipeline, monkeypatch, _good, lambda t: {"is_invalid": True, "kind": "spam", "reason": "Ad"})

    result = asyncio.run(pipeline.process_submission("Buy watches", None))

    assert result.category_map == {NOT_RELEVANT_CATEGORY: ["Spam or Advertising"]}
    assert pipeline.postgres_db.add_feedback.call_args.args[0]["category"] == NOT_RELEVANT_CATEGORY
    pipeline.db.add_feedback.assert_called_once()


def test_failed_classification_can_still_be_tagged_not_relevant(pipeline, monkeypatch):
    _wire(pipeline, monkeypatch, _boom, lambda t: {"is_invalid": True, "kind": "abusive", "reason": "Rude"})
    result = asyncio.run(pipeline.classify_and_tag("rude text"))
    assert NOT_RELEVANT_CATEGORY in result.category_map


def test_upload_segment_failure_is_stored_not_dropped(pipeline, monkeypatch):
    def classify(text):
        if "second" in text:
            raise TimeoutError("timed out")
        return _good(text)

    _wire(pipeline, monkeypatch, classify)
    segments = ["first comment", "second comment", "third comment"]

    async def run():
        return await asyncio.gather(*(pipeline.classify_and_tag(t) for t in segments))

    results = asyncio.run(run())
    for text, classified in zip(segments, results):
        pipeline.store_feedback(text, classified)

    stored = [c.args[0]["issue_description"] for c in pipeline.postgres_db.add_feedback.call_args_list]
    assert stored == segments
    categories = [c.args[0]["category"] for c in pipeline.postgres_db.add_feedback.call_args_list]
    assert categories == ["Amenities & Facilities", UNCLASSIFIED_CATEGORY, "Amenities & Facilities"]


def test_one_store_failing_is_tolerated(pipeline):
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError("pg down")
    assert pipeline.store_feedback("text", _good("text"))
    pipeline.db.add_feedback.assert_called_once()


def test_both_stores_failing_logs_full_text_with_id_and_raises(pipeline, caplog):
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError("pg down")
    pipeline.db.add_feedback.side_effect = RuntimeError("neo4j down")
    text = "A long, important submission that must be recoverable."

    with caplog.at_level(logging.ERROR):
        with pytest.raises(pipeline.StorageError) as err:
            pipeline.store_feedback(text, _good(text))

    lost = [r for r in caplog.records if "UNSTORED SUBMISSION" in r.getMessage()]
    assert len(lost) == 1 and lost[0].levelno == logging.ERROR
    assert err.value.feedback_id in lost[0].getMessage() and text in lost[0].getMessage()


def test_system_categories_are_never_deprecated():
    active = {"Amenities & Facilities"}
    for name in SYSTEM_CATEGORIES:
        assert is_deprecated_category(name, active) is False
    assert is_deprecated_subcategory("Off-topic", {"Seating"}) is False
    assert is_deprecated_subcategory("Classification unavailable", {"Seating"}) is False
    # Ordinary categories missing from the active config are still flagged
    assert is_deprecated_category("Old Category", active) is True
    assert is_deprecated_subcategory("Old Sub", {"Seating"}) is True
    assert is_deprecated_category("Anything", set()) is False


@pytest.mark.parametrize("value, stored", [("High", "High"), ("medium", "Medium"), (" low ", "Low"), ("Critical", None), (None, None)])
def test_urgency_is_stored_only_as_a_valid_enum_value(pipeline, monkeypatch, value, stored):
    _wire(pipeline, monkeypatch, lambda t: _good(t).model_copy(update={"urgency_level": value}))
    asyncio.run(pipeline.process_submission("Lights are out on the trail", None))
    row = pipeline.postgres_db.add_feedback.call_args.args[0]
    assert row["urgency_level"] == stored


def test_unknown_urgency_is_logged_and_the_submission_still_stored(pipeline, monkeypatch, caplog):
    _wire(pipeline, monkeypatch, lambda t: _good(t).model_copy(update={"urgency_level": "Critical"}))
    with caplog.at_level(logging.WARNING):
        asyncio.run(pipeline.process_submission("Lights are out on the trail", None))
    pipeline.postgres_db.add_feedback.assert_called_once()
    pipeline.db.add_feedback.assert_called_once()
    assert any("Critical" in r.getMessage() for r in caplog.records if r.levelno == logging.WARNING)
