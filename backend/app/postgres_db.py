from sqlalchemy import create_engine, Column, String, Text, Boolean, Float, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from contextlib import contextmanager
from typing import Optional, Dict, Any
import uuid
from .config import settings

# Create database engine
engine = create_engine(settings.postgres_url, echo=settings.debug)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FeedbackDB(Base):
    """SQLAlchemy model for feedback table."""
    __tablename__ = "feedback"
    
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
    ai_clarification_needed = Column(Boolean, default=False)
    ai_followup_notes = Column(Text, nullable=True)
    department_predicted = Column(String(100), nullable=True)
    
    # Location
    location_text = Column(Text, nullable=True)
    location_geocoded = Column(JSONB, nullable=True)
    
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
    attachment_urls = Column(ARRAY(Text), nullable=True)
    feedback_source = Column(String(50), default='OpenPermit')


class PostgresDB:
    """PostgreSQL database handler."""
    
    def __init__(self):
        """Initialize the database connection."""
        self.engine = engine
        self.SessionLocal = SessionLocal
    
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
    
    def add_feedback(self, feedback_data: Dict[str, Any]) -> str:
        """
        Add feedback to PostgreSQL.
        
        Args:
            feedback_data: Dictionary with feedback fields
            
        Returns:
            feedback_id: UUID as string
        """
        with self.get_session() as session:
            feedback = FeedbackDB(**feedback_data)
            session.add(feedback)
            session.flush()
            return str(feedback.feedback_id)
    
    def get_feedback(self, feedback_id: str) -> Optional[Dict]:
        """Get feedback by ID."""
        with self.get_session() as session:
            feedback = session.query(FeedbackDB).filter(
                FeedbackDB.feedback_id == uuid.UUID(feedback_id)
            ).first()
            
            if not feedback:
                return None
            
            return {
                "feedback_id": str(feedback.feedback_id),
                "timestamp_submitted": feedback.timestamp_submitted.isoformat() if feedback.timestamp_submitted else None,
                "timestamp_processed": feedback.timestamp_processed.isoformat() if feedback.timestamp_processed else None,
                "permit_type": feedback.permit_type,
                "category": feedback.category,
                "subcategory": feedback.subcategory,
                "issue_description": feedback.issue_description,
                "ai_summary": feedback.ai_summary,
                "sentiment_score": feedback.sentiment_score,
                "status": feedback.status,
                "feedback_source": feedback.feedback_source,
            }
    
    def get_all_feedback(self, limit: int = 100, offset: int = 0):
        """Get all feedback with pagination."""
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
        self.engine.dispose()


# Global instance
postgres_db = PostgresDB()
