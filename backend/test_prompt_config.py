"""
Test script for the combined prompt configuration method.
Run this to verify that build_classification_prompt_from_config works correctly.
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.prompts import prompt_builder


def test_with_defaults():
    """Test 1: Verify method works with None (uses hardcoded defaults)"""
    print("=" * 60)
    print("TEST 1: Testing with config_data=None (should use defaults)")
    print("=" * 60)
    
    feedback = "The permit process is too slow and confusing."
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=None)
    
    # Check that prompt contains expected default values
    assert "Economic & Equity Concerns" in prompt, "Should contain default category"
    assert "Building - Short Form" in prompt, "Should contain default permit type"
    assert "Inspectional Services" in prompt, "Should contain default department"
    assert feedback in prompt, "Should contain feedback text"
    
    print("✓ Prompt generated successfully with defaults")
    print(f"✓ Prompt length: {len(prompt)} characters")
    print(f"✓ Contains feedback: {feedback[:50]}...")
    print()


def test_with_custom_config():
    """Test 2: Verify method works with custom config_data"""
    print("=" * 60)
    print("TEST 2: Testing with custom config_data")
    print("=" * 60)
    
    custom_config = {
        'categories': [
            {'name': 'Test Category', 'subcategories': ['Test Sub 1', 'Test Sub 2']},
            {'name': 'Another Category', 'subcategories': ['Sub A']}
        ],
        'permit_types': ['Custom Permit A', 'Custom Permit B'],
        'departments': ['Custom Department'],
        'impact_types': ['Custom Impact'],
        'sentiment_options': ['Happy', 'Sad'],
        'priority_levels': ['Critical'],
        'urgency_levels': ['Very High']
    }
    
    feedback = "This is a test feedback message."
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=custom_config)
    
    # Check that prompt contains custom values
    assert "Test Category" in prompt, "Should contain custom category"
    assert "Test Sub 1" in prompt, "Should contain custom subcategory"
    assert "Custom Permit A" in prompt, "Should contain custom permit type"
    assert "Custom Department" in prompt, "Should contain custom department"
    assert "Happy|Sad" in prompt, "Should contain custom sentiment options"
    assert feedback in prompt, "Should contain feedback text"
    
    print("✓ Prompt generated successfully with custom config")
    print(f"✓ Contains custom category: 'Test Category'")
    print(f"✓ Contains custom permit type: 'Custom Permit A'")
    print(f"✓ Contains custom sentiment: 'Happy|Sad'")
    print()


def test_with_empty_config():
    """Test 3: Verify method handles empty/missing keys gracefully"""
    print("=" * 60)
    print("TEST 3: Testing with empty config (missing keys)")
    print("=" * 60)
    
    empty_config = {}
    feedback = "Test feedback"
    
    try:
        prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=empty_config)
        # Should still work, using empty lists/defaults
        assert feedback in prompt, "Should contain feedback text"
        print("✓ Prompt generated successfully with empty config")
        print("✓ Method handles missing keys gracefully")
    except Exception as e:
        print(f"✗ Error with empty config: {e}")
        raise
    print()


def test_prompt_structure():
    """Test 4: Verify prompt has correct structure"""
    print("=" * 60)
    print("TEST 4: Verifying prompt structure")
    print("=" * 60)
    
    feedback = "The portal crashed when I tried to submit my application."
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=None)
    
    # Check for required sections
    required_sections = [
        "Available Categories and Subcategories",
        "Permit Type",
        "Sentiment",
        "Priority level",
        "Department",
        "Urgency",
        "Impact Types",
        "Language",
        "Return ONLY a valid JSON object"
    ]
    
    for section in required_sections:
        assert section in prompt, f"Prompt should contain: {section}"
        print(f"✓ Contains section: '{section}'")
    
    print()


def show_prompt_preview():
    """Show a preview of the generated prompt"""
    print("=" * 60)
    print("PROMPT PREVIEW (first 500 chars)")
    print("=" * 60)
    
    feedback = "The permit process took 3 months and cost $5000. Very frustrating!"
    prompt = prompt_builder.build_classification_prompt_from_config(feedback, config_data=None)
    
    print(prompt[:500])
    print("...")
    print()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("TESTING PROMPT CONFIGURATION METHOD")
    print("=" * 60 + "\n")
    
    try:
        test_with_defaults()
        test_with_custom_config()
        test_with_empty_config()
        test_prompt_structure()
        show_prompt_preview()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Test with real database config:")
        print("   - Start your backend server")
        print("   - Update config via API: PUT /api/config")
        print("   - Submit feedback: POST /api/feedback")
        print("   - Check logs to see which config was used")
        print("\n2. Test end-to-end:")
        print("   - Create a test config with unique values")
        print("   - Classify feedback")
        print("   - Verify classification uses your custom values")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

