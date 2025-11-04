"""Test PostgreSQL connection and basic operations."""
from app.postgres_db import postgres_db

def test_connection():
    """Test PostgreSQL connection and basic operations."""
    
    print("🔌 Testing PostgreSQL connection...")
    
    try:
        # Test adding feedback
        feedback_data = {
            "issue_description": "Test feedback: The permit process took too long",
            "category": "Delays",
            "permit_type": "Building - Short Form",
            "sentiment_score": -0.5,
            "status": "New",
            "feedback_source": "OpenPermit"
        }
        
        feedback_id = postgres_db.add_feedback(feedback_data)
        print(f"✅ Created feedback: {feedback_id}")
        
        # Test retrieving feedback
        feedback = postgres_db.get_feedback(feedback_id)
        if feedback:
            print(f"✅ Retrieved feedback: {feedback['issue_description']}")
            print(f"   Category: {feedback['category']}")
            print(f"   Permit Type: {feedback['permit_type']}")
            print(f"   Sentiment: {feedback['sentiment_score']}")
        else:
            print("❌ Failed to retrieve feedback")
            return
        
        print("\n🎉 PostgreSQL integration working!")
        print(f"\n💡 Tip: Check your database in pgAdmin to see the record with ID: {feedback_id}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nTroubleshooting:")
        print("1. Check your .env file has correct PostgreSQL credentials")
        print("2. Verify PostgreSQL is running")
        print("3. Ensure you ran schema.sql in pgAdmin")
        print("4. Check database name matches in .env")

if __name__ == "__main__":
    test_connection()

