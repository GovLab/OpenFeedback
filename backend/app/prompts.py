"""
Centralized AI prompts for the OpenPermit system.
All LLM prompts used throughout the application are defined here.

This module uses a builder pattern to generate prompts with placeholders,
providing a clean abstraction for prompt generation.

USAGE:
------
Import the singleton instance and call builder methods:

    from app.prompts import prompt_builder
    
    # Build a classification prompt
    prompt = prompt_builder.build_classification_prompt(feedback="My feedback text")
    
    # Build a system message
    system_msg = prompt_builder.build_classification_system_message()
    
    # Use in OpenAI API call
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ]
    )

EXTENDING:
----------
To add a new prompt:

1. Add a new static method to the PromptBuilder class:
   
   @staticmethod
   def build_your_prompt(param1: str, param2: str) -> str:
       template = '''Your prompt template with {param1} and {param2}'''
       return template.format(param1=param1, param2=param2)

2. Use it in your code:
   
   prompt = prompt_builder.build_your_prompt(param1="value1", param2="value2")

BENEFITS:
---------
- Centralized: All prompts in one place for easy maintenance
- Type-safe: Parameters are explicitly defined with types
- Testable: Easy to unit test prompt generation
- Flexible: Easy to add new prompts or modify existing ones
- Clean: Separates prompt logic from business logic
"""

from typing import Optional


class PromptBuilder:
    """
    Builder class for constructing AI prompts with dynamic placeholders.
    Each method returns a formatted prompt string with the provided kwargs.
    """
    
    @staticmethod
    def build_classification_prompt(feedback: str) -> str:
        """
        Build a classification prompt for categorizing feedback.
        
        Args:
            feedback: The user feedback text to classify
            
        Returns:
            Formatted prompt string
        """
        template = """Analyze the following citizen feedback and classify it into relevant categories and subcategories based on core friction points in the permit process.

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

Also determine:
- Permit Type: Which Boston permit this relates to (choose most relevant from: "Building - Short Form", "Building - Long Form", "Use of Premises", "Liquor License", "Common Victualler (Food Service)", "Entertainment License", "Street Occupancy", "Resident Parking", "Business Parking", "Fire Prevention", "Fire Alarm", "Place of Assembly", "Hot Work", "Tent Permit", "Food Truck", "Dumpster", "Excavation", "Driveway", "Sign Permit", "Electrical", "Plumbing", "Gas", "Other")
- Sentiment (Positive, Negative, or Neutral)
- Priority level (High, Medium, Low)
- Summary: 1-2 sentence condensed version
- Department: Which Boston city department should handle this (e.g., "Inspectional Services", "Licensing Board", "Public Works", "Fire Department", "Building Department", etc.)
- Urgency: Low, Medium, or High (based on time-sensitivity and impact)
- Impact Types: What types of impact this has (select from: "Time Lost", "Financial Cost", "Business Impact", "Safety Concern", "Legal/Compliance", "Customer Experience", "Project Delay")
- Language: Detected language code (e.g., "en", "es", "zh", etc.)

Feedback: {feedback}

Return ONLY a valid JSON object with this exact structure (no additional text):
{{
    "permit_type": "Permit Type Name",
    "category_map": {{
        "Category Name 1": ["Subcategory 1", "Subcategory 2"],
        "Category Name 2": ["Subcategory 3"]
    }},
    "sentiment": "Positive|Negative|Neutral",
    "priority": "High|Medium|Low",
    "ai_summary": "Brief 1-2 sentence summary of the core issue",
    "department_predicted": "Department Name",
    "urgency_level": "Low|Medium|High",
    "impact_type": ["Impact Type 1", "Impact Type 2"],
    "language": "en"
}}

Each category should map to its relevant subcategories. Only include categories and subcategories that apply to this feedback."""
        
        return template.format(feedback=feedback)
    
    @staticmethod
    def build_classification_system_message() -> str:
        """
        Build the system message for classification tasks.
        
        Returns:
            System message string
        """
        return "You are a government permit system feedback classification assistant for analyzing citizen feedback. You return only valid JSON responses."
    
    @staticmethod
    def build_chatbot_agent_prompt(context: str) -> str:
        """
        Build a prompt for the chatbot agent to evaluate feedback quality.
        
        Args:
            context: The conversation context including original feedback and history
            
        Returns:
            Formatted prompt string
        """
        template = """{context}

=== YOUR TASK ===
You are collecting data for policy analysis. Feedback must be specific to be actionable.

=== CONVERSATION CONTEXT ===
Above you can see:
1. The ORIGINAL FEEDBACK - what the citizen initially submitted
2. The CONVERSATION HISTORY (if any) - all questions you've asked (marked as "Question 1:", "Question 2:", etc.) and the answers received (marked as "Answer 1:", "Answer 2:", etc.)

IMPORTANT - How to use this context:
- If there's NO conversation history yet: This is the first turn. Evaluate the original feedback and ask your first question.
- If there IS conversation history: Review what questions you've already asked and what answers you received. Use this to:
  * Track what information has already been collected
  * Avoid asking questions you've already asked (check the Question numbers)
  * Build on previous answers to ask more specific follow-ups
  * Identify gaps in the information that still need to be filled
  * If the user has already provided sufficient detail across the conversation, mark needs_followup as false

=== REQUIRED INFORMATION ===
1. Permit Type - Which Boston permit applies
2. Problem Type - Cost, time, process, or policy issue
3. Concrete Details - Specific numbers, timeframes, or examples

VALID PERMIT TYPES:
"Building - Short Form", "Building - Long Form", "Use of Premises", "Liquor License", "Common Victualler (Food Service)", "Entertainment License", "Street Occupancy", "Resident Parking", "Business Parking", "Fire Prevention", "Fire Alarm", "Place of Assembly", "Hot Work", "Tent Permit", "Food Truck", "Dumpster", "Excavation", "Driveway", "Sign Permit", "Electrical", "Plumbing", "Gas", "Other"

PERMIT CLASSIFICATION HINTS:
- "renovation/construction" → Building permit
- "bar/restaurant/café" → Liquor License or Common Victualler
- "event/concert" → Entertainment License
- "parking" → Resident/Business Parking
- "digging/roadwork" → Excavation
- "sign/storefront" → Sign Permit
- "electrical/plumbing/gas" → Respective permits
- Unclear → Ask what activity/work they're describing

SUFFICIENT FEEDBACK (6+):
✓ "Building permit took 6 weeks, expected 2-3"
✓ "Liquor license fee was $500, seemed high"
✓ "Application form didn't explain when inspection was needed"

INSUFFICIENT (need follow-up):
✗ "It was expensive" → Ask: How much or what specifically?
✗ "Took too long" → Ask: How long or which step?
✗ Generic complaint → Ask: What specifically?

FOLLOW-UP STRATEGY:
- Evaluate the ENTIRE conversation (original feedback + all Q&A pairs) when scoring quality
- Ask ONE specific question per turn
- If already answered vaguely about a topic, ask about a DIFFERENT aspect
- If user says "I already told you", re-read the conversation - they likely DID provide the info
- Never ask the same question twice (check your Question numbers)
- Keep tone conversational and empathetic
- Consider ALL information collected so far - sometimes multiple answers together provide sufficient detail

QUALITY SCORING:
- 1-4: Single words, vague complaints
- 5: Has problem category OR permit but missing details
- 6-7: Has permit + problem type + ANY specific detail
- 8-9: Multiple specific details
- 10: Comprehensive, actionable data

Respond in JSON:
{{
  "needs_followup": true/false,
  "message": "your question or thank you message",
  "quality_score": 1-10
}}

IF ENOUGH DETAIL (score 6+):
- Set needs_followup to false
- Thank them: "Thank you - this is really helpful for improving the process!"

Respond in this JSON format:
{{
  "needs_followup": true/false,
  "message": "your question or thank you message",
  "quality_score": 1-10
}}

Quality score explanation (ANALYST STANDARDS - Be balanced):
- 1-2: Single words ("bad", "slow") or completely unintelligible
- 3-4: Vague complaints without specifics ("it was expensive", "took too long", "confusing process")
- 5: Has problem category but missing key details ("application fee was high" - how high? which permit?) OR has permit + vague problem
- 6-7: Has permit + problem type + ANY specific detail (timeframe OR cost OR process step)
       Examples: "Building permit took 8 weeks" or "Liquor license fee was $800" or "Application process was confusing"
- 8-9: Has permit + problem type + MULTIPLE specific details that can be analyzed
       Examples: "Building permit took 8 weeks, expected 3-4, mostly waiting for inspection"
- 10: Comprehensive, actionable data with permit, problem, specifics, and context
      Example: "Building permit for kitchen renovation cost $500 fee plus $300 for required fire inspection, took 6 weeks total with 4 weeks just waiting for inspection appointment"
"""
        
        return template.format(context=context)
    
    @staticmethod
    def build_spam_detection_prompt(feedback: str) -> str:
        """
        Build a prompt for detecting spam/outlandish/non-permit-related feedback.
        
        Args:
            feedback: The feedback text to check
            
        Returns:
            Formatted prompt string
        """
        template = """Analyze the following feedback and determine if it is:
1. SPAM - Random text, gibberish, promotional content, or completely unrelated to permits
2. OUTLANDISH - Clearly fake, trolling, or nonsensical content
3. NON-PERMIT-RELATED - Not related to Boston city permits, licenses, or government services at all

VALID PERMIT-RELATED TOPICS include:
- Building permits, construction, renovations
- Business licenses (liquor, food service, entertainment)
- Parking permits (resident, business)
- Fire department permits (hot work, fire alarms)
- Public works permits (excavation, dumpsters, street occupancy)
- Sign permits, electrical, plumbing, gas permits
- Any Boston city government permit or licensing process

INVALID (spam/outlandish/non-permit-related) examples:
- Random text: "asdfghjkl" or "test test test"
- Completely unrelated: "I love pizza", "Weather is nice today"
- Promotional/spam: "Buy now!", "Click here for deals"
- Trolling: "This system is stupid and you're all idiots" (without any permit context)
- Personal rants unrelated to permits: "My neighbor is annoying"

Feedback to analyze:
{feedback}

Return ONLY a valid JSON object:
{{
    "is_invalid": true/false,
    "reason": "Brief explanation (only if is_invalid is true)"
}}

is_invalid should be TRUE only if the feedback is clearly spam, outlandish, or completely unrelated to permits. Be lenient - if there's ANY possible connection to permits, mark as false."""
        
        return template.format(feedback=feedback)
    
    @staticmethod
    def build_chatbot_agent_system_message() -> str:
        """
        Build the system message for chatbot agent tasks.
        
        Returns:
            System message string
        """
        return """You are an intelligent feedback quality assistant for Boston city government permit processes. 

You can look up permit details using the get_boston_permit_context tool. Use it when you need info about permit types, processes, requirements, or common issues.

Available context categories:
- general_info: Boston permit contacts, portals, overview
- home_renovations: Kitchen, bathroom, basement, residential permits
- events_entertainment: Parties, venues, clubs, entertainment licenses
- restaurants_bars: Food businesses, liquor licenses, commercial kitchens
- construction_contractors: Hot work, dumpsters, contractor permits

You evaluate feedback and ask follow-up questions to improve detail quality. You always respond with valid JSON."""
    
    @staticmethod
    def build_segmentation_prompt(text: str) -> str:
        """
        Build a prompt for segmenting text into individual feedback items.
        
        Args:
            text: The raw text to segment into individual feedbacks
            
        Returns:
            Formatted prompt string
        """
        template = """Analyze the following text and break it down into individual, distinct feedback items. Each feedback should be a complete thought or complaint from a citizen about government permits/services.

Presume there are multiple feedbacks in the text and in rare cases there may be only one feedback.

Rules:
1. If the text contains multiple distinct feedback items, separate them. Usually a named person or business will precede a feedback.
2. If the text is one cohesive feedback, return it as a single item.
3. Each feedback should be substantial enough to be meaningful (at least a sentence).
4. If the feedbacks have a repeating structure (e.g., "Feedback: ...", "Issue: ...", "Complaint: ..."), use that structure to split them.
5. Preserve any mentioned business names, person names, or other identifying attributes exactly as they appear; they are part of the feedback context.

Response format: Return ONLY a valid JSON array. No explanations, markdown formatting, or other text.

Format examples:
- Multiple feedbacks: ["feedback1", "feedback2", "feedback3"]
- Single feedback: ["single_feedback"]

Text to analyze:
{text}"""
        
        return template.format(text=text)
    
    @staticmethod
    def build_segmentation_system_message() -> str:
        """
        Build the system message for text segmentation tasks.
        
        Returns:
            System message string
        """
        return "You are a text analysis system that identifies and segments individual feedback items within documents. You return only valid JSON arrays."
    
    @staticmethod
    def build_augmentation_prompt(original_feedback: str, conversation_history: list) -> str:
        """
        Build a prompt for augmenting feedback with conversation details.
        
        Args:
            original_feedback: The original feedback text
            conversation_history: List of conversation messages with role and content
            
        Returns:
            Formatted prompt string
        """
        # Format conversation history
        conversation_text = []
        for msg in conversation_history:
            if msg.role == "assistant":
                conversation_text.append(f"Question: {msg.content}")
            else:  # user
                conversation_text.append(f"Answer: {msg.content}")
        
        conversation_formatted = "\n".join(conversation_text)
        
        template = """Summarize the following chatbot conversation into a brief, coherent additional note.

Original Feedback:
{original_feedback}

Chatbot Conversation:
{conversation}

Task: Summarize the conversation answers into a concise note (2-4 sentences) that captures the key additional details provided.

Requirements:
- Write ONLY the summary of what was discussed in the conversation
- DO NOT repeat or reference the original feedback
- Present it as a natural, flowing note with the additional context
- Focus on key specifics: timing, location, steps taken, errors, expectations, permit types, etc.
- Don't mention "questions", "conversation", or "the user said" - just state the facts
- NEVER assume or make up any information not explicitly stated in the conversation
- Only include details that were directly provided by the user
- Do not infer or conclude anything from the conversation - only summarize the facts

Return ONLY the augmented feedback text. No JSON, no explanations, just the enhanced feedback message."""
        
        return template.format(
            original_feedback=original_feedback,
            conversation=conversation_formatted
        )
    
    @staticmethod
    def build_augmentation_system_message() -> str:
        """
        Build the system message for feedback augmentation tasks.
        
        Returns:
            System message string
        """
        return "You are a professional writing assistant that specializes in synthesizing information from multiple sources into coherent, well-structured feedback messages."


# Create a singleton instance for easy access
prompt_builder = PromptBuilder()

