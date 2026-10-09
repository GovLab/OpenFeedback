from pydantic import BaseModel, Field
from typing import List, Optional, Dict

MAX_FEEDBACK_CHARS = 5000
MAX_CONVERSATION_TURNS = 20


class FeedbackInput(BaseModel):
    """Model for feedback input from user."""
    text: str = Field(min_length=1, max_length=MAX_FEEDBACK_CHARS)
    contact_info: Optional[Dict] = None  # User contact information if opted in


class StaffLoginInput(BaseModel):
    """Shared staff password submitted from the dashboard login form."""
    password: str = Field(min_length=1, max_length=200)


class StaffLoginResponse(BaseModel):
    """Signed session token for staff-only endpoints."""
    token: str
    expires_at: int

class ClassifiedFeedback(BaseModel):
    """Model for classified feedback with AI-generated fields."""
    text: str
    category_map: Dict[str, List[str]]  # Maps categories to their subcategories
    sentiment: Optional[str] = None
    priority: Optional[str] = None
    
    # Enhanced AI outputs
    permit_type: Optional[str] = None  # Type of Boston permit
    ai_summary: Optional[str] = None  # Condensed version (1-2 sentences)
    department_predicted: Optional[str] = None  # Target agency
    urgency_level: Optional[str] = None  # Low, Medium, High
    impact_type: Optional[List[str]] = None  # ["Time lost", "Financial cost", etc.]
    language: Optional[str] = "en"  # Detected language code
    config_version: Optional[int] = None  # Config version used for classification


class GraphNode(BaseModel):
    """Model for a graph node."""
    id: str
    type: str
    # Node properties from Neo4j (type-specific)
    text: Optional[str] = None  # Full feedback text (only for Feedback nodes)
    sentiment: Optional[str] = None  # Sentiment (only for Feedback nodes)
    timestamp: Optional[str] = None  # Timestamp (only for Feedback nodes)
    name: Optional[str] = None  # Name (only for Category/Subcategory nodes)
    deprecated: Optional[bool] = False  # True if category/subcategory is not in active config


class GraphRelationship(BaseModel):
    """Model for a graph relationship."""
    source: str
    target: str
    type: str


class GraphData(BaseModel):
    """Model for graph visualization data."""
    nodes: List[GraphNode]
    relationships: List[GraphRelationship]


class IndividualResponse(BaseModel):
    """Model for individual feedback response within a file."""
    message: str
    text_content: str
    classified_feedback: Optional[ClassifiedFeedback] = None


class FileUploadResponse(BaseModel):
    """Model for file upload response."""
    individual_responses: List[IndividualResponse]
    original_filename: str
    file_type: str


class ConversationMessage(BaseModel):
    """Model for a message in chatbot conversation."""
    role: str  # "user" or "assistant"
    content: str = Field(max_length=MAX_FEEDBACK_CHARS)


class ConversationInput(BaseModel):
    """Model for chatbot conversation input."""
    original_feedback: str = Field(min_length=1, max_length=MAX_FEEDBACK_CHARS)
    category_map: Optional[Dict[str, List[str]]] = {}
    conversation_history: List[ConversationMessage] = Field(max_length=MAX_CONVERSATION_TURNS)


class ConversationResponse(BaseModel):
    """Model for chatbot conversation response."""
    message: str
    needs_followup: bool
    quality_score: Optional[int] = None
    is_invalid: Optional[bool] = False  # True if feedback is spam/outlandish/non-permit-related


class AugmentationInput(BaseModel):
    """Model for feedback augmentation input."""
    original_feedback: str = Field(min_length=1, max_length=MAX_FEEDBACK_CHARS)
    conversation_history: List[ConversationMessage] = Field(max_length=MAX_CONVERSATION_TURNS)


class AugmentationResponse(BaseModel):
    """Model for feedback augmentation response."""
    additional_note: str


# System Configuration Models
class Category(BaseModel):
    """Model for a category with subcategories."""
    name: str
    subcategories: List[str]


class SystemConfig(BaseModel):
    """Model for system configuration data."""
    categories: List[Category]
    permit_types: List[str]
    departments: List[str]
    impact_types: List[str]
    urgency_levels: List[str]
    sentiment_options: List[str]
    priority_levels: List[str]


class ConfigUpdateRequest(BaseModel):
    """Model for updating system configuration."""
    config_data: SystemConfig
    created_by: Optional[str] = None
    change_notes: Optional[str] = None


class ConfigVersion(BaseModel):
    """Model for a configuration version."""
    config_id: str
    version: int
    config_data: SystemConfig
    is_active: bool
    created_at: Optional[str] = None
    created_by: Optional[str] = None
    change_notes: Optional[str] = None


class ConfigResponse(BaseModel):
    """Model for active configuration response."""
    config_id: str
    version: int
    config_data: SystemConfig
    created_at: Optional[str] = None
    created_by: Optional[str] = None
    change_notes: Optional[str] = None


class ConfigHistoryResponse(BaseModel):
    """Model for configuration history response."""
    versions: List[ConfigVersion]
    current_version: Optional[int] = None


class ConfigUpdateResponse(BaseModel):
    """Model for configuration update response."""
    success: bool
    version: int
    message: Optional[str] = None