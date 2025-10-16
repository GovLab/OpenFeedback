from openai import OpenAI
from .config import settings
from .models import ClassifiedFeedback
import json
import logging
from typing import Optional

# Configure logging for the classifier module
logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.openai_api_key)


CLASSIFICATION_PROMPT = """You are a government permit system feedback classification system. Analyze the following citizen feedback and classify it into relevant categories and subcategories based on core friction points in the permit process.

Available Categories and Subcategories:

1. Economic & Equity Concerns:
   - High or Unexpected Costs
   - Access or Fairness Barriers

2. Communication & Service Problems:
   - Poor Communication / Experience
   - Service Responsiveness & Transparency

3. Technology & Access Barriers:
   - Technical / Portal Problems
   - Digital Access & Portal Problems

4. Process & Operational Flow Issues:
   - Confusion or Missing Guidance
   - Delays or Waiting Too Long
   - Conflicting Departments / Redundant Steps
   - Procedural & Coordination Issues

5. Policy & Rules Clarity:
   - Outdated or Unclear Rules
   - Rules & Policy Gaps

Also determine the sentiment (Positive, Negative, or Neutral) and priority level (High, Medium, Low) based on impact to permit process.

Feedback: {feedback}

Return ONLY a valid JSON object with this exact structure (no additional text):
{{
    "categories": ["category1", "category2"],
    "subcategories": ["subcategory1", "subcategory2"],
    "sentiment": "Positive|Negative|Neutral",
    "priority": "High|Medium|Low"
}}"""


async def classify_feedback(feedback_text: str) -> ClassifiedFeedback:
    """
    Classify feedback using OpenAI API.
    
    Args:
        feedback_text: The feedback text to classify
        
    Returns:
        ClassifiedFeedback object with categories, subcategories, and sentiment
    """
    logger.debug(f"Classifier function called with feedback: {feedback_text[:100]}...")
    
    try:
        logger.debug(f"Sending request to OpenAI with model: gpt-4o, temperature: 0.3")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a feedback classification assistant that returns only valid JSON."},
                {"role": "user", "content": CLASSIFICATION_PROMPT.format(feedback=feedback_text)}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        logger.debug(f"Received response from OpenAI")
        
        # Extract the response content
        content = response.choices[0].message.content.strip()
        logger.debug(f"Raw response content: {content}")
        
        # Parse JSON response
        try:
            # Attempt to extract JSON object from the response
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end]
            classification = json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to extract JSON from response: {content[:200]}... Error: {str(e)}")
            raise
        logger.info(f"Successfully classified feedback. Categories: {classification.get('categories', [])}")
        logger.debug(f"Full classification result: {classification}")
        
        return ClassifiedFeedback(
            text=feedback_text,
            categories=classification.get("categories", []),
            subcategories=classification.get("subcategories", []),
            sentiment=classification.get("sentiment", "Neutral"),
            priority=classification.get("priority", "Medium")
        )
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed for content: {content[:200]}... Error: {str(e)}")
        logger.warning("Falling back to default classification due to JSON parsing error")
        return ClassifiedFeedback(
            text=feedback_text,
            categories=["Process & Operational Flow Issues"],
            subcategories=["Unclassified"],
            sentiment="Neutral",
            priority="Medium"
        )
    except Exception as e:
        logger.error(f"Error classifying feedback: {str(e)}")
        logger.debug(f"Exception details: {type(e).__name__}: {str(e)}")
        raise Exception(f"Error classifying feedback: {str(e)}")
