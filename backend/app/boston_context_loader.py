"""
Loader for Boston permit context files.
AI agent can call this to load specific permit information.
"""

from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Context files directory
CONTEXT_DIR = Path(__file__).parent / "boston_context"


def load_boston_context(category: str) -> str:
    """
    Load a specific Boston permit context file.
    
    Args:
        category: One of: general_info, home_renovations, events_entertainment, 
                  restaurants_bars, construction_contractors
    
    Returns:
        Content of the context file
    """
    filename = f"{category}.txt"
    
    try:
        filepath = CONTEXT_DIR / filename
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                content = f.read()
                logger.info(f"Loaded Boston context file: {category}")
                return content
        else:
            logger.warning(f"Context file not found: {filename}")
            return f"Context file '{category}' not found."
    except Exception as e:
        logger.error(f"Error loading context file {filename}: {str(e)}")
        return f"Error loading context: {str(e)}"

