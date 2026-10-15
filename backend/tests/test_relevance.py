"""Irrelevant submissions are tagged, never rejected. Needs no database or API key."""
from app.models import ClassifiedFeedback
from app.relevance import NOT_RELEVANT_CATEGORY, mark_not_relevant, not_relevant_subcategory


def _classified():
    return ClassifiedFeedback(
        text="Buy cheap watches at example.com",
        category_map={"Amenities & Facilities": ["Restrooms & Water Fountains"]},
        sentiment="Neutral", priority="Medium", permit_type="Other",
        ai_summary="An advert for watches.", department_predicted="Parks & Recreation",
        urgency_level="Medium", impact_type=["Reduced Park Use"], language="en", config_version=2,
    )


def test_irrelevant_feedback_is_refiled_not_dropped():
    tagged = mark_not_relevant(_classified(), {"is_invalid": True, "kind": "spam", "reason": "Advertising"})
    assert tagged.category_map == {NOT_RELEVANT_CATEGORY: ["Spam or Advertising"]}
    assert tagged.text == "Buy cheap watches at example.com"
    assert tagged.department_predicted == "Unassigned"
    assert tagged.urgency_level == "Low" and tagged.impact_type == []
    assert tagged.ai_summary == "Marked not relevant: Advertising"
    assert tagged.language == "en" and tagged.config_version == 2


def test_original_classification_is_not_mutated():
    original = _classified()
    mark_not_relevant(original, {"is_invalid": True, "kind": "abusive"})
    assert original.category_map == {"Amenities & Facilities": ["Restrooms & Water Fountains"]}


def test_unknown_or_missing_kind_defaults_to_off_topic():
    assert not_relevant_subcategory(None) == "Off-topic"
    assert not_relevant_subcategory("something else") == "Off-topic"
    assert not_relevant_subcategory(" Abusive ") == "Abusive or Offensive"


def test_summary_is_kept_when_no_reason_is_given():
    tagged = mark_not_relevant(_classified(), {"is_invalid": True, "kind": "unclear"})
    assert tagged.ai_summary == "An advert for watches."
