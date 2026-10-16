"""Model replies are validated before use, for every AI call. The OpenAI client is mocked: no network, no keys."""
import asyncio
import json
import logging
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app import classifier, file_processor
from app.ai_schemas import describe_validation_error, strip_code_fence
from app.config import topic
from app.file_processor import FileProcessor
from app.relevance import UNCLASSIFIED_CATEGORY

KNOWN_CONTEXT_CATEGORY = next(iter(topic.context_categories))
SEGMENTS = [
    "The playground swing set near the east gate has a broken chain.",
    "Parking at the community center is impossible on weekday evenings.",
]
VALID_CLASSIFICATION = {
    "category_map": {"Amenities & Facilities": ["Seating"]},
    "sentiment": "Negative",
    "priority": "High",
    "permit_type": "Other",
    "ai_summary": "Park benches are broken.",
    "department_predicted": "Parks & Recreation",
    "urgency_level": "High",
    "impact_type": ["Safety Concern"],
    "language": "en",
}


def _completion(content=None, tool_arguments=None):
    """A chat completion with either message content or one tool call."""
    tool_calls = None
    if tool_arguments is not None:
        tool_calls = [SimpleNamespace(function=SimpleNamespace(arguments=tool_arguments))]
    message = SimpleNamespace(role="assistant", content=content, tool_calls=tool_calls)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def _mock_client(monkeypatch, module, completion):
    completions = SimpleNamespace(create=lambda **kwargs: completion)
    monkeypatch.setattr(module, "client", SimpleNamespace(chat=SimpleNamespace(completions=completions)))


def _no_active_config(monkeypatch):
    monkeypatch.setattr(classifier, "_get_active_config", lambda: (None, None))


def _classify(monkeypatch, content):
    _no_active_config(monkeypatch)
    _mock_client(monkeypatch, classifier, _completion(content=content))
    return asyncio.run(classifier.classify_feedback("Park benches are broken."))


# Classification

def test_valid_classification_is_kept_as_returned(monkeypatch):
    result = _classify(monkeypatch, json.dumps(VALID_CLASSIFICATION))
    assert result.category_map == {"Amenities & Facilities": ["Seating"]}
    assert (result.sentiment, result.priority, result.urgency_level) == ("Negative", "High", "High")
    assert result.ai_summary == "Park benches are broken." and result.department_predicted == "Parks & Recreation"
    assert result.text == "Park benches are broken." and result.config_version is None


def test_missing_fields_take_the_defaults_the_code_always_used(monkeypatch):
    reply = {k: v for k, v in VALID_CLASSIFICATION.items() if k not in ("sentiment", "urgency_level")}
    result = _classify(monkeypatch, json.dumps(reply))
    assert result.sentiment == "Neutral" and result.urgency_level == "Medium"
    assert result.category_map == {"Amenities & Facilities": ["Seating"]}


def test_wrong_enum_values_are_normalised(monkeypatch):
    reply = dict(VALID_CLASSIFICATION, sentiment="Happy", priority="high", urgency_level="Critical")
    result = _classify(monkeypatch, json.dumps(reply))
    assert result.sentiment == "Neutral"   # unknown sentiment: same 0.0 score as before
    assert result.priority == "High"       # case-insensitive match
    assert result.urgency_level is None    # unknown urgency: the pipeline stores it as empty


def test_fenced_json_is_parsed(monkeypatch):
    fenced = "```json\n" + json.dumps(VALID_CLASSIFICATION) + "\n```"
    assert _classify(monkeypatch, fenced).category_map == {"Amenities & Facilities": ["Seating"]}


def test_garbage_reply_falls_back_to_unclassified(monkeypatch):
    result = _classify(monkeypatch, "Sorry, I cannot help with that {broken")
    assert result.category_map == {UNCLASSIFIED_CATEGORY: ["Classification unavailable"]}
    assert result.ai_summary == "Classification unavailable"


def test_wrong_type_falls_back_to_unclassified(monkeypatch):
    result = _classify(monkeypatch, json.dumps(dict(VALID_CLASSIFICATION, category_map="Seating")))
    assert result.category_map == {UNCLASSIFIED_CATEGORY: ["Classification unavailable"]}


def test_overlong_summary_is_shortened_not_rejected(monkeypatch):
    reply = dict(VALID_CLASSIFICATION, ai_summary="Benches are broken. " * 100)
    result = _classify(monkeypatch, json.dumps(reply))
    assert result.category_map == {"Amenities & Facilities": ["Seating"]}
    assert len(result.ai_summary) <= 500 and result.ai_summary.endswith("...")


def test_validation_log_does_not_contain_resident_text(monkeypatch, caplog):
    secret = "MY-PRIVATE-COMPLAINT-TEXT"
    caplog.set_level(logging.WARNING)
    _classify(monkeypatch, json.dumps(dict(VALID_CLASSIFICATION, category_map={"x": secret})))
    assert "failed validation" in caplog.text
    assert secret not in caplog.text


# Staff-configured labels

CUSTOM_CONFIG = {
    "sentiment_options": ["Mixed", "Calm"],
    "priority_levels": ["Critical", "Routine"],
    "urgency_levels": ["Critical", "Minor"],
}


def _with_active_config(monkeypatch, config, version=7):
    monkeypatch.setattr(classifier, "_get_active_config", lambda: (config, version))
    _mock_client(monkeypatch, classifier, _completion(content=json.dumps(VALID_CLASSIFICATION)))


def _classify_reply(monkeypatch, **fields):
    _mock_client(monkeypatch, classifier, _completion(content=json.dumps(dict(VALID_CLASSIFICATION, **fields))))
    return asyncio.run(classifier.classify_feedback("Park benches are broken."))


def test_configured_labels_survive_validation(monkeypatch):
    _with_active_config(monkeypatch, CUSTOM_CONFIG)
    result = _classify_reply(monkeypatch, sentiment="Mixed", priority="Critical", urgency_level="Critical")
    assert (result.sentiment, result.priority, result.urgency_level) == ("Mixed", "Critical", "Critical")
    assert result.config_version == 7


def test_configured_label_spelling_is_taken_from_config(monkeypatch):
    _with_active_config(monkeypatch, CUSTOM_CONFIG)
    result = _classify_reply(monkeypatch, sentiment="  mixed ", priority="ROUTINE", urgency_level="minor")
    assert (result.sentiment, result.priority, result.urgency_level) == ("Mixed", "Routine", "Minor")


def test_default_labels_are_not_accepted_when_config_replaces_them(monkeypatch):
    _with_active_config(monkeypatch, CUSTOM_CONFIG)
    result = _classify_reply(monkeypatch, sentiment="Negative", priority="High", urgency_level="High")
    assert result.sentiment == "Mixed"     # first configured option
    assert result.priority == "Critical"   # first configured option
    assert result.urgency_level is None    # not configured, so no label


def test_missing_sentiment_uses_first_option_when_default_is_not_configured(monkeypatch):
    _with_active_config(monkeypatch, CUSTOM_CONFIG)
    reply = {k: v for k, v in VALID_CLASSIFICATION.items() if k != "sentiment"}
    _mock_client(monkeypatch, classifier, _completion(content=json.dumps(reply)))
    assert asyncio.run(classifier.classify_feedback("Park benches are broken.")).sentiment == "Mixed"


def test_empty_config_lists_fall_back_to_defaults(monkeypatch):
    _with_active_config(monkeypatch, {"sentiment_options": [], "priority_levels": [], "urgency_levels": []})
    result = _classify_reply(monkeypatch, sentiment="Positive", priority="Low", urgency_level="High")
    assert (result.sentiment, result.priority, result.urgency_level) == ("Positive", "Low", "High")


def test_configured_urgency_is_stored_as_empty_when_not_in_database_enum(monkeypatch):
    from app import feedback_pipeline
    _with_active_config(monkeypatch, CUSTOM_CONFIG)
    result = _classify_reply(monkeypatch, urgency_level="Critical")
    assert result.urgency_level == "Critical"                       # kept in the result
    assert feedback_pipeline._database_urgency(result.urgency_level) is None  # Postgres enum is Low/Medium/High
    assert feedback_pipeline._database_urgency("high") == "High"


# Topic context tool call

def test_valid_tool_call_loads_that_context(monkeypatch):
    loaded = []
    monkeypatch.setattr(classifier, "load_context", lambda category: loaded.append(category) or "NOTES")
    _mock_client(monkeypatch, classifier, _completion(tool_arguments=json.dumps({"category": KNOWN_CONTEXT_CATEGORY})))
    assert classifier.determine_topic_context("Benches are broken.") == "NOTES"
    assert loaded == [KNOWN_CONTEXT_CATEGORY]


def test_unknown_category_gives_empty_context(monkeypatch):
    loaded = []
    monkeypatch.setattr(classifier, "load_context", lambda category: loaded.append(category) or "NOTES")
    _mock_client(monkeypatch, classifier, _completion(tool_arguments=json.dumps({"category": "Not a category"})))
    assert classifier.determine_topic_context("Benches are broken.") == ""
    assert loaded == []


def test_garbage_tool_arguments_give_empty_context(monkeypatch):
    _mock_client(monkeypatch, classifier, _completion(tool_arguments="not json"))
    assert classifier.determine_topic_context("Benches are broken.") == ""


def test_missing_category_key_gives_empty_context(monkeypatch):
    _mock_client(monkeypatch, classifier, _completion(tool_arguments=json.dumps({"topic": "x"})))
    assert classifier.determine_topic_context("Benches are broken.") == ""


# Spam and relevance check

def test_valid_relevance_reply_is_returned(monkeypatch):
    reply = json.dumps({"is_invalid": True, "kind": "spam", "reason": "Advertising"})
    _mock_client(monkeypatch, classifier, _completion(content=reply))
    assert classifier.detect_spam_or_invalid("Buy watches") == {
        "is_invalid": True, "kind": "spam", "reason": "Advertising",
    }


def test_unknown_kind_is_dropped_but_the_verdict_kept(monkeypatch):
    reply = json.dumps({"is_invalid": True, "kind": "weird", "reason": "Unclear"})
    _mock_client(monkeypatch, classifier, _completion(content=reply))
    result = classifier.detect_spam_or_invalid("Something")
    assert result["is_invalid"] is True and result["kind"] is None


def test_missing_verdict_counts_as_relevant(monkeypatch):
    _mock_client(monkeypatch, classifier, _completion(content=json.dumps({"reason": "none"})))
    assert classifier.detect_spam_or_invalid("Benches are broken.")["is_invalid"] is False


def test_garbage_relevance_reply_fails_open(monkeypatch):
    _mock_client(monkeypatch, classifier, _completion(content="definitely not json"))
    assert classifier.detect_spam_or_invalid("Benches are broken.") == {"is_invalid": False}


# Chatbot agent

def _chatbot(monkeypatch, content):
    _no_active_config(monkeypatch)
    _mock_client(monkeypatch, classifier, _completion(content=content))
    return classifier.chatbot_agent("Benches are broken.", [])


def test_valid_chatbot_reply_asks_a_followup(monkeypatch):
    result = _chatbot(monkeypatch, json.dumps({"needs_followup": True, "message": "Which bench?", "quality_score": 4}))
    assert result["needs_followup"] is True and result["message"] == "Which bench?" and result["quality_score"] == 4


def test_good_score_ends_the_conversation(monkeypatch):
    result = _chatbot(monkeypatch, json.dumps({"needs_followup": False, "message": "x", "quality_score": 9}))
    assert result["needs_followup"] is False and result["message"] == "Thank you for your feedback!"


def test_missing_score_defaults_to_five(monkeypatch):
    result = _chatbot(monkeypatch, json.dumps({"message": "Where?"}))
    assert result["quality_score"] == 5 and result["needs_followup"] is True


def test_out_of_range_score_is_clamped(monkeypatch):
    assert _chatbot(monkeypatch, json.dumps({"quality_score": 42}))["quality_score"] == 10


def test_garbage_chatbot_reply_raises_for_the_endpoint(monkeypatch):
    with pytest.raises(ValidationError):
        _chatbot(monkeypatch, "Sure, here you go")


# File segmentation

def _segment(monkeypatch, content):
    _mock_client(monkeypatch, file_processor, _completion(content=content))
    return asyncio.run(FileProcessor.segment_text_into_feedbacks("whole uploaded document"))


def test_valid_segments_are_returned(monkeypatch):
    assert _segment(monkeypatch, json.dumps(SEGMENTS)) == SEGMENTS


def test_fenced_segments_are_returned(monkeypatch):
    assert _segment(monkeypatch, "```json\n" + json.dumps(SEGMENTS) + "\n```") == SEGMENTS


def test_missing_list_keeps_whole_text(monkeypatch):
    assert _segment(monkeypatch, json.dumps({"segments": SEGMENTS})) == ["whole uploaded document"]


def test_non_string_item_keeps_whole_text(monkeypatch):
    assert _segment(monkeypatch, json.dumps([SEGMENTS[0], 12345])) == ["whole uploaded document"]


def test_garbage_segmentation_keeps_whole_text(monkeypatch):
    assert _segment(monkeypatch, "Here are your feedback items: ...") == ["whole uploaded document"]


# Helpers

def test_strip_code_fence_removes_language_tagged_fence():
    assert strip_code_fence('```json\n["a"]\n```') == '["a"]'


def test_describe_validation_error_names_fields_not_values():
    from app.ai_schemas import ClassificationReply
    with pytest.raises(ValidationError) as caught:
        ClassificationReply.model_validate({"category_map": {"x": "SECRET-VALUE"}})
    description = describe_validation_error(caught.value)
    assert "category_map" in description and "SECRET-VALUE" not in description
