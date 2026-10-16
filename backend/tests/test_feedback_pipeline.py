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
    monkeypatch.setattr(module, "STORE_RETRY_DELAYS_SECONDS", (0, 0))  # no real waiting in retries
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


def test_both_stores_failing_logs_id_and_length_but_not_text_and_raises(pipeline, caplog):
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError("pg down")
    pipeline.db.add_feedback.side_effect = RuntimeError("neo4j down")
    text = "A long, important submission that must be recoverable."

    with caplog.at_level(logging.ERROR):
        with pytest.raises(pipeline.StorageError) as err:
            pipeline.store_feedback(text, _good(text))

    lost = [r for r in caplog.records if "UNSTORED SUBMISSION" in r.getMessage()]
    assert len(lost) == 1 and lost[0].levelno == logging.ERROR
    assert err.value.feedback_id in lost[0].getMessage()
    assert f"chars={len(text)}" in lost[0].getMessage()
    assert text not in caplog.text


def test_postgres_write_is_retried_and_succeeds_on_second_attempt(pipeline):
    pipeline.postgres_db.add_feedback.side_effect = [RuntimeError("blip"), "row-id"]
    feedback_id = pipeline.store_feedback("Park benches are broken", _good())
    assert pipeline.postgres_db.add_feedback.call_count == 2
    pipeline.db.add_feedback.assert_called_once()
    assert feedback_id


def test_postgres_write_gives_up_after_three_attempts_and_the_other_store_keeps_it(pipeline):
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError("down")
    feedback_id = pipeline.store_feedback("Park benches are broken", _good())
    assert pipeline.postgres_db.add_feedback.call_count == 3
    pipeline.db.add_feedback.assert_called_once()
    assert feedback_id


def test_neo4j_write_is_retried_and_succeeds_on_second_attempt(pipeline):
    pipeline.db.add_feedback.side_effect = [RuntimeError("blip"), None]
    pipeline.store_feedback("Park benches are broken", _good())
    assert pipeline.db.add_feedback.call_count == 2


def test_both_stores_failing_retries_each_three_times_then_raises(pipeline):
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError("pg down")
    pipeline.db.add_feedback.side_effect = RuntimeError("neo4j down")
    with pytest.raises(pipeline.StorageError):
        pipeline.store_feedback("Park benches are broken", _good())
    assert pipeline.postgres_db.add_feedback.call_count == 3
    assert pipeline.db.add_feedback.call_count == 3


def test_retries_wait_half_a_second_then_a_second(pipeline, monkeypatch):
    waits = []
    monkeypatch.setattr(pipeline, "STORE_RETRY_DELAYS_SECONDS", (0.5, 1.0))
    monkeypatch.setattr(pipeline, "time", types.SimpleNamespace(sleep=waits.append))
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError("down")
    pipeline.store_feedback("Park benches are broken", _good())
    assert waits == [0.5, 1.0]


def test_retry_logs_carry_id_and_attempt_but_no_text(pipeline, caplog):
    sentinel = "RETRY-SENTINEL-41c2"
    pipeline.postgres_db.add_feedback.side_effect = RuntimeError(f"insert params {sentinel}")
    pipeline.db.add_feedback.side_effect = RuntimeError(f"neo4j params {sentinel}")
    with caplog.at_level(logging.DEBUG):
        with pytest.raises(pipeline.StorageError):
            pipeline.store_feedback(f"Benches are broken {sentinel}", _good())
    assert "attempt 3 of 3" in caplog.text
    assert sentinel not in caplog.text


def test_neo4j_feedback_node_write_is_idempotent():
    """A retried write must not create a second Feedback node for the same id."""
    from app.database import Neo4jDatabase
    database = Neo4jDatabase.__new__(Neo4jDatabase)
    database.driver = MagicMock()
    database.add_feedback(_good(), feedback_id="same-id")
    session = database.driver.session.return_value.__enter__.return_value
    first_query = session.run.call_args_list[0][0][0]
    assert "MERGE (f:Feedback {id: $id})" in first_query
    assert "CREATE (f:Feedback" not in first_query


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
    warnings = [r.getMessage() for r in caplog.records if r.levelno == logging.WARNING]
    assert any("not in the database enum" in message for message in warnings)
    assert not any("Critical" in message for message in warnings)
