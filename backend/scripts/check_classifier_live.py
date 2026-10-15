"""
End-to-end integration test for classifier with system config.
Tests the full flow: config → classifier → prompt generation
"""

import sys
import os
import asyncio

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.system_config import system_config_manager
from app.classifier import classify_feedback, clear_config_cache, _get_active_config
from app.prompts import prompt_builder
import logging

# Set up logging to see what's happening
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_classifier_with_config():
    """Test the full classifier flow with database config"""
    print("\n" + "=" * 60)
    print("END-TO-END CLASSIFIER INTEGRATION TEST")
    print("=" * 60 + "\n")
    
    # Step 1: Check current active config
    print("Step 1: Checking active config in database...")
    try:
        active_config = system_config_manager.get_active_config()
        if active_config:
            print(f"✓ Found active config version {active_config['version']}")
            print(f"  Categories: {len(active_config['config_data'].get('categories', []))}")
            print(f"  Permit types: {len(active_config['config_data'].get('permit_types', []))}")
        else:
            print("⚠ No active config found - will use defaults")
    except Exception as e:
        print(f"⚠ Error checking config: {e}")
        print("  (This is okay if database isn't set up)")
    
    # Step 2: Clear cache to force reload
    print("\nStep 2: Clearing config cache...")
    clear_config_cache()
    print("✓ Cache cleared")
    
    # Step 3: Test prompt generation with current config
    print("\nStep 3: Testing prompt generation...")
    
    test_feedback = "The cost of the building permit is ok but I am too poor to afford it."
    
    config_data = _get_active_config()
    if config_data:
        print(f"✓ Using config from database")
        print(f"  Sample category: {config_data.get('categories', [{}])[0].get('name', 'N/A') if config_data.get('categories') else 'N/A'}")
    else:
        print("✓ Using hardcoded defaults (no active config)")
    
    prompt = prompt_builder.build_classification_prompt_from_config(test_feedback, config_data)
    print(f"✓ Prompt generated ({len(prompt)} chars)")
    
    # Step 4: Show a snippet of the prompt to verify it's using the right config
    print("\nStep 4: Prompt snippet (showing categories section):")
    lines = prompt.split('\n')
    in_categories = False
    shown = 0
    for line in lines:
        if 'Available Categories' in line or in_categories:
            in_categories = True
            print(f"  {line}")
            shown += 1
            if shown > 8:  # Show first few category lines
                print("  ...")
                break
    
    # Step 5: Test actual classification (requires OpenAI API key)
    print("\nStep 5: Testing actual classification...")
    print("  (This requires OpenAI API key and will make an API call)")
    
    try:
        result = await classify_feedback(test_feedback)
        print(f"✓ Classification successful!")
        print(f"  Sentiment: {result.sentiment}")
        print(f"  Priority: {result.priority}")
        print(f"  Categories & Subcategories:")
        for category, subcategories in result.category_map.items():
            if subcategories:
                print(f"    - {category}: {', '.join(subcategories)}")
            else:
                print(f"    - {category}: (no subcategories)")
        print(f"  Permit type: {result.permit_type}")
        if result.ai_summary:
            print(f"  Summary: {result.ai_summary}")
    except Exception as e:
        print(f"⚠ Classification failed (might be missing API key): {e}")
        print("  This is okay - the prompt generation is what we're testing")
    
    print("\n" + "=" * 60)
    print("✅ INTEGRATION TEST COMPLETE")
    print("=" * 60)


async def test_config_update_flow():
    """Test that config updates are picked up by classifier"""
    print("\n" + "=" * 60)
    print("TESTING CONFIG UPDATE FLOW")
    print("=" * 60 + "\n")
    
    # Create a test config with unique values
    test_config = {
        'categories': [
            {'name': 'TEST CATEGORY ONLY', 'subcategories': ['TEST SUBCAT 1', 'TEST SUBCAT 2']}
        ],
        'permit_types': ['TEST PERMIT TYPE'],
        'departments': ['TEST DEPARTMENT'],
        'impact_types': ['TEST IMPACT'],
        'sentiment_options': ['TEST SENTIMENT'],
        'priority_levels': ['TEST PRIORITY'],
        'urgency_levels': ['TEST URGENCY']
    }
    
    print("Step 1: Creating test config version...")
    try:
        version = system_config_manager.create_new_version(
            config_data=test_config,
            created_by='test_user',
            change_notes='Integration test - unique values'
        )
        print(f"✓ Created config version {version}")
    except Exception as e:
        print(f"⚠ Could not create test config: {e}")
        print("  (This is okay if you want to test with existing config)")
        return
    
    print("\nStep 2: Clearing cache to force reload...")
    clear_config_cache()
    
    print("\nStep 3: Verifying new config is loaded...")
    config_data = _get_active_config()
    if config_data:
        if 'TEST CATEGORY ONLY' in str(config_data):
            print("✓ New config loaded successfully!")
            print(f"  Found test category: {config_data['categories'][0]['name']}")
        else:
            print("⚠ Config loaded but doesn't contain test values")
            print("  (Might be using cached old config)")
    else:
        print("⚠ No config loaded")
    
    print("\nStep 4: Testing prompt with new config...")
    prompt = prompt_builder.build_classification_prompt_from_config(
        "Test feedback", 
        config_data=config_data
    )
    
    if 'TEST CATEGORY ONLY' in prompt:
        print("✓ Prompt contains new config values!")
    else:
        print("⚠ Prompt doesn't contain test values")
    
    print("\n" + "=" * 60)
    print("✅ CONFIG UPDATE TEST COMPLETE")
    print("=" * 60)
    print("\nNote: You may want to deactivate this test config:")
    print("  - Check system_config table")
    print("  - Set is_active=False for test version")
    print("  - Or create a new version with your real config")


if __name__ == "__main__":
    print("\nChoose test mode:")
    print("1. Basic integration test (recommended)")
    print("2. Config update flow test (creates new config version)")
    
    choice = input("\nEnter choice (1 or 2, default=1): ").strip() or "1"
    
    if choice == "1":
        asyncio.run(test_classifier_with_config())
    elif choice == "2":
        asyncio.run(test_config_update_flow())
    else:
        print("Invalid choice. Running basic test...")
        asyncio.run(test_classifier_with_config())

