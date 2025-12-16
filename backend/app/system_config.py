"""
System Configuration Manager

Handles CRUD operations for system configuration stored in PostgreSQL.
Manages versioned configuration with only one active version at a time.
"""

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import logging
import json
from .postgres_db import postgres_db

logger = logging.getLogger(__name__)


class SystemConfigManager:
    """Manages system configuration versions in PostgreSQL."""
    
    def __init__(self):
        """Initialize the config manager."""
        self.postgres_db = postgres_db
    
    def get_session(self):
        """Context manager for database sessions."""
        return self.postgres_db.get_session()
    
    @staticmethod
    def _parse_jsonb(jsonb_data: Any) -> Dict[str, Any]:
        """
        Parse JSONB data from PostgreSQL (handles string or dict).
        
        Args:
            jsonb_data: JSONB data from database (can be string, dict, or other)
            
        Returns:
            Parsed dictionary
        """
        if isinstance(jsonb_data, dict):
            return jsonb_data
        elif isinstance(jsonb_data, str):
            return json.loads(jsonb_data)
        else:
            # Try to convert other types
            try:
                return dict(jsonb_data)
            except (TypeError, ValueError):
                return json.loads(str(jsonb_data))
    
    def get_active_config(self) -> Optional[Dict[str, Any]]:
        """
        Get the currently active configuration.
        
        Returns:
            Dictionary with config data and metadata, or None if no active config
        """
        if self.postgres_db.engine is None:
            logger.error("PostgreSQL database not connected")
            return None
        
        try:
            with self.get_session() as session:
                result = session.execute(
                    text("""
                        SELECT config_id, version, config_data, created_at, created_by, change_notes
                        FROM system_config
                        WHERE is_active = true
                        LIMIT 1
                    """)
                )
                row = result.fetchone()
                
                if not row:
                    logger.warning("No active configuration found")
                    return None
                
                return {
                    "config_id": str(row[0]),
                    "version": row[1],
                    "config_data": self._parse_jsonb(row[2]),
                    "created_at": row[3].isoformat() if row[3] else None,
                    "created_by": row[4],
                    "change_notes": row[5]
                }
        except Exception as e:
            logger.error(f"Error fetching active config: {str(e)}")
            raise
    
    def create_new_version(
        self, 
        config_data: Dict[str, Any], 
        created_by: Optional[str] = None,
        change_notes: Optional[str] = None
    ) -> int:
        """
        Create a new configuration version and activate it.
        Deactivates the previous active version.
        
        Args:
            config_data: Dictionary containing the configuration (categories, permit_types, etc.)
            created_by: Optional username/identifier of who created this version
            change_notes: Optional notes about what changed
            
        Returns:
            The new version number
        """
        if self.postgres_db.engine is None:
            raise Exception("PostgreSQL database not connected")
        
        try:
            with self.get_session() as session:
                # Get the highest version number
                result = session.execute(
                    text("SELECT COALESCE(MAX(version), 0) FROM system_config")
                )
                max_version = result.scalar() or 0
                new_version = max_version + 1
                
                # Deactivate all existing active configs
                session.execute(
                    text("UPDATE system_config SET is_active = false WHERE is_active = true")
                )
                
                # Insert new version as active
                # Use SQLAlchemy's JSONB type for proper parameter binding
                # Convert dict to JSON string, then PostgreSQL will handle JSONB conversion
                config_json_str = json.dumps(config_data)
                
                # Use bindparam with explicit JSONB type
                from sqlalchemy import bindparam
                stmt = text("""
                    INSERT INTO system_config (version, config_data, is_active, created_by, change_notes)
                    VALUES (:version, :config_data, true, :created_by, :change_notes)
                """).bindparams(
                    bindparam("version", new_version),
                    bindparam("config_data", config_json_str, type_=JSONB),
                    bindparam("created_by", created_by),
                    bindparam("change_notes", change_notes)
                )
                
                session.execute(stmt)
                
                logger.info(f"Created new config version {new_version}")
                return new_version
                
        except Exception as e:
            logger.error(f"Error creating new config version: {str(e)}")
            raise
    
    def get_config_history(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get configuration version history.
        
        Args:
            limit: Optional limit on number of versions to return
            
        Returns:
            List of configuration versions ordered by version DESC
        """
        if self.postgres_db.engine is None:
            logger.error("PostgreSQL database not connected")
            return []
        
        try:
            with self.get_session() as session:
                query = """
                    SELECT config_id, version, config_data, is_active, created_at, created_by, change_notes
                    FROM system_config
                    ORDER BY version DESC
                """
                if limit:
                    query += f" LIMIT {limit}"
                
                result = session.execute(text(query))
                
                versions = []
                for row in result:
                    versions.append({
                        "config_id": str(row[0]),
                        "version": row[1],
                        "config_data": self._parse_jsonb(row[2]),
                        "is_active": row[3],
                        "created_at": row[4].isoformat() if row[4] else None,
                        "created_by": row[5],
                        "change_notes": row[6]
                    })
                
                return versions
                
        except Exception as e:
            logger.error(f"Error fetching config history: {str(e)}")
            raise
    
    def get_config_by_version(self, version: int) -> Optional[Dict[str, Any]]:
        """
        Get a specific configuration version.
        
        Args:
            version: Version number to retrieve
            
        Returns:
            Configuration dict or None if version doesn't exist
        """
        if self.postgres_db.engine is None:
            logger.error("PostgreSQL database not connected")
            return None
        
        try:
            with self.get_session() as session:
                result = session.execute(
                    text("""
                        SELECT config_id, version, config_data, is_active, created_at, created_by, change_notes
                        FROM system_config
                        WHERE version = :version
                    """),
                    {"version": version}
                )
                row = result.fetchone()
                
                if not row:
                    return None
                
                return {
                    "config_id": str(row[0]),
                    "version": row[1],
                    "config_data": self._parse_jsonb(row[2]),
                    "is_active": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                    "created_by": row[5],
                    "change_notes": row[6]
                }
                
        except Exception as e:
            logger.error(f"Error fetching config version {version}: {str(e)}")
            raise
    
    def activate_version(self, version: int) -> bool:
        """
        Activate a specific configuration version (rollback).
        Deactivates all other versions.
        
        Args:
            version: Version number to activate
            
        Returns:
            True if successful, False if version doesn't exist
        """
        if self.postgres_db.engine is None:
            logger.error("PostgreSQL database not connected")
            raise Exception("PostgreSQL database not connected")
        
        try:
            with self.get_session() as session:
                # Check if version exists
                check_result = session.execute(
                    text("SELECT version FROM system_config WHERE version = :version"),
                    {"version": version}
                )
                if not check_result.fetchone():
                    logger.warning(f"Version {version} does not exist")
                    return False
                
                # Deactivate all versions
                session.execute(
                    text("UPDATE system_config SET is_active = false WHERE is_active = true")
                )
                
                # Activate the specified version
                session.execute(
                    text("UPDATE system_config SET is_active = true WHERE version = :version"),
                    {"version": version}
                )
                
                logger.info(f"Activated config version {version}")
                return True
                
        except Exception as e:
            logger.error(f"Error activating version {version}: {str(e)}")
            raise
    
    def delete_version(self, version: int) -> bool:
        """
        Delete a configuration version.
        Cannot delete the active version.
        
        Args:
            version: Version number to delete
            
        Returns:
            True if successful, False if version doesn't exist
            
        Raises:
            ValueError: If attempting to delete the active version
        """
        if self.postgres_db.engine is None:
            logger.error("PostgreSQL database not connected")
            raise Exception("PostgreSQL database not connected")
        
        try:
            with self.get_session() as session:
                # Check if version exists and is active
                check_result = session.execute(
                    text("SELECT is_active FROM system_config WHERE version = :version"),
                    {"version": version}
                )
                row = check_result.fetchone()
                
                if not row:
                    logger.warning(f"Version {version} does not exist")
                    return False
                
                if row[0]:  # is_active is True
                    logger.warning(f"Cannot delete active version {version}")
                    raise ValueError(f"Cannot delete active version {version}. Please activate another version first.")
                
                # Delete the version
                session.execute(
                    text("DELETE FROM system_config WHERE version = :version"),
                    {"version": version}
                )
                
                logger.info(f"Deleted config version {version}")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting version {version}: {str(e)}")
            raise


# Global instance
system_config_manager = SystemConfigManager()


if __name__ == "__main__":
    """
    Quick test runner for SystemConfigManager.
    Run with: python -m app.system_config
    """
    print("\n🧪 Testing SystemConfigManager\n")
    print("=" * 60)
    
    # Test 1: Get Active Config
    print("TEST 1: Get Active Config")
    print("=" * 60)
    try:
        config = system_config_manager.get_active_config()
        if config:
            print(f"✅ Active config found!")
            print(f"   Version: {config['version']}")
            print(f"   Created at: {config['created_at']}")
            print(f"   Created by: {config['created_by']}")
            print(f"   Change notes: {config['change_notes']}")
            print(f"   Categories count: {len(config['config_data'].get('categories', []))}")
            print(f"   Permit types count: {len(config['config_data'].get('permit_types', []))}")
            print(f"   Departments count: {len(config['config_data'].get('departments', []))}")
        else:
            print("⚠️  No active config found. Make sure you've run the seed migration!")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test 2: Get Config History
    print("\n" + "=" * 60)
    print("TEST 2: Get Config History")
    print("=" * 60)
    try:
        history = system_config_manager.get_config_history()
        print(f"✅ Found {len(history)} version(s)")
        for version in history:
            status = "(ACTIVE)" if version['is_active'] else ""
            print(f"   Version {version['version']}: {status}")
            print(f"      Created: {version['created_at']}")
            print(f"      By: {version['created_by']}")
            print(f"      Notes: {version['change_notes']}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test 3: Get Config By Version
    print("\n" + "=" * 60)
    print("TEST 3: Get Config By Version (v1)")
    print("=" * 60)
    try:
        config_v1 = system_config_manager.get_config_by_version(1)
        if config_v1:
            print(f"✅ Found version 1")
            print(f"   Created: {config_v1['created_at']}")
            print(f"   Active: {config_v1['is_active']}")
            print(f"   Categories: {len(config_v1['config_data'].get('categories', []))}")
        else:
            print("⚠️  Version 1 not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("✅ Tests completed!")
    print("=" * 60)
    print("\n💡 To test creating a new version, uncomment the test in the code.")

