from pydantic import BaseModel
from typing import List, Optional, Dict


class FeedbackInput(BaseModel):
    """Model for feedback input from user."""
    text: str


class Category(BaseModel):
    """Model for a feedback category."""
    name: str
    subcategories: List[str] = []


class ClassifiedFeedback(BaseModel):
    """Model for classified feedback."""
    text: str
    category_map: Dict[str, List[str]]  # Maps categories to their subcategories
    sentiment: Optional[str] = None
    priority: Optional[str] = None


class GraphNode(BaseModel):
    """Model for a graph node."""
    id: str
    label: str
    type: str


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
