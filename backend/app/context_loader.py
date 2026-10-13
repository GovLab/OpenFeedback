"""
Loader for topic background notes (app/context/<topic>/<category>.txt).
The chatbot gets one of these so its follow-up questions are informed.
"""

import logging

from .config import topic

logger = logging.getLogger(__name__)


def load_context(category: str) -> str:
    """Load one background-notes file for the active topic."""
    if category not in topic.context_categories:
        logger.warning(f"Unknown context category for topic {topic.key}: {category}")
        return ""

    filepath = topic.context_dir / f"{category}.txt"
    try:
        content = filepath.read_text(encoding="utf-8-sig")
        logger.info(f"Loaded {topic.key} context file: {category}")
        return content
    except OSError as e:
        logger.error(f"Error loading context file {filepath}: {str(e)}")
        return ""
