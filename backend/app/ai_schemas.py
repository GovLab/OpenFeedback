"""Shapes of the JSON the model returns, checked before any of it is used.

Each AI step parses its reply with one of these models. A reply that does not
match raises pydantic.ValidationError, and the caller takes its existing
fallback (see classifier.py and file_processor.py). Sentiment, priority and
urgency are matched against the active system config (its *_options and
*_levels lists, ignoring case and spaces), so staff-defined labels survive.
Without an active config the built-in defaults apply.

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
    ValidationInfo,
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

# Built-in labels, used when no active config exists (same lists as prompts.py)
DEFAULT_SENTIMENT_OPTIONS = ("Positive", "Negative", "Neutral")
DEFAULT_PRIORITY_OPTIONS = ("High", "Medium", "Low")
DEFAULT_URGENCY_OPTIONS = ("Low", "Medium", "High")
DEFAULT_SENTIMENT = "Neutral"
DEFAULT_PRIORITY = "Medium"
DEFAULT_URGENCY = "Medium"

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


def label_options(config_data: Optional[dict]) -> dict[str, tuple[str, ...]]:
    """Allowed labels per field: the active config's lists, or the built-in defaults."""
    config = config_data or {}
    return {
        "sentiment": _labels_or_default(config.get("sentiment_options"), DEFAULT_SENTIMENT_OPTIONS),
        "priority": _labels_or_default(config.get("priority_levels"), DEFAULT_PRIORITY_OPTIONS),
        "urgency": _labels_or_default(config.get("urgency_levels"), DEFAULT_URGENCY_OPTIONS),
    }


def _labels_or_default(configured: Any, default: tuple[str, ...]) -> tuple[str, ...]:
    labels = tuple(label for label in (str(item).strip() for item in configured or []) if label)
    return labels or default


def _configured_label(value: Any, options: tuple[str, ...]) -> Optional[str]:
    """The configured label that the value spells (ignoring case and spaces), or None."""
    if isinstance(value, str):
        wanted = value.strip().lower()
        for option in options:
            if option.lower() == wanted:
                return option
    return None


def _options_for(info: ValidationInfo, field: str) -> tuple[str, ...]:
    context = info.context or label_options(None)
    return context[field]


def _match_option_or_none(options: tuple[str, ...]) -> Callable[[Any], Any]:
    """Map a value to the option it spells (ignoring case and spaces), otherwise None."""
    def normalise(value: Any) -> Any:
        return _configured_label(value, options)
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


Summary = Annotated[str, BeforeValidator(_truncate(MAX_SUMMARY_CHARS))]
Label = Annotated[str, BeforeValidator(_truncate(MAX_LABEL_CHARS))]
Reason = Annotated[str, BeforeValidator(_truncate(MAX_REASON_CHARS))]
RelevanceKindField = Annotated[
    Optional[RelevanceKind],
    BeforeValidator(_match_option_or_none(get_args(RelevanceKind))),
]
QualityScore = Annotated[int, BeforeValidator(_clamp_score)]


class ClassificationReply(BaseModel):
    """Reply to the classification prompt (classifier.classify_feedback).

    Pass the allowed labels as validation context: model_validate_json(text,
    context=label_options(config)). The labels in the result are the configured
    spellings. Missing or unknown sentiment and priority become the default
    label (or the first configured one if the default is not configured).
    Missing or unknown urgency becomes the default when configured, else None.
    The feedback pipeline then maps urgency to the database enum as before.
    """
    model_config = ConfigDict(extra="ignore")

    category_map: dict[str, list[str]] = Field(default_factory=dict)
    sentiment: str = Field(default=DEFAULT_SENTIMENT, validate_default=True)
    priority: str = Field(default=DEFAULT_PRIORITY, validate_default=True)
    permit_type: Optional[Label] = None
    ai_summary: Optional[Summary] = None
    department_predicted: Optional[Label] = None
    urgency_level: Optional[str] = Field(default=DEFAULT_URGENCY, validate_default=True)
    impact_type: Optional[list[str]] = Field(default_factory=list)
    language: Optional[str] = "en"

    @field_validator("sentiment", mode="before")
    @classmethod
    def sentiment_is_configured(cls, value: Any, info: ValidationInfo) -> str:
        options = _options_for(info, "sentiment")
        return (
            _configured_label(value, options)
            or _configured_label(DEFAULT_SENTIMENT, options)
            or options[0]
        )

    @field_validator("priority", mode="before")
    @classmethod
    def priority_is_configured(cls, value: Any, info: ValidationInfo) -> str:
        options = _options_for(info, "priority")
        return (
            _configured_label(value, options)
            or _configured_label(DEFAULT_PRIORITY, options)
            or options[0]
        )

    @field_validator("urgency_level", mode="before")
    @classmethod
    def urgency_is_configured(cls, value: Any, info: ValidationInfo) -> Optional[str]:
        return _configured_label(value, _options_for(info, "urgency"))


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
