from sqlalchemy import create_engine, Column, String, Text, Boolean, Float, TIMESTAMP, ARRAY, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from contextlib import contextmanager
from pathlib import Path
from typing import Optional, Dict, Any
import uuid
import logging
from .config import settings

logger = logging.getLogger(__name__)

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "schema.sql"

# Create database engine
try:
    engine = create_engine(settings.postgres_url, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    logger.error(f"Failed to create PostgreSQL engine: {str(e)}")
    engine = None
    SessionLocal = None

Base = declarative_base()


class FeedbackDB(Base):
    """SQLAlchemy model for feedback table."""
    __tablename__ = "feedback2"
    
    feedback_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp_submitted = Column(TIMESTAMP(timezone=True), server_default=func.now())
    timestamp_processed = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # User inputs
    permit_type = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    subcategory = Column(String(100), nullable=True)
    issue_description = Column(Text, nullable=False)
    
    # AI outputs
    ai_summary = Column(Text, nullable=True)
    department_predicted = Column(String(100), nullable=True)
    
    # Scoring
    sentiment_score = Column(Float, nullable=True)
    impact_type = Column(ARRAY(Text), nullable=True)
    urgency_level = Column(String(20), nullable=True)
    
    # Status
    status = Column(String(50), default='New')
    
    # User info
    followup_opt_in = Column(Boolean, default=False)
    user_contact_info = Column(JSONB, nullable=True)
    language = Column(String(10), nullable=True)
    
    # Metadata
    feedback_source = Column(String(50), default='OpenPermit')
    
    # Configuration version tracking
    # Note: Foreign key constraint is enforced at database level via schema.sql
    # Using Integer here to avoid SQLAlchemy trying to resolve the FK relationship
    config_version = Column(Integer, nullable=True)


class PostgresDB:
    """PostgreSQL database handler."""
    
    def __init__(self):
        """Initialize the database connection."""
        self.engine = engine
        self.SessionLocal = SessionLocal
        self._connection_error = None
        
        # Create tables if they don't exist
        if self.engine is None:
            self._connection_error = "PostgreSQL engine not initialized"
            logger.error("PostgreSQL engine is None - database operations will fail")
            return
        
        try:
            self._bootstrap_schema()
            Base.metadata.create_all(bind=engine)
            logger.info("✅ PostgreSQL tables created/verified successfully")
        except Exception as e:
            self._connection_error = str(e)
            logger.error(f"❌ Failed to create PostgreSQL tables: {str(e)}")
            logger.warning("Server will continue to run, but PostgreSQL operations will fail")
            # Don't raise - allow server to start even if database is unavailable
    
    def _bootstrap_schema(self):
        """Run schema.sql on an empty database so enums, FKs and the seed config exist."""
        with self.engine.connect() as conn:
            has_schema = conn.exec_driver_sql("SELECT to_regclass('public.system_config')").scalar()
        if has_schema:
            self._migrate_permit_type_to_text()
            return
        logger.info("Empty database detected: applying schema.sql")
        raw = self.engine.raw_connection()
        try:
            with raw.cursor() as cursor:
                cursor.execute(SCHEMA_PATH.read_text())
            raw.commit()
        finally:
            raw.close()

    def _migrate_permit_type_to_text(self):
        """Older databases stored permit_type as a permits-only enum; loosen it to text."""
        with self.engine.begin() as conn:
            udt = conn.exec_driver_sql(
                "SELECT udt_name FROM information_schema.columns "
                "WHERE table_name = 'feedback2' AND column_name = 'permit_type'"
            ).scalar()
            if udt == "permit_type_enum":
                logger.info("Migrating feedback2.permit_type from enum to VARCHAR(100)")
                conn.exec_driver_sql("ALTER TABLE feedback2 ALTER COLUMN permit_type TYPE VARCHAR(100)")

    @contextmanager
    def get_session(self):
        """Context manager for database sessions."""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def add_feedback(self, feedback_data: Dict[str, Any], feedback_id: str = None, config_version: Optional[int] = None) -> str:
        """
        Add feedback to PostgreSQL.
        
        Args:
            feedback_data: Dictionary with feedback fields
            feedback_id: Optional UUID string to use (if None, will auto-generate)
            config_version: Optional config version number used for classification
            
        Returns:
            feedback_id: UUID as string
        """
        if self.engine is None or self.SessionLocal is None:
            raise Exception(f"PostgreSQL database not connected: {self._connection_error}")
        
        with self.get_session() as session:
            # If feedback_id is provided, add it to the data
            if feedback_id:
                feedback_data['feedback_id'] = uuid.UUID(feedback_id)
            
            # Add config_version if provided
            if config_version is not None:
                feedback_data['config_version'] = config_version
            
            feedback = FeedbackDB(**feedback_data)
            session.add(feedback)
            session.flush()
            return str(feedback.feedback_id)
    
    def get_all_feedback(self, limit: int = 100, offset: int = 0):
        """Get all feedback with pagination."""
        if self.engine is None or self.SessionLocal is None:
            raise Exception(f"PostgreSQL database not connected: {self._connection_error}")
        
        with self.get_session() as session:
            feedbacks = session.query(FeedbackDB).order_by(
                FeedbackDB.timestamp_submitted.desc()
            ).limit(limit).offset(offset).all()
            
            return [
                {
                    "feedback_id": str(f.feedback_id),
                    "timestamp_submitted": f.timestamp_submitted.isoformat() if f.timestamp_submitted else None,
                    "timestamp_processed": f.timestamp_processed.isoformat() if f.timestamp_processed else None,
                    "permit_type": f.permit_type,
                    "category": f.category,
                    "subcategory": f.subcategory,
                    "issue_description": f.issue_description,
                    "ai_summary": f.ai_summary,
                    "sentiment_score": f.sentiment_score,
                    "urgency_level": f.urgency_level,
                    "status": f.status,
                    "feedback_source": f.feedback_source,
                    "department_predicted": f.department_predicted,
                    "impact_type": f.impact_type,
                    "language": f.language,
                    "followup_opt_in": f.followup_opt_in,
                    "user_contact_info": f.user_contact_info,
                    "config_version": f.config_version,
                }
                for f in feedbacks
            ]
    def delete_feedback(self, feedback_id: str) -> bool:
        """
        Delete feedback by ID.
        
        Args:
            feedback_id: UUID as string
            
        Returns:
            True if feedback was deleted, False if not found
        """
        with self.get_session() as session:
            feedback = session.query(FeedbackDB).filter(
                FeedbackDB.feedback_id == uuid.UUID(feedback_id)
            ).first()
            
            if not feedback:
                return False
            
            session.delete(feedback)
            return True
    
    def close(self):
        """Close the database connection."""
        if self.engine is not None:
            try:
                self.engine.dispose()
            except Exception as e:
                logger.error(f"Error closing PostgreSQL connection: {str(e)}")


# Global instance
postgres_db = PostgresDB()
