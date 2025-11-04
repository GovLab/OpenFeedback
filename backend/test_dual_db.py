"""Test dual database integration (PostgreSQL + Neo4j)."""
from app.postgres_db import postgres_db
from app.database import db

def test_dual_database():
    """Test that both databases are connected and working."""
    
    print("🔍 Testing Dual Database Integration\n")
    
    # Test PostgreSQL
    print("1️⃣ Testing PostgreSQL...")
    try:
        postgres_data = {
            "issue_description": "Test: Building permit process is confusing",
            "category": "Process Issues",
            "subcategory": "Confusion",
            "sentiment_score": -0.3,
            "status": "New",
            "feedback_source": "OpenPermit"
        }
        postgres_id = postgres_db.add_feedback(postgres_data)
        print(f"   ✅ PostgreSQL working! ID: {postgres_id}")
        
        # Retrieve it
        retrieved = postgres_db.get_feedback(postgres_id)
        if retrieved:
            print(f"   ✅ Retrieved: {retrieved['issue_description'][:50]}...")
        
    except Exception as e:
        print(f"   ❌ PostgreSQL error: {e}")
        return False
    
    # Test Neo4j
    print("\n2️⃣ Testing Neo4j...")
    try:
        from app.models import ClassifiedFeedback
        
        neo4j_data = ClassifiedFeedback(
            text="Test: Building permit approval takes too long",
            category_map={"Delays": ["Approval Time"]},
            sentiment="negative"
        )
        neo4j_id = db.add_feedback(neo4j_data)
        print(f"   ✅ Neo4j working! ID: {neo4j_id}")
        
        # Get graph stats
        total = db.get_feedback_count()
        print(f"   ✅ Total feedback in Neo4j: {total}")
        
    except Exception as e:
        print(f"   ❌ Neo4j error: {e}")
        return False
    
    print("\n🎉 Both databases working correctly!")
    print("\n📊 Summary:")
    print(f"   PostgreSQL: Storing full feedback data")
    print(f"   Neo4j: Storing graph relationships")
    print(f"\n💡 Next: Start your FastAPI server and submit feedback through the UI")
    print(f"   Both databases will be updated automatically!")
    
    return True

if __name__ == "__main__":
    test_dual_database()

