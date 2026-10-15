"""One path for every submission: classify, tag, store.

Used by the resident endpoint and the staff file upload so they cannot drift.
A submission is never dropped because an AI step failed: classification
falls back to "Unclassified" and the original text is still stored.
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

from .classifier import classify_feedback, detect_spam_or_invalid
from .database import db
from .models import ClassifiedFeedback
from .postgres_db import postgres_db
from .relevance import fallback_classification, mark_not_relevant

logger = logging.getLogger(__name__)

SENTIMENT_SCORES = {
    "positive": 0.7,
    "negative": -0.7,
    "neutral": 0.0,
    "very positive": 1.0,
    "very negative": -1.0,
}
FEEDBACK_SOURCE = "OpenPermit"  # value of the Postgres feedback_source enum


class StorageError(Exception):
    """Raised when a submission could not be written to either database."""

    def __init__(self, feedback_id: str):
        super().__init__(f"Failed to store feedback {feedback_id} in both databases")
        self.feedback_id = feedback_id


def sentiment_to_score(sentiment: Optional[str]) -> float:
    """Convert sentiment string to numeric score."""
    return SENTIMENT_SCORES.get(sentiment.lower() if sentiment else "", 0.0)


async def classify_and_tag(text: str) -> ClassifiedFeedback:
    """Classify text and tag it Not Relevant when the relevance check says so.

    Any classification failure yields the fallback classification instead of
    an error. The relevance check already fails open (not invalid).
    """
    try:
        classified = await classify_feedback(text)
    except Exception as e:
        logger.error(f"Classification failed, storing as Unclassified: {type(e).__name__}: {e}")
        classified = fallback_classification(text)

    relevance = await asyncio.to_thread(detect_spam_or_invalid, text)
    if relevance.get("is_invalid", False):
        classified = mark_not_relevant(classified, relevance)
        logger.info(f"Tagged as not relevant: {classified.category_map}")
    return classified


def _contact_fields(contact_info: Optional[dict]) -> tuple[bool, Optional[dict]]:
    if not contact_info or not contact_info.get("opted_in", False):
        return False, None
    details = {
        "name": contact_info.get("name") or "",
        "email": contact_info.get("email"),
        "phone": contact_info.get("phone"),
    }
    return True, details


def _postgres_row(text: str, classified: ClassifiedFeedback, contact_info: Optional[dict]) -> dict:
    opted_in, contact_details = _contact_fields(contact_info)
    first_subcategories = next(iter(classified.category_map.values()), [])
    return {
        "issue_description": text,
        "permit_type": classified.permit_type,
        "category": next(iter(classified.category_map), None),
        "subcategory": first_subcategories[0] if first_subcategories else None,
        "ai_summary": classified.ai_summary,
        "department_predicted": classified.department_predicted,
        "sentiment_score": sentiment_to_score(classified.sentiment) if classified.sentiment else None,
        "urgency_level": classified.urgency_level,
        "impact_type": classified.impact_type,
        "language": classified.language,
        "status": "New",
        "feedback_source": FEEDBACK_SOURCE,
        "timestamp_processed": datetime.now(),
        "followup_opt_in": opted_in,
        "user_contact_info": contact_details,
    }


def store_feedback(text: str, classified: ClassifiedFeedback, contact_info: Optional[dict] = None) -> str:
    """Write to Postgres and Neo4j. Returns the shared id.

    One store failing is tolerated. If both fail, the full text is logged at
    ERROR with the id so it can be recovered, and StorageError is raised.
    """
    feedback_id = str(uuid.uuid4())
    postgres_ok = neo4j_ok = False

    try:
        postgres_db.add_feedback(
            _postgres_row(text, classified, contact_info),
            feedback_id=feedback_id,
            config_version=classified.config_version,
        )
        postgres_ok = True
    except Exception as e:
        logger.error(f"Failed to store feedback {feedback_id} in PostgreSQL: {e}")

    try:
        db.add_feedback(classified, feedback_id=feedback_id)
        neo4j_ok = True
    except Exception as e:
        logger.error(f"Failed to store feedback {feedback_id} in Neo4j: {e}")

    if not postgres_ok and not neo4j_ok:
        logger.error(
            f"UNSTORED SUBMISSION {feedback_id}: both databases failed. "
            f"Recover from this log. timestamp={datetime.now().isoformat()} "
            f"language={classified.language} followup_opt_in={_contact_fields(contact_info)[0]} text={text!r}"
        )
        raise StorageError(feedback_id)
    if not (postgres_ok and neo4j_ok):
        logger.error(f"Feedback {feedback_id} stored in only one database (postgres={postgres_ok}, neo4j={neo4j_ok})")
    return feedback_id


async def process_submission(text: str, contact_info: Optional[dict] = None) -> ClassifiedFeedback:
    """Classify, tag and store one submission."""
    classified = await classify_and_tag(text)
    store_feedback(text, classified, contact_info)
    return classified
