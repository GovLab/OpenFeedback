from openai import OpenAI
from .config import settings
from .models import ClassifiedFeedback
import json
import logging
import re
from typing import List

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
    "category_map": {{
        "Category Name 1": ["Subcategory 1", "Subcategory 2"],
        "Category Name 2": ["Subcategory 3"]
    }},
    "sentiment": "Positive|Negative|Neutral",
    "priority": "High|Medium|Low"
}}

Each category should map to its relevant subcategories. Only include categories and subcategories that apply to this feedback."""


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
        category_map = classification.get("category_map", {})
        logger.info(f"Successfully classified feedback. Categories: {list(category_map.keys())}")
        logger.debug(f"Full classification result: {classification}")
        
        return ClassifiedFeedback(
            text=feedback_text,
            category_map=category_map,
            sentiment=classification.get("sentiment", "Neutral"),
            priority=classification.get("priority", "Medium")
        )
    
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing failed for content: {content[:200]}... Error: {str(e)}")
        logger.warning("Falling back to default classification due to JSON parsing error")
        return ClassifiedFeedback(
            text=feedback_text,
            category_map={"Process & Operational Flow Issues": ["Unclassified"]},
            sentiment="Neutral",
            priority="Medium"
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
    
    # Create the prompt for the AI agent
    prompt = f"""You are an intelligent feedback quality assistant for Boston city government permit processes.

{context}

Your task is to determine if the feedback has enough actionable detail, and if not, ask ONE follow-up question.

DECISION CRITERIA:
- Feedback NEEDS more detail if it's vague, lacks specifics about: which permit, timeline, location, what happened, error messages, etc.
- Feedback is SUFFICIENT when you can understand: what the issue is, when/where it occurred, and what the user tried to do
- Examples of INSUFFICIENT: "this is slow", "broken", "confusing", "doesn't work"
- Examples of SUFFICIENT: "Building permit application has been pending for 3 weeks", "Website crashed when uploading documents on Chrome yesterday"

IF MORE DETAIL NEEDED:
- Ask ONE quick, easy question that builds on previous answers
- Make it EASY to answer (yes/no, single word, or short phrase)
- Be conversational and friendly
- Focus on: what, when, where, which permit, what step, what error
- Acknowledge their previous answer if relevant

IF ENOUGH DETAIL:
- Set needs_followup to false
- Thank them briefly

Respond in this JSON format:
{{
  "needs_followup": true/false,
  "message": "your question or thank you message",
  "quality_score": 1-10
}}

Quality score explanation:
- 1-3: Very vague, missing critical details
- 4-6: Some detail but still needs more context
- 7-8: Good detail, mostly actionable
- 9-10: Excellent detail, fully actionable
"""
    
    # Get AI response
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    
    # Ensure proper types
    result["needs_followup"] = bool(result.get("needs_followup", True))
    result["quality_score"] = int(result.get("quality_score", 5))
    
    return result
