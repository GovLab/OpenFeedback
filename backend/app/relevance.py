"""Tag submissions that are spam, abusive or off-topic as "Not Relevant".

Government bodies are required to accept every submission, so nothing is
rejected: an irrelevant submission is stored like any other, filed under the
Not Relevant category so staff can set it aside in the analysis.
"""
from .models import ClassifiedFeedback

NOT_RELEVANT_CATEGORY = "Not Relevant"

# Subcategory per kind returned by the relevance check (prompts.build_spam_detection_prompt)
NOT_RELEVANT_KINDS = {
    "off_topic": "Off-topic",
    "spam": "Spam or Advertising",
    "abusive": "Abusive or Offensive",
    "unclear": "Unclear or Empty",
}
DEFAULT_KIND = "off_topic"


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
