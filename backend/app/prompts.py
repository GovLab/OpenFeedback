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

Determine if the feedback has enough actionable detail, and if not, ask ONE follow-up question.

DECISION CRITERIA:
- Feedback NEEDS more detail if it's vague, lacks specifics about: which permit type, how long it's been, location/address, specific step/action, what went wrong, error messages, or what the user expected vs. what happened
- Feedback is SUFFICIENT when you can understand: the specific issue, when/where it occurred, what permit/process it relates to, and what the user attempted
- Examples of INSUFFICIENT: "this is slow", "broken", "confusing", "doesn't work", "had a problem", "it's bad"
- Examples of SUFFICIENT: "Building permit application submitted 3 weeks ago for 123 Main St, still pending review", "Website crashed with error code 500 when I tried uploading my ID on Chrome yesterday at 2pm"
- Ask targeted questions that get one key missing piece: (1) Which permit? (2) When did this happen? (3) What step were you on? (4) What error did you see? (5) What did you expect to happen?

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
        
        return template.format(context=context)
    
    @staticmethod
    def build_chatbot_agent_system_message() -> str:
        """
        Build the system message for chatbot agent tasks.
        
        Returns:
            System message string
        """
        return "You are an intelligent feedback quality assistant for Boston city government permit processes. You evaluate feedback and ask follow-up questions to improve detail quality. You always respond with valid JSON."
    
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


# Create a singleton instance for easy access
prompt_builder = PromptBuilder()

