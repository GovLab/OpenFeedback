"""
Script to create test feedback data with different config versions.
Run with: python create_test_feedback.py
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.postgres_db import postgres_db
import uuid

# Test feedback data
test_feedbacks = [
    {
        "issue_description": "The building permit application process is too complicated and takes forever.",
        "permit_type": "Building - Long Form",
        "category": "Process & Operational Flow Issues",
        "subcategory": "Delays or Waiting Too Long",
        "ai_summary": "Citizen frustrated with lengthy and complex building permit application process.",
        "department_predicted": "Building Department",
        "sentiment_score": -0.7,
        "urgency_level": "High",
        "impact_type": ["Time Lost", "Project Delay"],
        "language": "en",
        "status": "New",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "I can't afford the permit fees. They're too expensive for small businesses.",
        "permit_type": "Building - Short Form",
        "category": "Economic & Equity Concerns",
        "subcategory": "High or Unexpected Costs",
        "ai_summary": "Small business owner concerned about high permit fees affecting affordability.",
        "department_predicted": "Inspectional Services",
        "sentiment_score": -0.8,
        "urgency_level": "High",
        "impact_type": ["Financial Cost", "Business Impact"],
        "language": "en",
        "status": "New",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "The online portal keeps crashing when I try to upload documents.",
        "permit_type": "Use of Premises",
        "category": "Technology & Access Barriers",
        "subcategory": "Technical / Portal Problems",
        "ai_summary": "Technical issues with document upload functionality on permit portal.",
        "department_predicted": "Inspectional Services",
        "sentiment_score": -0.6,
        "urgency_level": "Medium",
        "impact_type": ["Time Lost", "Customer Experience"],
        "language": "en",
        "status": "New",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "The permit office never responds to my emails. I've been waiting for weeks.",
        "permit_type": "Liquor License",
        "category": "Communication & Service Problems",
        "subcategory": "Service Responsiveness & Transparency",
        "ai_summary": "Lack of communication and delayed response from permit office.",
        "department_predicted": "Licensing Board",
        "sentiment_score": -0.7,
        "urgency_level": "High",
        "impact_type": ["Time Lost", "Business Impact"],
        "language": "en",
        "status": "Routed",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "The rules are confusing. I don't know which permit I need for my food truck.",
        "permit_type": "Food Truck",
        "category": "Policy & Rules Clarity",
        "subcategory": "Outdated or Unclear Rules",
        "ai_summary": "Confusion about which permit type is required for food truck operation.",
        "department_predicted": "Licensing Board",
        "sentiment_score": -0.5,
        "urgency_level": "Medium",
        "impact_type": ["Time Lost", "Customer Experience"],
        "language": "en",
        "status": "New",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "Great experience! The new online system made it so easy to apply.",
        "permit_type": "Sign Permit",
        "category": "Communication & Service Problems",
        "subcategory": "Poor Communication / Experience",
        "ai_summary": "Positive feedback about improved online permit application system.",
        "department_predicted": "Inspectional Services",
        "sentiment_score": 0.7,
        "urgency_level": "Low",
        "impact_type": ["Customer Experience"],
        "language": "en",
        "status": "Closed",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "I had to visit three different departments for one permit. This is ridiculous.",
        "permit_type": "Building - Long Form",
        "category": "Process & Operational Flow Issues",
        "subcategory": "Conflicting Departments / Redundant Steps",
        "ai_summary": "Frustration with redundant steps requiring multiple department visits.",
        "department_predicted": "Building Department",
        "sentiment_score": -0.8,
        "urgency_level": "High",
        "impact_type": ["Time Lost", "Customer Experience"],
        "language": "en",
        "status": "In Progress",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "The fire department inspection was thorough and professional. Very satisfied.",
        "permit_type": "Fire Prevention",
        "category": "Communication & Service Problems",
        "subcategory": "Poor Communication / Experience",
        "ai_summary": "Positive experience with fire department inspection process.",
        "department_predicted": "Fire Department",
        "sentiment_score": 0.8,
        "urgency_level": "Low",
        "impact_type": ["Customer Experience"],
        "language": "en",
        "status": "Closed",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "I don't speak English well. There's no Spanish support on the website.",
        "permit_type": "Resident Parking",
        "category": "Technology & Access Barriers",
        "subcategory": "Digital Access & Portal Problems",
        "ai_summary": "Language barrier preventing access to permit application system.",
        "department_predicted": "Public Works",
        "sentiment_score": -0.6,
        "urgency_level": "Medium",
        "impact_type": ["Access or Fairness Barriers", "Customer Experience"],
        "language": "es",
        "status": "New",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
    {
        "issue_description": "The permit was approved quickly and the staff was very helpful.",
        "permit_type": "Electrical",
        "category": "Communication & Service Problems",
        "subcategory": "Service Responsiveness & Transparency",
        "ai_summary": "Positive feedback about quick approval and helpful staff.",
        "department_predicted": "Inspectional Services",
        "sentiment_score": 0.7,
        "urgency_level": "Low",
        "impact_type": ["Customer Experience"],
        "language": "en",
        "status": "Closed",
        "feedback_source": "OpenPermit",
        "timestamp_processed": datetime.now(),
    },
]

def create_test_feedback():
    """Create test feedback entries with different config versions."""
    
    if postgres_db.engine is None:
        print("❌ PostgreSQL database not connected. Please check your connection.")
        return
    
    print("\n" + "=" * 60)
    print("CREATING TEST FEEDBACK DATA")
    print("=" * 60 + "\n")
    
    # Distribute feedback across versions 1, 2, and 3
    # Version 1: first 4 feedbacks
    # Version 2: next 3 feedbacks
    # Version 3: last 3 feedbacks
    
    version_distribution = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3]
    
    created_count = 0
    
    for i, feedback_data in enumerate(test_feedbacks):
        config_version = version_distribution[i]
        
        # Generate unique feedback ID
        feedback_id = str(uuid.uuid4())
        
        # Set timestamp_submitted to be slightly different for each feedback
        feedback_data["timestamp_submitted"] = datetime.now() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))
        
        try:
            # Insert feedback with specific config_version
            postgres_id = postgres_db.add_feedback(
                feedback_data, 
                feedback_id=feedback_id,
                config_version=config_version
            )
            
            print(f"✓ Created feedback {i+1}/10")
            print(f"  ID: {postgres_id}")
            print(f"  Config Version: {config_version}")
            print(f"  Permit Type: {feedback_data['permit_type']}")
            print(f"  Category: {feedback_data['category']}")
            print()
            
            created_count += 1
            
        except Exception as e:
            print(f"❌ Failed to create feedback {i+1}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("=" * 60)
    print(f"✅ Successfully created {created_count}/10 test feedback entries")
    print("=" * 60)
    print("\nVersion Distribution:")
    print(f"  Version 1: {version_distribution.count(1)} feedbacks")
    print(f"  Version 2: {version_distribution.count(2)} feedbacks")
    print(f"  Version 3: {version_distribution.count(3)} feedbacks")
    print()

if __name__ == "__main__":
    create_test_feedback()

