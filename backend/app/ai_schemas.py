"""Shapes of the JSON the model returns, checked before any of it is used.

Each AI step parses its reply with one of these models. A reply that does not
match raises pydantic.ValidationError, and the caller takes its existing
fallback (see classifier.py and file_processor.py). Enum-like values are
matched ignoring case and spaces; an unknown value becomes the default the
code already uses when the key is missing, so a valid reply is never lost.

Logs must never carry the reply text, because it can contain resident
feedback. Use describe_validation_error() instead of str(error).
"""
import re
from typing import Annotated, Any, Callable, Literal, Optional, get_args

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    RootModel,
    ValidationError,
    field_validator,
)

from .config import topic

MAX_SUMMARY_CHARS = 500
MAX_LABEL_CHARS = 100  # permit_type and department_predicted are VARCHAR(100) in schema.sql
MAX_REASON_CHARS = 300
MIN_QUALITY_SCORE = 1
MAX_QUALITY_SCORE = 10
DEFAULT_QUALITY_SCORE = 5

_OPENING_FENCE = re.compile(r"^```[\w-]*\s*")
_CLOSING_FENCE = re.compile(r"\s*```$")

SentimentOption = Literal["Positive", "Negative", "Neutral"]
PriorityOption = Literal["High", "Medium", "Low"]
# Must match the Postgres urgency_level_enum in schema.sql
UrgencyOption = Literal["Low", "Medium", "High"]
RelevanceKind = Literal["off_topic", "spam", "abusive", "unclear"]


def strip_code_fence(text: str) -> str:
    """Remove a Markdown code fence (```json ... ```) the model may wrap its JSON in."""
    stripped = text.strip()
    stripped = _OPENING_FENCE.sub("", stripped)
    return _CLOSING_FENCE.sub("", stripped).strip()


def describe_validation_error(error: ValidationError) -> str:
    """Field paths and error types only. Values are left out because they can hold resident text."""
    parts = []
    for item in error.errors(include_url=False, include_context=False, include_input=False):
        location = ".".join(str(part) for part in item["loc"]) or "root"
        parts.append(f"{location}: {item['type']}")
    return "; ".join(parts)


def _match_option(options: tuple[str, ...], fallback: Any) -> Callable[[Any], Any]:
    """Map a value to the option it spells, ignoring case and spaces; otherwise use the fallback."""
    def normalise(value: Any) -> Any:
        if isinstance(value, str):
            wanted = value.strip().lower()
            for option in options:
                if option.lower() == wanted:
                    return option
        return fallback
    return normalise


def _truncate(limit: int) -> Callable[[Any], Any]:
    """Shorten long model text instead of rejecting it, so the classification is kept."""
    def shorten(value: Any) -> Any:
        if isinstance(value, str) and len(value) > limit:
            return value[: limit - 3].rstrip() + "..."
        return value
    return shorten


def _clamp_score(value: Any) -> Any:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return value  # Pydantic reports the type error
    return min(max(number, MIN_QUALITY_SCORE), MAX_QUALITY_SCORE)


Sentiment = Annotated[
    SentimentOption,
    BeforeValidator(_match_option(get_args(SentimentOption), "Neutral")),
]
Priority = Annotated[
    PriorityOption,
    BeforeValidator(_match_option(get_args(PriorityOption), "Medium")),
]
Urgency = Annotated[
    Optional[UrgencyOption],
    BeforeValidator(_match_option(get_args(UrgencyOption), None)),
]
Summary = Annotated[str, BeforeValidator(_truncate(MAX_SUMMARY_CHARS))]
Label = Annotated[str, BeforeValidator(_truncate(MAX_LABEL_CHARS))]
Reason = Annotated[str, BeforeValidator(_truncate(MAX_REASON_CHARS))]
RelevanceKindField = Annotated[
    Optional[RelevanceKind],
    BeforeValidator(_match_option(get_args(RelevanceKind), None)),
]
QualityScore = Annotated[int, BeforeValidator(_clamp_score)]


class ClassificationReply(BaseModel):
    """Reply to the classification prompt (classifier.classify_feedback).

    Missing keys take the defaults the code always used. Unknown sentiment and
    priority become Neutral and Medium. Unknown urgency becomes None, which the
    feedback pipeline stores as empty, as it did before.
    """
    model_config = ConfigDict(extra="ignore")

    category_map: dict[str, list[str]] = Field(default_factory=dict)
    sentiment: Sentiment = "Neutral"
    priority: Priority = "Medium"
    permit_type: Optional[Label] = None
    ai_summary: Optional[Summary] = None
    department_predicted: Optional[Label] = None
    urgency_level: Urgency = "Medium"
    impact_type: Optional[list[str]] = Field(default_factory=list)
    language: Optional[str] = "en"


class TopicContextArguments(BaseModel):
    """Arguments of the get_context tool call (classifier.determine_topic_context)."""
    model_config = ConfigDict(extra="ignore")

    category: str

    @field_validator("category")
    @classmethod
    def category_is_known(cls, value: str) -> str:
        if value not in topic.context_categories:
            raise ValueError("unknown context category")
        return value


class RelevanceReply(BaseModel):
    """Reply to the spam and relevance prompt (classifier.detect_spam_or_invalid)."""
    model_config = ConfigDict(extra="ignore")

    is_invalid: bool = False
    kind: RelevanceKindField = None
    reason: Optional[Reason] = ""


class FollowupVerdict(BaseModel):
    """Reply to the chatbot prompt (classifier.chatbot_agent).

    quality_score is clamped to 1-10 rather than rejected, as the code always
    did, so an out-of-range score still gets a follow-up or a thank-you.
    """
    model_config = ConfigDict(extra="ignore")

    needs_followup: bool = True
    message: str = ""
    quality_score: QualityScore = DEFAULT_QUALITY_SCORE


class SegmentList(RootModel[list[str]]):
    """Reply to the segmentation prompt (file_processor): a JSON array of feedback texts."""
