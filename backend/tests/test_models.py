"""
Basic tests for the models module.
"""
import pytest
from app.models import FeedbackInput, ClassifiedFeedback, Category, GraphNode, GraphRelationship, GraphData


def test_feedback_input():
    """Test FeedbackInput model."""
    feedback = FeedbackInput(text="This is a test feedback")
    assert feedback.text == "This is a test feedback"


def test_classified_feedback():
    """Test ClassifiedFeedback model."""
    classified = ClassifiedFeedback(
        text="Test feedback",
        categories=["Product"],
        subcategories=["UI/UX"],
        sentiment="Positive"
    )
    assert classified.text == "Test feedback"
    assert "Product" in classified.categories
    assert "UI/UX" in classified.subcategories
    assert classified.sentiment == "Positive"


def test_category():
    """Test Category model."""
    category = Category(name="Product", subcategories=["UI/UX", "Performance"])
    assert category.name == "Product"
    assert len(category.subcategories) == 2


def test_graph_node():
    """Test GraphNode model."""
    node = GraphNode(id="123", label="Product", type="Category")
    assert node.id == "123"
    assert node.label == "Product"
    assert node.type == "Category"


def test_graph_relationship():
    """Test GraphRelationship model."""
    rel = GraphRelationship(source="1", target="2", type="BELONGS_TO")
    assert rel.source == "1"
    assert rel.target == "2"
    assert rel.type == "BELONGS_TO"


def test_graph_data():
    """Test GraphData model."""
    nodes = [GraphNode(id="1", label="Test", type="Category")]
    relationships = [GraphRelationship(source="1", target="2", type="BELONGS_TO")]
    graph = GraphData(nodes=nodes, relationships=relationships)
    assert len(graph.nodes) == 1
    assert len(graph.relationships) == 1
