from openai import OpenAI
from .config import settings
from .models import ClassifiedFeedback
from .prompts import prompt_builder
import json
import logging
import re
from typing import List

# Configure logging for the classifier module
logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.openai_api_key)


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
                {"role": "system", "content": prompt_builder.build_classification_system_message()},
                {"role": "user", "content": prompt_builder.build_classification_prompt(feedback=feedback_text)}
            ],
            temperature=0.3,
            max_tokens=500  # Increased for additional AI-generated fields
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
        category_map = classification.get("category_map", {})
        logger.info(f"Successfully classified feedback. Categories: {list(category_map.keys())}")
        logger.debug(f"Full classification result: {classification}")
        
        return ClassifiedFeedback(
            text=feedback_text,
            category_map=category_map,
            sentiment=classification.get("sentiment", "Neutral"),
            priority=classification.get("priority", "Medium"),
            permit_type=classification.get("permit_type"),
            ai_summary=classification.get("ai_summary"),
            department_predicted=classification.get("department_predicted"),
            urgency_level=classification.get("urgency_level", "Medium"),
            impact_type=classification.get("impact_type", []),
            language=classification.get("language", "en")
        )
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed for content: {content[:200]}... Error: {str(e)}")
        logger.warning("Falling back to default classification due to JSON parsing error")
        return ClassifiedFeedback(
            text=feedback_text,
            category_map={"Process & Operational Flow Issues": ["Unclassified"]},
            sentiment="Neutral",
            priority="Medium",
            permit_type=None,
            ai_summary=feedback_text[:200] if len(feedback_text) > 200 else feedback_text,
            department_predicted=None,
            urgency_level="Medium",
            impact_type=[],
            language="en"
        )
    except Exception as e:
        logger.error(f"Error classifying feedback: {str(e)}")
        logger.debug(f"Exception details: {type(e).__name__}: {str(e)}")
        raise Exception(f"Error classifying feedback: {str(e)}")

def chatbot_agent(original_feedback: str, conversation_history: List) -> dict:
    """
    Single intelligent agent that handles:
    1. Checking if feedback needs follow-up
    2. Dynamically generating context-aware questions
    3. Deciding when quality is sufficient
    """
    
    if not settings.openai_api_key:
        raise Exception("OpenAI API key not configured")
    
    # Build current enhanced feedback
    if conversation_history:
        user_responses = [msg.content for msg in conversation_history if msg.role == "user"]
        current_feedback = f"{original_feedback}\n\nAdditional context: {' '.join(user_responses)}"
    else:
        current_feedback = original_feedback
    
    # Build conversation context
    context_parts = [f"Original feedback: {original_feedback}"]
    
    if conversation_history:
        context_parts.append("\nConversation so far:")
        for msg in conversation_history[-8:]:  # Last 8 messages for context
            role_name = "You" if msg.role == "assistant" else "User"
            context_parts.append(f"{role_name}: {msg.content}")
    
    context = "\n".join(context_parts)
    
    # Create the prompt for the AI agent using the prompt builder
    system_message = prompt_builder.build_chatbot_agent_system_message()
    prompt = prompt_builder.build_chatbot_agent_prompt(context=context)
    
    # Get AI response
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    
    # Ensure proper types
    result["needs_followup"] = bool(result.get("needs_followup", True))
    result["quality_score"] = int(result.get("quality_score", 5))
    
    return result


def augment_feedback(original_feedback: str, conversation_history: List) -> str:
    """
    Use AI to generate an additional note from conversation details.
    
    Args:
        original_feedback: The original feedback text
        conversation_history: List of conversation messages with role and content
        
    Returns:
        Just the additional note text (not the full feedback)
    """
    logger.info("Generating additional note from conversation")
    
    if not settings.openai_api_key:
        raise Exception("OpenAI API key not configured")
    
    if not conversation_history:
        # No conversation, return empty string
        return ""
    
    try:
        # Build the augmentation prompt
        system_message = prompt_builder.build_augmentation_system_message()
        prompt = prompt_builder.build_augmentation_prompt(
            original_feedback=original_feedback,
            conversation_history=conversation_history
        )
        
        # Call OpenAI with cheap model (gpt-4o-mini)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.5,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            max_tokens=400
        )
        
        additional_note = response.choices[0].message.content.strip()
        logger.info(f"Successfully generated additional note. Length: {len(additional_note)}")
        
        return additional_note
        
    except Exception as e:
        logger.error(f"Error generating additional note: {str(e)}")
        # Fallback to simple concatenation if AI fails
        user_responses = [msg.content for msg in conversation_history if msg.role == "user"]
        return ' '.join(user_responses)