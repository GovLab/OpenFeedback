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


def generate_followup_questions(text: str, category_map: dict) -> List[str]:
    """Generate intelligent follow-up questions to get to the root cause of vague feedback."""
    if not settings.openai_api_key:
        return []
    
    try:
        categories = list(category_map.keys())
        subcategories = [sub for subs in category_map.values() for sub in subs]
        
        # Analyze if the feedback is vague and needs more detail
        analysis_prompt = f"""
Analyze this feedback and determine if it needs more detail to understand the root cause.

Ask follow-up questions if the feedback is:
- Very short (1-2 sentences) AND lacks specific details
- Examples that SHOULD get follow-up questions: "this is slow", "its super slow", "broken", "doesn't work", "confusing"
- Examples that should NOT get follow-up questions: "I submitted my permit 3 weeks ago and have been waiting", "The website crashed when I tried to upload documents yesterday"

Consider:
- Length: Short feedback (1-2 sentences) without specifics needs follow-up
- Specificity: Does it mention specific steps, timelines, locations, or issues?
- Actionable information: Can someone understand what the problem is?

Feedback: "{text}"
Categories: {categories}
Subcategories: {subcategories}

Is this feedback vague and needs follow-up questions? Respond with just "YES" or "NO".
"""
        
        analysis_response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[{"role": "user", "content": analysis_prompt}],
        )
        
        needs_detail = analysis_response.choices[0].message.content.strip().upper() == "YES"
        
        if not needs_detail:
            return []  # No follow-up questions needed
        
        # Generate contextual questions based on the feedback and categories
        question_prompt = f"""
Generate 3-5 quick, easy follow-up questions about this permit feedback that users would want to answer.

Feedback: "{text}"
Categories: {categories}
Subcategories: {subcategories}

Guidelines:
- Make questions EASY and QUICK to answer (yes/no, single word, or short phrase)
- Ask ONE thing at a time - keep it simple
- Be conversational and friendly, not formal
- Focus on practical details: what, when, where, which step
- Examples of GOOD questions: "Which permit were you applying for?", "Was this online or in-person?", "How long have you been waiting?"
- Examples of BAD questions: "Can you describe in detail the entire process?", complex multi-part questions
- Don't ask for information already mentioned
- Maximum 5 questions

Return as a JSON array of strings: ["question1", "question2", ...]
"""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            messages=[{"role": "user", "content": question_prompt}],
        )
        
        raw = response.choices[0].message.content or "[]"
        m = re.search(r'\[[\s\S]*\]', raw)
        if m:
            questions = json.loads(m.group(0))
            if isinstance(questions, list) and all(isinstance(q, str) for q in questions):
                return questions[:5]  # Limit to 5 questions
        
        return []
        
    except Exception as e:
        logger.error(f"Error generating follow-up questions: {str(e)}")
        return []


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
