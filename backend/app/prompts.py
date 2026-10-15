from typing import Optional

from .config import topic


class PromptBuilder:
    """
    Builder class for constructing AI prompts with dynamic placeholders.
    Each method returns a formatted prompt string with the provided kwargs.
    """
    
    @staticmethod
    def build_classification_prompt_from_config(feedback: str, config_data: dict = None) -> str:
        """
        Build a classification prompt using dynamic configuration data or hardcoded defaults.
        
        Args:
            feedback: The user feedback text to classify
            config_data: Optional dictionary containing system configuration. If None, uses hardcoded defaults.
            
        Returns:
            Formatted prompt string with dynamic values from config or defaults
        """
        # Default hardcoded values (fallback)
        default_config = {
            'categories': [
                {'name': 'Economic & Equity Concerns', 'subcategories': ['High or Unexpected Costs', 'Access or Fairness Barriers']},
                {'name': 'Communication & Service Problems', 'subcategories': ['Poor Communication / Experience', 'Service Responsiveness & Transparency']},
                {'name': 'Technology & Access Barriers', 'subcategories': ['Technical / Portal Problems', 'Digital Access & Portal Problems']},
                {'name': 'Process & Operational Flow Issues', 'subcategories': ['Confusion or Missing Guidance', 'Delays or Waiting Too Long', 'Conflicting Departments / Redundant Steps', 'Procedural & Coordination Issues']},
                {'name': 'Policy & Rules Clarity', 'subcategories': ['Outdated or Unclear Rules', 'Rules & Policy Gaps']}
            ],
            'permit_types': ['Building - Short Form', 'Building - Long Form', 'Use of Premises', 'Liquor License', 'Common Victualler (Food Service)', 'Entertainment License', 'Street Occupancy', 'Resident Parking', 'Business Parking', 'Fire Prevention', 'Fire Alarm', 'Place of Assembly', 'Hot Work', 'Tent Permit', 'Food Truck', 'Dumpster', 'Excavation', 'Driveway', 'Sign Permit', 'Electrical', 'Plumbing', 'Gas', 'Other'],
            'departments': ['Inspectional Services', 'Licensing Board', 'Public Works', 'Fire Department', 'Building Department'],
            'impact_types': ['Time Lost', 'Financial Cost', 'Business Impact', 'Safety Concern', 'Legal/Compliance', 'Customer Experience', 'Project Delay'],
            'sentiment_options': ['Positive', 'Negative', 'Neutral'],
            'priority_levels': ['High', 'Medium', 'Low'],
            'urgency_levels': ['Low', 'Medium', 'High']
        }
        
        # Use provided config or defaults
        if config_data is None:
            config_data = default_config
        
        # Build categories section from config
        categories_section = []
        for idx, category in enumerate(config_data.get('categories', []), 1):
            category_name = category.get('name', '')
            subcategories = category.get('subcategories', [])
            if subcategories:
                subcat_list = '\n   - '.join([''] + subcategories)
            else:
                subcat_list = '\n   - (No subcategories)'
            categories_section.append(f"{idx}. {category_name}:{subcat_list}")
        
        categories_text = '\n\n'.join(categories_section) if categories_section else "No categories configured."
        
        # Build permit types list
        permit_types = config_data.get('permit_types', [])
        permit_types_text = ', '.join([f'"{pt}"' for pt in permit_types]) if permit_types else '"Other"'
        
        # Build departments list
        departments = config_data.get('departments', [])
        departments_text = ', '.join([f'"{dept}"' for dept in departments]) if departments else "Various departments"
        
        # Build impact types list
        impact_types = config_data.get('impact_types', [])
        impact_types_text = ', '.join([f'"{it}"' for it in impact_types]) if impact_types else "Various impacts"
        
        # Get sentiment and priority options
        sentiment_options = config_data.get('sentiment_options', ['Positive', 'Negative', 'Neutral'])
        priority_levels = config_data.get('priority_levels', ['High', 'Medium', 'Low'])
        urgency_levels = config_data.get('urgency_levels', ['Low', 'Medium', 'High'])
        
        template = """Analyze the following citizen feedback about {subject} and classify it into relevant categories and subcategories based on the core problems it describes.
Note: If feedback is vague or lacks detail, make your best assessment based on available information without spending excessive time trying to infer missing context.

Available Categories and Subcategories:

{categories}

Also determine:
- {item_label}: {item_question} (choose most relevant from: {permit_types})
- Sentiment ({sentiment_options})
- Priority level ({priority_levels})
- Summary: 1-2 sentence condensed version
- Department: Which Boston city department should handle this (e.g., {departments}, etc.)
- Urgency ({urgency_levels}) - based on time-sensitivity and impact
- Impact Types: What types of impact this has (select from: {impact_types})
- Language: Detected language code (e.g., "en", "es", "zh", etc.)

Feedback: {feedback}

Return ONLY a valid JSON object with this exact structure (no additional text):
{{
    "permit_type": "{item_label} Name",
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
        
        return template.format(
            subject=topic.subject,
            item_label=topic.item_label,
            item_question=topic.item_question,
            feedback=feedback,
            categories=categories_text,
            permit_types=permit_types_text,
            sentiment_options='|'.join(sentiment_options),
            priority_levels='|'.join(priority_levels),
            departments=departments_text,
            urgency_levels='|'.join(urgency_levels),
            impact_types=impact_types_text
        )
    
    @staticmethod
    def build_classification_system_message() -> str:
        """
        Build the system message for classification tasks.
        
        Returns:
            System message string
        """
        return f"You are a city government feedback classification assistant for analyzing citizen feedback about {topic.subject}. You return only valid JSON responses."
    
    @staticmethod
    def build_chatbot_agent_prompt(context: str, item_types: list) -> str:
        """
        Build a prompt for the chatbot agent to evaluate feedback quality.
        
        Args:
            context: The conversation context including original feedback and history
            item_types: Valid item types (permit types, park features) from the active config
            
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
{required_info}

VALID {item_label_upper}S:
{item_types}

{item_label_upper} CLASSIFICATION HINTS:
{item_hints}

SUFFICIENT FEEDBACK (6+):
{sufficient_examples}

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
- 5: Has problem category OR {item_label_lower} but missing details
- 6-7: Has {item_label_lower} + problem type + ANY specific detail
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
- Thank them: "Thank you - this is really helpful for making things better!"

Respond in this JSON format:
{{
  "needs_followup": true/false,
  "message": "your question or thank you message",
  "quality_score": 1-10
}}

Quality score explanation (ANALYST STANDARDS - Be balanced):
{quality_scoring}
"""
        
        return template.format(
            context=context,
            required_info=topic.required_info,
            item_label_upper=topic.item_label.upper(),
            item_label_lower=topic.item_label.lower(),
            item_types=", ".join(f'"{item}"' for item in item_types) or '"Other"',
            item_hints=topic.item_hints,
            sufficient_examples=topic.sufficient_examples,
            quality_scoring=topic.quality_scoring,
        )
    
    @staticmethod
    def build_spam_detection_prompt(feedback: str) -> str:
        """
        Build a prompt for detecting spam, outlandish or off-topic feedback.
        
        Args:
            feedback: The feedback text to check
            
        Returns:
            Formatted prompt string
        """
        template = """Analyze the following feedback and determine if it is:
1. SPAM - Random text, gibberish, promotional content, or completely unrelated to {subject}
2. OUTLANDISH - Clearly fake, trolling, or nonsensical content
3. OFF-TOPIC - Not related to {subject} or city government services at all

VALID TOPICS include:
{valid_topics}

INVALID (spam/outlandish/off-topic) examples:
{invalid_examples}

Feedback to analyze:
{feedback}

Return ONLY a valid JSON object:
{{
    "is_invalid": true/false,
    "kind": "off_topic" | "spam" | "abusive" | "unclear" (only if is_invalid is true),
    "reason": "Brief explanation (only if is_invalid is true)"
}}

is_invalid should be TRUE only if the feedback is clearly spam, outlandish, or completely unrelated to {subject}. Be lenient - if there's ANY possible connection, mark as false."""
        
        return template.format(
            feedback=feedback,
            subject=topic.subject,
            valid_topics=topic.valid_topics,
            invalid_examples=topic.invalid_examples,
        )
    
    @staticmethod
    def build_chatbot_agent_system_message() -> str:
        """
        Build the system message for chatbot agent tasks.
        
        Returns:
            System message string
        """
        categories = "\n".join(f"- {name}: {description}" for name, description in topic.context_categories.items())
        return f"""{topic.chatbot_role}

Background notes may be included below, chosen from these categories:
{categories}

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
        template = """Analyze the following text and break it down into individual, distinct feedback items. Each feedback should be a complete thought or complaint from a citizen about {subject}.

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
        
        return template.format(text=text, subject=topic.subject)
    
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
- Focus on key specifics: timing, location, steps taken, errors, expectations, locations, etc.
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

