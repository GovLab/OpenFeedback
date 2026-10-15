"""
Script to fix orphaned feedback records (feedback with config_version that doesn't exist in system_config).
Run with: python fix_orphaned_feedback.py
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.postgres_db import postgres_db
from sqlalchemy import text

def find_orphaned_feedback():
    """Find feedback records with config_version that doesn't exist in system_config."""
    
    if postgres_db.engine is None:
        print("❌ PostgreSQL database not connected. Please check your connection.")
        return
    
    print("\n" + "=" * 60)
    print("FINDING ORPHANED FEEDBACK RECORDS")
    print("=" * 60 + "\n")
    
    try:
        with postgres_db.get_session() as session:
            # First, let's check what versions exist in system_config
            config_versions_result = session.execute(
                text("SELECT version FROM system_config ORDER BY version")
            )
            config_versions = [row[0] for row in config_versions_result.fetchall()]
            print(f"📋 Config versions in system_config: {config_versions}\n")
            
            # Check what config_versions exist in feedback2
            feedback_versions_result = session.execute(
                text("SELECT DISTINCT config_version FROM feedback2 WHERE config_version IS NOT NULL ORDER BY config_version")
            )
            feedback_versions = [row[0] for row in feedback_versions_result.fetchall()]
            print(f"📋 Config versions in feedback2: {feedback_versions}\n")
            
            # Show count of feedback per version
            if feedback_versions:
                print("📊 Feedback count per version:")
                for version in feedback_versions:
                    count_result = session.execute(
                        text("SELECT COUNT(*) FROM feedback2 WHERE config_version = :version"),
                        {"version": version}
                    )
                    count = count_result.scalar()
                    exists_in_config = version in config_versions
                    status = "✓" if exists_in_config else "⚠️ ORPHANED"
                    print(f"  Version {version}: {count} feedback record(s) {status}")
                print()
            
            # Find orphaned feedback with config_version that doesn't exist in system_config
            result = session.execute(
                text("""
                    SELECT f.feedback_id, f.config_version, f.issue_description, f.timestamp_submitted
                    FROM feedback2 f
                    LEFT JOIN system_config sc ON f.config_version = sc.version
                    WHERE f.config_version IS NOT NULL
                    AND sc.version IS NULL
                    ORDER BY f.config_version, f.timestamp_submitted DESC
                """)
            )
            
            orphaned = result.fetchall()
            
            if not orphaned:
                print("✅ No orphaned feedback records found!")
                print("\n💡 This means all feedback.config_version values exist in system_config.")
                return
            
            print(f"⚠️  Found {len(orphaned)} orphaned feedback record(s):\n")
            
            # Group by version
            by_version = {}
            for row in orphaned:
                version = row[1]
                if version not in by_version:
                    by_version[version] = []
                by_version[version].append(row)
            
            for version, records in sorted(by_version.items()):
                print(f"  Version {version}: {len(records)} feedback record(s)")
                for record in records[:3]:  # Show first 3
                    print(f"    - {record[0]}: {record[2][:50]}...")
                if len(records) > 3:
                    print(f"    ... and {len(records) - 3} more")
                print()
            
            return orphaned, by_version
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None

def fix_orphaned_feedback(strategy="null"):
    """
    Fix orphaned feedback records.
    
    Args:
        strategy: "null" to set config_version to NULL, or "recreate" to recreate missing versions
    """
    
    orphaned, by_version = find_orphaned_feedback()
    
    if not orphaned:
        return
    
    print("\n" + "=" * 60)
    print(f"FIXING ORPHANED FEEDBACK (Strategy: {strategy})")
    print("=" * 60 + "\n")
    
    try:
        with postgres_db.get_session() as session:
            if strategy == "null":
                # Set config_version to NULL for orphaned records
                for version in by_version.keys():
                    result = session.execute(
                        text("""
                            UPDATE feedback2
                            SET config_version = NULL
                            WHERE config_version = :version
                            AND NOT EXISTS (
                                SELECT 1 FROM system_config WHERE version = :version
                            )
                        """),
                        {"version": version}
                    )
                    count = result.rowcount
                    print(f"✓ Set config_version to NULL for {count} feedback record(s) with version {version}")
                
                print("\n✅ All orphaned feedback records fixed!")
                
            elif strategy == "recreate":
                # Recreate missing versions (requires version data)
                print("⚠️  Recreate strategy requires version data. Please use 'null' strategy or manually recreate versions.")
                return
            else:
                print(f"❌ Unknown strategy: {strategy}")
                return
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Find and fix orphaned feedback records")
    parser.add_argument(
        "--fix",
        choices=["null", "recreate"],
        help="Fix strategy: 'null' sets config_version to NULL, 'recreate' recreates missing versions"
    )
    
    args = parser.parse_args()
    
    if args.fix:
        fix_orphaned_feedback(strategy=args.fix)
    else:
        find_orphaned_feedback()
        print("\n💡 To fix orphaned records, run:")
        print("   python fix_orphaned_feedback.py --fix null")
        print("\n   This will set config_version to NULL for orphaned feedback.")

