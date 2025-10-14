from openai import OpenAI
from .config import settings
from .models import ClassifiedFeedback
import json

client = OpenAI(api_key=settings.openai_api_key)


CLASSIFICATION_PROMPT = """You are a feedback classification system. Analyze the following feedback and classify it into relevant categories and subcategories.

Available Categories:
- Product: Issues related to product features, functionality, or quality
  - Subcategories: UI/UX, Performance, Bugs, Feature Request
- Service: Issues related to customer service or support
  - Subcategories: Response Time, Quality, Accessibility
- Pricing: Issues related to pricing or billing
  - Subcategories: Cost, Value, Payment Issues
- General: General feedback or suggestions
  - Subcategories: Suggestion, Complaint, Praise

Also determine the sentiment (Positive, Negative, or Neutral).

Feedback: {feedback}

Return ONLY a valid JSON object with this exact structure (no additional text):
{{
    "categories": ["category1", "category2"],
    "subcategories": ["subcategory1", "subcategory2"],
    "sentiment": "Positive|Negative|Neutral"
}}"""


async def classify_feedback(feedback_text: str) -> ClassifiedFeedback:
    """
    Classify feedback using OpenAI API.
    
    Args:
        feedback_text: The feedback text to classify
        
    Returns:
        ClassifiedFeedback object with categories, subcategories, and sentiment
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a feedback classification assistant that returns only valid JSON."},
                {"role": "user", "content": CLASSIFICATION_PROMPT.format(feedback=feedback_text)}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        # Extract the response content
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        classification = json.loads(content)
        
        return ClassifiedFeedback(
            text=feedback_text,
            categories=classification.get("categories", []),
            subcategories=classification.get("subcategories", []),
            sentiment=classification.get("sentiment", "Neutral")
        )
    except json.JSONDecodeError as e:
        # Fallback to default classification if JSON parsing fails
        return ClassifiedFeedback(
            text=feedback_text,
            categories=["General"],
            subcategories=["Unclassified"],
            sentiment="Neutral"
        )
    except Exception as e:
        raise Exception(f"Error classifying feedback: {str(e)}")
