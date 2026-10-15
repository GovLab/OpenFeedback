from openai import OpenAI
from .config import settings
from .models import ClassifiedFeedback
from .relevance import fallback_classification
from .prompts import prompt_builder
from .context_loader import load_context
from .config import topic
from .system_config import system_config_manager
import json
import logging
import re
from typing import List, Optional, Dict, Any, Tuple

OPENAI_TIMEOUT_SECONDS = 30.0

# Configure logging for the classifier module
logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.openai_api_key, timeout=OPENAI_TIMEOUT_SECONDS, max_retries=1)

# Cache for active config to avoid repeated database queries
# Cache stores both config_data and version to ensure consistency
_active_config_cache: Optional[Dict[str, Any]] = None
_active_config_version: Optional[int] = None


def _get_active_config() -> Tuple[Optional[Dict[str, Any]], Optional[int]]:
    """
    Get active configuration, using cache if available.
    
    Returns:
        Tuple of (config_data dict, version number) or (None, None) if not available
        (will use hardcoded fallback)
    """
    global _active_config_cache, _active_config_version
    
    try:
        if _active_config_cache is None:
            config = system_config_manager.get_active_config()
            if config:
                _active_config_cache = config['config_data']
                _active_config_version = config['version']
                logger.info(f"Loaded active configuration version {_active_config_version} from database")
            else:
                logger.warning("No active config found, will use hardcoded values")
                return None, None
        return _active_config_cache, _active_config_version
    except Exception as e:
        logger.error(f"Error loading active config: {str(e)}")
        logger.warning("Falling back to hardcoded values")
        return None, None


def clear_config_cache():
    """
    Clear the cached configuration. Call this when config is updated.
    Next classification will reload config from database.
    """
    global _active_config_cache, _active_config_version
    _active_config_cache = None
    _active_config_version = None
    logger.info("Configuration cache cleared")


async def classify_feedback(feedback_text: str) -> ClassifiedFeedback:
    """
    Classify feedback using OpenAI API with dynamic configuration.
    
    Args:
        feedback_text: The feedback text to classify
        
    Returns:
        ClassifiedFeedback object with categories, subcategories, and sentiment
    """
    logger.debug(f"Classifier function called with feedback: {feedback_text[:100]}...")
    
    # Try to load active config (will use defaults if None)
    # Capture both config_data and version at the time of classification
    config_data, config_version = _get_active_config()
    
    if config_data:
        logger.debug(f"Using dynamic configuration version {config_version} from database")
    else:
        logger.debug("Using hardcoded configuration defaults (fallback)")
        config_version = None
    
    prompt = prompt_builder.build_classification_prompt_from_config(feedback_text, config_data)
    
    try:
        logger.debug(f"Sending request to OpenAI with model: gpt-4o, temperature: 0.3")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt_builder.build_classification_system_message()},
                {"role": "user", "content": prompt}
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
            language=classification.get("language", "en"),
            config_version=config_version
        )
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed for content: {content[:200]}... Error: {str(e)}")
        logger.warning("Falling back to default classification due to JSON parsing error")
        # Get config version even for fallback (may be None if no active config)
        _, config_version = _get_active_config()
        return fallback_classification(feedback_text, config_version)
    except Exception as e:
        logger.error(f"Error classifying feedback: {str(e)}")
        logger.debug(f"Exception details: {type(e).__name__}: {str(e)}")
        raise Exception(f"Error classifying feedback: {str(e)}")

def determine_topic_context(feedback_text: str, category_map: dict = None) -> str:
    """
    One-time function to determine which background notes to load for the active topic.
    Uses AI with tool calling to intelligently select the right category.
    
    Args:
        feedback_text: The original feedback text
        category_map: Optional pre-classified category map from classify_feedback
        
    Returns:
        The loaded context text (or empty string if none needed)
    """
    logger.info("=" * 60)
    logger.info("==== TOPIC CONTEXT DETERMINATION (Tool Calling) ====")
    logger.info("=" * 60)
    
    if not settings.openai_api_key:
        logger.warning("OpenAI API key not configured, skipping context loading")
        return ""
    
    logger.info(f"Feedback preview: {feedback_text[:100]}...")
    if category_map:
        logger.info(f"Pre-classified categories available: {list(category_map.keys())}")
    
    # Define tool for accessing the topic's background notes
    category_descriptions = ", ".join(f"{name} ({description})" for name, description in topic.context_categories.items())
    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_context",
                "description": f"Get background information about {topic.subject} for a specific category. Choose the most relevant category based on the feedback.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": list(topic.context_categories),
                            "description": f"Which category: {category_descriptions}"
                        }
                    },
                    "required": ["category"]
                }
            }
        }
    ]
    
    # Build context hint from category_map if available
    category_hint = ""
    if category_map:
        category_hint = f"\n\nPre-classified categories: {', '.join(category_map.keys())}"
    
    # Call AI to determine which context to load
    try:
        logger.info("🤖 Calling OpenAI (gpt-4o-mini) with tool to determine category...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            messages=[
                {
                    "role": "system", 
                    "content": f"You are a feedback category classifier for {topic.subject}. Based on feedback, select the most relevant background category to help ask follow-up questions."
                },
                {
                    "role": "user", 
                    "content": f"Feedback: {feedback_text}{category_hint}\n\nWhich context category is most relevant?"
                }
            ],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "get_context"}}
        )
        
        logger.info(f"📨 OpenAI response received:")
        logger.info(f"   - Role: {response.choices[0].message.role}")
        logger.info(f"   - Content: {response.choices[0].message.content}")
        logger.info(f"   - Tool calls: {response.choices[0].message.tool_calls}")
        if response.choices[0].message.tool_calls:
            logger.info(f"   - Tool call details: {response.choices[0].message.tool_calls[0]}")
        # Extract the category from tool call
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            category = json.loads(tool_call.function.arguments)["category"]
            
            logger.info(f"✓ AI selected category: '{category}'")
            logger.info(f"📄 Loading {topic.key} context from file...")
            
            # Load and return the context
            context_content = load_context(category)
            context_length = len(context_content)
            logger.info(f"✓ Context loaded: {context_length} characters")
            logger.info("=" * 60)
            
            return context_content
        else:
            logger.warning("⚠️ No tool call returned, using empty context")
            logger.info("=" * 60)
            return ""
            
    except Exception as e:
        logger.error(f"❌ Error determining topic context: {str(e)}")
        logger.info("=" * 60)
        return ""


def detect_spam_or_invalid(feedback_text: str) -> dict:
    """
    Detect if feedback is spam, outlandish, or off-topic.
    
    Args:
        feedback_text: The feedback text to check
        
    Returns:
        Dict with is_invalid (bool) and reason (str, optional)
    """
    logger.info("=" * 60)
    logger.info("==== SPAM/INVALID DETECTION ====")
    logger.info("=" * 60)
    
    if not settings.openai_api_key:
        logger.warning("OpenAI API key not configured, skipping spam detection")
        return {"is_invalid": False}
    
    try:
        logger.info(f"Checking feedback: {feedback_text[:100]}...")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": f"You are a spam detection system for city feedback about {topic.subject}. You identify spam, outlandish content, or feedback completely unrelated to the topic."
                },
                {
                    "role": "user",
                    "content": prompt_builder.build_spam_detection_prompt(feedback=feedback_text)
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=80
        )
        
        result = json.loads(response.choices[0].message.content)
        is_invalid = bool(result.get("is_invalid", False))
        reason = result.get("reason", "")
        kind = result.get("kind", "")
        
        logger.info(f"Spam detection result: is_invalid={is_invalid}")
        if is_invalid:
            logger.info(f"Reason: {reason}")
        logger.info("=" * 60)
        
        return {
            "is_invalid": is_invalid,
            "kind": kind,
            "reason": reason
        }
        
    except Exception as e:
        logger.error(f"Error in spam detection: {str(e)}")
        # On error, default to not invalid (be lenient)
        return {"is_invalid": False}


def chatbot_agent(original_feedback: str, conversation_history: List, topic_context: str = "") -> dict:
    """
    Intelligent chatbot agent that evaluates feedback quality and asks follow-up questions.
    
    Args:
        original_feedback: The original feedback text
        conversation_history: List of previous conversation messages
        topic_context: Pre-loaded background notes for the topic (loaded once at start)
        
    Returns:
        Dict with needs_followup, message, and quality_score
    """
    logger.info("=" * 60)
    logger.info("==== CHATBOT AGENT (Quality Evaluation) ====")
    logger.info("=" * 60)
    
    if not settings.openai_api_key:
        raise Exception("OpenAI API key not configured")
    
    logger.info(f"Feedback preview: {original_feedback[:100]}...")
    logger.info(f"Conversation history: {len(conversation_history)} messages")
    logger.info(f"Topic context: {'Available (' + str(len(topic_context)) + ' chars)' if topic_context else 'Not provided'}")
    
    # Build conversation context with clear structure
    context_parts = [f"=== ORIGINAL FEEDBACK ===\n{original_feedback}"]
    
    if conversation_history:
        context_parts.append("\n=== CONVERSATION HISTORY ===")
        # Format conversation as Q&A pairs for clarity
        question_num = 1
        for msg in conversation_history[-8:]:  # Last 8 messages for context
            if msg.role == "assistant":
                context_parts.append(f"\nQuestion {question_num}: {msg.content}")
            elif msg.role == "user":
                context_parts.append(f"Answer {question_num}: {msg.content}")
                question_num += 1
        
        context_parts.append(f"\n=== END CONVERSATION HISTORY ===")
        logger.info(f"Context parts built: {len(context_parts)} parts")
        logger.info(f"Conversation has {question_num - 1} Q&A pairs")
    context = "\n".join(context_parts)
    
    # Build system message with topic context if available
    base_system_message = prompt_builder.build_chatbot_agent_system_message()
    if topic_context:
        system_message = f"{base_system_message}\n\n=== BACKGROUND NOTES ===\n{topic_context}\n=== END NOTES ===\n\nUse these notes to ask informed, specific questions."
    else:
        system_message = base_system_message
    
    config_data, _ = _get_active_config()
    item_types = (config_data or {}).get("permit_types", [])
    prompt = prompt_builder.build_chatbot_agent_prompt(context=context, item_types=item_types)
    
    logger.info("🤖 Calling OpenAI (gpt-4o-mini) for quality evaluation...")
    logger.info("   - No tools involved (context already in system prompt)")
    
    # Single API call with context already in system prompt (no tools needed)
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
    
    logger.info(f"✓ AI Response received:")
    logger.info(f"   - Quality score: {result['quality_score']}/10")
    logger.info(f"   - Needs followup: {result['needs_followup']}")
    logger.info(f"   - Message preview: {result.get('message', '')[:80]}...")
    
    # Enforce quality thresholds
    if result["quality_score"] < 6:
        logger.info(f"⚠️ Quality score below threshold (< 6), requiring followup")
        result["needs_followup"] = True
    elif result["quality_score"] >= 6:
        logger.info(f"✓ Quality threshold met (>= 6), marking as complete")
        result["needs_followup"] = False
        result["message"] = "Thank you for your feedback!"
    
    logger.info("=" * 60)
    
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
    
    # Check if there are any user answers (not just assistant questions)
    has_user_responses = any(msg.role == "user" for msg in conversation_history)
    if not has_user_responses:
        # User skipped without answering, return empty string
        logger.info("No user responses found in conversation history, skipping augmentation")
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