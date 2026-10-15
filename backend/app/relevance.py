"""Tag submissions that are spam, abusive or off-topic as "Not Relevant".

Government bodies are required to accept every submission, so nothing is
rejected: an irrelevant submission is stored like any other, filed under the
Not Relevant category so staff can set it aside in the analysis.
"""
from .models import ClassifiedFeedback

NOT_RELEVANT_CATEGORY = "Not Relevant"

# Filed here when classification is unavailable, so the submission is still stored
UNCLASSIFIED_CATEGORY = "Unclassified"
UNCLASSIFIED_SUBCATEGORY = "Classification unavailable"
UNCLASSIFIED_SUMMARY = "Classification unavailable"

# Categories the system creates itself. They are never in the staff-edited
# config, so they must never be treated as deprecated.
SYSTEM_CATEGORIES = frozenset({NOT_RELEVANT_CATEGORY, UNCLASSIFIED_CATEGORY})

# Subcategory per kind returned by the relevance check (prompts.build_spam_detection_prompt)
NOT_RELEVANT_KINDS = {
    "off_topic": "Off-topic",
    "spam": "Spam or Advertising",
    "abusive": "Abusive or Offensive",
    "unclear": "Unclear or Empty",
}
DEFAULT_KIND = "off_topic"

SYSTEM_SUBCATEGORIES = frozenset({*NOT_RELEVANT_KINDS.values(), UNCLASSIFIED_SUBCATEGORY})


def is_deprecated_category(name: str | None, active_categories: set[str]) -> bool:
    """A category is deprecated when an active config exists and does not list it.

    System categories are never deprecated.
    """
    if name in SYSTEM_CATEGORIES or not active_categories:
        return False
    return name not in active_categories


def is_deprecated_subcategory(name: str | None, active_subcategories: set[str]) -> bool:
    if name in SYSTEM_SUBCATEGORIES or not active_subcategories:
        return False
    return name not in active_subcategories


def not_relevant_subcategory(kind: str | None) -> str:
    return NOT_RELEVANT_KINDS.get((kind or "").strip().lower(), NOT_RELEVANT_KINDS[DEFAULT_KIND])


def mark_not_relevant(classified: ClassifiedFeedback, check: dict) -> ClassifiedFeedback:
    """Return a copy of the classification refiled under Not Relevant.

    The text, language, summary and config version are kept; routing fields
    are cleared so the submission is never sent to a department.
    """
    reason = (check.get("reason") or "").strip()
    summary = f"Marked not relevant: {reason}" if reason else classified.ai_summary
    return classified.model_copy(update={
        "category_map": {NOT_RELEVANT_CATEGORY: [not_relevant_subcategory(check.get("kind"))]},
        "department_predicted": "Unassigned",
        "urgency_level": "Low",
        "priority": "Low",
        "impact_type": [],
        "ai_summary": summary,
    })


def fallback_classification(text: str, config_version: int | None = None) -> ClassifiedFeedback:
    """Classification used when the AI step fails: the text is kept, nothing is guessed."""
    return ClassifiedFeedback(
        text=text,
        category_map={UNCLASSIFIED_CATEGORY: [UNCLASSIFIED_SUBCATEGORY]},
        sentiment="Neutral",
        priority="Low",
        permit_type=None,
        ai_summary=UNCLASSIFIED_SUMMARY,
        department_predicted="Unassigned",
        urgency_level="Low",
        impact_type=[],
        language=None,
        config_version=config_version,
    )
