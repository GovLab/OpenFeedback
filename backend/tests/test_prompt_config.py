"""Tests for the combined prompt configuration method (prompt_builder)."""

from app.prompts import prompt_builder


def test_with_defaults():
    """None config_data falls back to the hardcoded defaults."""
    feedback = "The permit process is too slow and confusing."
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=None)

    assert "Economic & Equity Concerns" in prompt, "Should contain default category"
    assert "Building - Short Form" in prompt, "Should contain default permit type"
    assert "Inspectional Services" in prompt, "Should contain default department"
    assert feedback in prompt, "Should contain feedback text"


def test_with_custom_config():
    """Custom config_data values replace the defaults in the prompt."""
    custom_config = {
        'categories': [
            {'name': 'Test Category', 'subcategories': ['Test Sub 1', 'Test Sub 2']},
            {'name': 'Another Category', 'subcategories': ['Sub A']}
        ],
        'permit_types': ['Custom Permit A', 'Custom Permit B'],
        'departments': ['Custom Department'],
        'impact_types': ['Custom Impact'],
        'sentiment_options': ['Happy', 'Sad'],
        'priority_levels': ['Critical'],
        'urgency_levels': ['Very High']
    }

    feedback = "This is a test feedback message."
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=custom_config)

    assert "Test Category" in prompt, "Should contain custom category"
    assert "Test Sub 1" in prompt, "Should contain custom subcategory"
    assert "Custom Permit A" in prompt, "Should contain custom permit type"
    assert "Custom Department" in prompt, "Should contain custom department"
    assert "Happy|Sad" in prompt, "Should contain custom sentiment options"
    assert feedback in prompt, "Should contain feedback text"


def test_with_empty_config():
    """An empty config dict still produces a prompt containing the feedback."""
    feedback = "Test feedback"
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data={})
    assert feedback in prompt, "Should contain feedback text"


def test_prompt_structure():
    """The prompt contains every required section."""
    feedback = "The portal crashed when I tried to submit my application."
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=None)

    required_sections = [
        "Available Categories and Subcategories",
        "Permit Type",
        "Sentiment",
        "Priority level",
        "Department",
        "Urgency",
        "Impact Types",
        "Language",
        "Return ONLY a valid JSON object"
    ]

    for section in required_sections:
        assert section in prompt, f"Prompt should contain: {section}"
