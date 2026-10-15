from contextlib import asynccontextmanager
import uuid
import logging
import asyncio
from fastapi import FastAPI, HTTPException, File, UploadFile, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .models import FeedbackInput, ClassifiedFeedback, GraphData, FileUploadResponse, IndividualResponse, ConversationInput, AugmentationInput, AugmentationResponse, ConfigResponse, ConfigUpdateRequest, ConfigUpdateResponse, ConfigHistoryResponse, ConfigVersion, SystemConfig, Category, StaffLoginInput, StaffLoginResponse
from .classifier import chatbot_agent, augment_feedback, determine_topic_context, detect_spam_or_invalid, clear_config_cache
from .feedback_pipeline import classify_and_tag, process_submission, store_feedback, StorageError
from .database import db
from .postgres_db import postgres_db
from .file_processor import FileProcessor
from .system_config import system_config_manager
from .auth import require_staff, rate_limit_public, check_staff_password, issue_token


# Configure logging
# Remove any existing handlers (to reset FastAPI's logging)
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

# Configure root logger to INFO level (to avoid too much noise)
# Use UTF-8 encoding to support emojis in logs
import sys
stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setLevel(logging.INFO)
stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
# Force UTF-8 encoding on the stream
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

file_handler = logging.FileHandler('app.log', encoding='utf-8')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

logging.basicConfig(
    level=logging.INFO,
    handlers=[stream_handler, file_handler]
)

# Set specific loggers for detailed debugging
# Enable DEBUG for your classifier to see detailed classification logs
logging.getLogger('app.classifier').setLevel(logging.DEBUG)
logging.getLogger('app.main').setLevel(logging.INFO)  # Your main app

# Reduce noise from other libraries
logging.getLogger('neo4j').setLevel(logging.WARNING)  # Reduce Neo4j noise
logging.getLogger('urllib3').setLevel(logging.WARNING)  # Reduce urllib3 noise
logging.getLogger('openai').setLevel(logging.INFO)  # Reduce OpenAI noise

logger = logging.getLogger(__name__)
logger.info("Application logging configured with filtered levels")


# Helper function for config conversion
def _dict_to_system_config(config_data_dict: dict) -> SystemConfig:
    """
    Convert config_data dict to SystemConfig Pydantic model.
    
    Args:
        config_data_dict: Dictionary with config data
        
    Returns:
        SystemConfig Pydantic model
    """
    return SystemConfig(
        categories=[Category(**cat) for cat in config_data_dict.get('categories', [])],
        permit_types=config_data_dict.get('permit_types', []),
        departments=config_data_dict.get('departments', []),
        impact_types=config_data_dict.get('impact_types', []),
        urgency_levels=config_data_dict.get('urgency_levels', []),
        sentiment_options=config_data_dict.get('sentiment_options', []),
        priority_levels=config_data_dict.get('priority_levels', [])
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    yield
    # Close both database connections safely
    try:
        db.close()
    except Exception as e:
        logger.error(f"Error closing Neo4j connection: {str(e)}")
    
    try:
        postgres_db.close()
    except Exception as e:
        logger.error(f"Error closing PostgreSQL connection: {str(e)}")


app = FastAPI(
    title="Feedback Classification API",
    description="API for classifying and storing feedback in a graph database",
    version="1.0.0",
    lifespan=lifespan
)


# Global exception handler to prevent server crashes
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return a proper error response."""
    logger.error(f"Unhandled exception: {type(exc).__name__}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. The server continues to run."
        }
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

# Configure CORS to allow frontend communication
import os
cors_origins_str = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

MAX_FEEDBACK_PAGE = 500


@app.post("/api/staff/login", response_model=StaffLoginResponse, dependencies=[Depends(rate_limit_public)])
async def staff_login(credentials: StaffLoginInput):
    """Exchange the shared staff password for a signed session token."""
    if not check_staff_password(credentials.password):
        logger.warning("Failed staff login attempt")
        raise HTTPException(status_code=401, detail="Incorrect password")
    token, expires_at = issue_token()
    return StaffLoginResponse(token=token, expires_at=expires_at)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Feedback Classification API with Intelligent Agent",
        "version": "3.0.0",
        "endpoints": {
            "feedback_agent": "/api/feedback-agent",
            "submit_feedback": "api/submit-feedback",
            "get_graph": "/api/graph",
            "get_stats": "/api/stats",
            "verify_ids": "/api/verify-ids"
        }
    }


@app.post("/api/feedback-agent", dependencies=[Depends(rate_limit_public)])
async def feedback_agent(conversation: ConversationInput):
    """
    Unified intelligent agent that handles feedback quality checking and dynamic questioning.
    
    Args:
        conversation: ConversationInput with original feedback and conversation history
        
    Returns:
        Agent response with next question or completion status
    """
    logger.info("=" * 70)
    logger.info("==== FEEDBACK AGENT ENDPOINT CALLED ====")
    logger.info("=" * 70)
    logger.info(f"Feedback: {conversation.original_feedback[:100]}...")
    logger.info(f"Conversation turn: {len(conversation.conversation_history) + 1}")
    
    try:
        # Check for spam/invalid feedback only on first call (empty conversation history)
        if not conversation.conversation_history:
            logger.info("📍 FIRST TURN: Checking for spam/invalid content")
            spam_check = detect_spam_or_invalid(conversation.original_feedback)
            
            # Every submission must be accepted, so an irrelevant one is not
            # rejected: skip the follow-up questions and let the form submit it.
            # submit_feedback re-checks and files it under Not Relevant.
            if spam_check.get("is_invalid", False):
                logger.info("⚠️ Feedback looks not relevant - no follow-up, will be tagged on submit")
                return {
                    "message": "",
                    "needs_followup": False,
                    "quality_score": 0,
                    "is_invalid": True
                }
            
            # Determine topic context only on first call
            logger.info("📍 FIRST TURN: Will determine topic context")
            topic_context = determine_topic_context(
                conversation.original_feedback,
                conversation.category_map
            )
        else:
            logger.info("📍 SUBSEQUENT TURN: Skipping spam check and topic context (already loaded)")
            topic_context = ""
            logger.info("=" * 60)
        
        # Call the chatbot agent with topic context
        result = chatbot_agent(
            conversation.original_feedback,
            conversation.conversation_history,
            topic_context
        )
        
        # Ensure is_invalid is set in result
        result["is_invalid"] = False
        
        logger.info("\n" + "=" * 70)
        logger.info("==== FINAL RESULT ====")
        logger.info(f"Needs followup: {result['needs_followup']}")
        logger.info(f"Quality score: {result.get('quality_score', 'N/A')}/10")
        logger.info(f"Response message: {result.get('message', '')[:100]}...")
        logger.info("=" * 70 + "\n")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error in feedback agent: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.post("/api/augment-feedback", response_model=AugmentationResponse, dependencies=[Depends(rate_limit_public)])
async def augment_feedback_endpoint(input_data: AugmentationInput):
    """
    Use AI to generate an additional note from conversation details.
    
    Args:
        input_data: AugmentationInput with original feedback and conversation history
        
    Returns:
        AugmentationResponse with the additional note text
    """
    logger.info(f"Generating additional note for feedback: {input_data.original_feedback[:100]}...")
    
    try:
        # Call the augmentation function
        additional_note_text = augment_feedback(
            input_data.original_feedback,
            input_data.conversation_history
        )
        
        logger.info(f"Additional note generated successfully. Length: {len(additional_note_text)}")
        
        return AugmentationResponse(additional_note=additional_note_text)
        
    except Exception as e:
        logger.error(f"Error generating additional note: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.post("/api/submit-feedback", response_model=ClassifiedFeedback, dependencies=[Depends(rate_limit_public)])
async def submit_feedback(feedback: FeedbackInput):
    """
    Submit feedback for classification and storage in both PostgreSQL and Neo4j.
    
    Args:
        feedback: FeedbackInput object containing the feedback text
        
    Returns:
        ClassifiedFeedback object with categories and subcategories
    """
    logger.info(f"Received feedback submission ({len(feedback.text)} chars)")

    try:
        return await process_submission(feedback.text, feedback.contact_info)
    except StorageError as e:
        logger.error(f"Submission {e.feedback_id} could not be stored")
    except Exception:
        logger.exception("Error processing feedback submission")
    raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")

@app.post("/api/upload-feedback", response_model=FileUploadResponse, dependencies=[Depends(require_staff)])
async def upload_feedback_file(file: UploadFile = File(...), store_in_database: bool = True):
    """
    Upload a file (PDF, TXT, or DOCX) for feedback processing.
    
    Args:
        file: Uploaded file
        
    Returns:
        FileUploadResponse with extracted text and classification
    """
    logger.info(f"Received file upload: {file.filename}")
    
    try:
        # Extract and segment text from the file
        logger.debug("Extracting and segmenting text from file...")
        feedback_texts, file_type = await FileProcessor.extract_and_segment_text(file)
        logger.info(f"Text extracted and segmented successfully. Found {len(feedback_texts)} feedback segments")
        
        if not feedback_texts or all(not text.strip() for text in feedback_texts):
            raise HTTPException(
                status_code=400, 
                detail="No text content found in the uploaded file"
            )
        
        # Classify and tag every segment in parallel. A segment whose classification
        # fails gets the fallback classification, so none is dropped.
        classified_results = await asyncio.gather(*(classify_and_tag(text) for text in feedback_texts))
        logger.info(f"All {len(classified_results)} feedback segments classified")

        if store_in_database:
            stored, unstored = 0, 0
            for text, classified in zip(feedback_texts, classified_results):
                try:
                    store_feedback(text, classified)
                    stored += 1
                except StorageError:
                    unstored += 1  # full text already logged at ERROR with its id
            logger.info(f"Feedback storage completed. Stored: {stored}, failed: {unstored}")
            if unstored:
                raise HTTPException(
                    status_code=500,
                    detail=f"{unstored} of {len(classified_results)} segments could not be saved. Please try again.",
                )
        else:
            logger.info("Classification only: not storing feedbacks in database")

        # Create individual responses for each feedback
        individual_responses = []
        for i, (text, classified) in enumerate(zip(feedback_texts, classified_results)):
            individual_response = IndividualResponse(
                message=f"Feedback segment {i+1} processed successfully",
                text_content=text,
                classified_feedback=classified
            )
            individual_responses.append(individual_response)
        
        return FileUploadResponse(
            individual_responses=individual_responses,
            original_filename=file.filename,
            file_type=file_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file upload: {str(e)}")
        logger.debug(f"Exception type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")

@app.post("/api/classify-feedback", response_model=FileUploadResponse, dependencies=[Depends(require_staff)])
async def classify_feedback_file(file: UploadFile = File(...)):
    """
    Classify feedback from an uploaded file.
    
    Args:
        file: UploadFile object containing the uploaded file
    """
    logger.info(f"Received file for classification: {file.filename}")
    try:
        response = await upload_feedback_file(file, store_in_database=False)
        logger.info(f"File classified successfully. Response: {response}")
        return response
    except Exception as e:
        logger.error(f"Error classifying feedback file: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")

@app.get("/api/graph", response_model=GraphData, dependencies=[Depends(require_staff)])
async def get_graph():
    """
    Retrieve graph data for visualization, filtered by active config.
    Category/Subcategory nodes not in active config are marked as deprecated.
    
    Returns:
        GraphData object containing nodes and relationships
    """
    try:
        # Get active config to filter graph nodes
        active_config = system_config_manager.get_active_config()
        
        graph_data = db.get_graph_data(active_config=active_config)
        return graph_data
    except Exception as e:
        logger.error(f"Error retrieving graph data: {str(e)}")
        # Return empty graph data instead of crashing
        return GraphData(nodes=[], relationships=[])

@app.get("/api/stats", dependencies=[Depends(require_staff)])
async def get_stats():
    """
    Get statistics about feedback.
    
    Returns:
        Dictionary with feedback statistics
    """
    try:
        total_feedback = db.get_feedback_count()
        categories = db.get_categories_summary()
        
        return {
            "total_feedback": total_feedback,
            "categories": categories
        }
    except Exception as e:
        logger.error(f"Error retrieving stats: {str(e)}")
        # Return empty stats instead of crashing
        return {
            "total_feedback": 0,
            "categories": []
        }


@app.get("/api/postgres/feedback", dependencies=[Depends(require_staff)])
async def get_all_postgres_feedback(limit: int = 100, offset: int = 0):
    """
    Get all feedback from PostgreSQL with pagination.
    
    Args:
        limit: Maximum number of records to return (default 100)
        offset: Number of records to skip (default 0)
        
    Returns:
        List of feedback records
    """
    try:
        limit = min(max(limit, 1), MAX_FEEDBACK_PAGE)
        feedbacks = postgres_db.get_all_feedback(limit=limit, offset=max(offset, 0))
        return {
            "feedbacks": feedbacks,
            "count": len(feedbacks),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error fetching PostgreSQL feedback: {str(e)}")
        # Return empty list instead of crashing
        return {
            "feedbacks": [],
            "count": 0,
            "limit": limit,
            "offset": offset
        }


@app.delete("/api/feedback/{feedback_id}", dependencies=[Depends(require_staff)])
async def delete_feedback(feedback_id: str):
    """Remove one feedback item from both databases (e.g. spam or a test entry)."""
    try:
        uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid feedback ID")

    deleted_postgres = postgres_db.delete_feedback(feedback_id)
    deleted_neo4j = db.delete_feedback(feedback_id)
    if not (deleted_postgres or deleted_neo4j):
        raise HTTPException(status_code=404, detail="Feedback not found")

    logger.info(f"Deleted feedback {feedback_id} (postgres={deleted_postgres}, neo4j={deleted_neo4j})")
    return {"deleted": True, "postgres": deleted_postgres, "neo4j": deleted_neo4j}


@app.get("/api/verify-ids", dependencies=[Depends(require_staff)])
async def verify_database_ids():
    """
    Verify that IDs match between PostgreSQL and Neo4j databases.
    
    Returns:
        Dictionary with verification results showing matched and unmatched IDs
    """
    try:
        # Get all feedback IDs from PostgreSQL
        postgres_ids = set()
        try:
            postgres_feedbacks = postgres_db.get_all_feedback(limit=10000)
            postgres_ids = {f["feedback_id"] for f in postgres_feedbacks}
        except Exception as e:
            logger.error(f"Error fetching PostgreSQL IDs: {str(e)}")
        
        # Get all feedback IDs from Neo4j
        neo4j_ids = set()
        try:
            with db.driver.session() as session:
                result = session.run("MATCH (f:Feedback) RETURN f.id as id")
                neo4j_ids = {record["id"] for record in result}
        except Exception as e:
            logger.error(f"Error fetching Neo4j IDs: {str(e)}")
        
        # Find matches and mismatches
        matched_ids = postgres_ids.intersection(neo4j_ids)
        only_in_postgres = postgres_ids - neo4j_ids
        only_in_neo4j = neo4j_ids - postgres_ids
        
        return {
            "total_postgres": len(postgres_ids),
            "total_neo4j": len(neo4j_ids),
            "matched": len(matched_ids),
            "matched_ids": list(matched_ids),
            "only_in_postgres": list(only_in_postgres),
            "only_in_neo4j": list(only_in_neo4j),
            "status": "OK" if len(only_in_postgres) == 0 and len(only_in_neo4j) == 0 else "MISMATCH"
        }
    except Exception as e:
        logger.error(f"Error verifying database IDs: {str(e)}")
        # Return error status instead of crashing
        return {
            "total_postgres": 0,
            "total_neo4j": 0,
            "matched": 0,
            "matched_ids": [],
            "only_in_postgres": [],
            "only_in_neo4j": [],
            "status": "ERROR"
        }


# System Configuration Endpoints
@app.get("/api/config", response_model=ConfigResponse, dependencies=[Depends(require_staff)])
async def get_config():
    """
    Get the currently active system configuration.
    
    Returns:
        ConfigResponse with active configuration data
    """
    try:
        config = system_config_manager.get_active_config()
        if not config:
            raise HTTPException(
                status_code=404,
                detail="No active configuration found. Please seed the database with initial config."
            )
        
        # Convert config_data dict to SystemConfig model
        system_config = _dict_to_system_config(config['config_data'])
        
        return ConfigResponse(
            config_id=config['config_id'],
            version=config['version'],
            config_data=system_config,
            created_at=config['created_at'],
            created_by=config['created_by'],
            change_notes=config['change_notes']
        )
    except Exception as e:
        logger.error(f"Error fetching active config: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.put("/api/config", response_model=ConfigUpdateResponse, dependencies=[Depends(require_staff)])
async def update_config(request: ConfigUpdateRequest):
    """
    Create a new configuration version and activate it.
    
    Args:
        request: ConfigUpdateRequest with new config data and metadata
        
    Returns:
        ConfigUpdateResponse with new version number
    """
    try:
        # Convert SystemConfig model to dict for storage (Pydantic v2 uses model_dump)
        config_dict = request.config_data.model_dump()
        
        new_version = system_config_manager.create_new_version(
            config_data=config_dict,
            created_by=request.created_by,
            change_notes=request.change_notes
        )
        
        # Clear classifier cache so new config is used immediately
        clear_config_cache()
        
        logger.info(f"Created new config version {new_version}")
        
        return ConfigUpdateResponse(
            success=True,
            version=new_version,
            message=f"Configuration updated successfully. New version: {new_version}"
        )
    except Exception as e:
        logger.error(f"Error creating new config version: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.get("/api/config/history", response_model=ConfigHistoryResponse, dependencies=[Depends(require_staff)])
async def get_config_history():
    """
    Get configuration version history.
    
    Returns:
        ConfigHistoryResponse with all versions and current version number
    """
    try:
        history = system_config_manager.get_config_history()
        
        # Convert to ConfigVersion models
        versions = []
        current_version = None
        
        for version_data in history:
            system_config = _dict_to_system_config(version_data['config_data'])
            
            version = ConfigVersion(
                config_id=version_data['config_id'],
                version=version_data['version'],
                config_data=system_config,
                is_active=version_data['is_active'],
                created_at=version_data['created_at'],
                created_by=version_data['created_by'],
                change_notes=version_data['change_notes']
            )
            
            versions.append(version)
            if version_data['is_active']:
                current_version = version_data['version']
        
        return ConfigHistoryResponse(
            versions=versions,
            current_version=current_version
        )
    except Exception as e:
        logger.error(f"Error fetching config history: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.get("/api/config/{version}", response_model=ConfigResponse, dependencies=[Depends(require_staff)])
async def get_config_by_version(version: int):
    """
    Get a specific configuration version by version number.
    
    Args:
        version: Version number to retrieve
        
    Returns:
        ConfigResponse with the requested configuration
    """
    try:
        config = system_config_manager.get_config_by_version(version)
        if not config:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration version {version} not found."
            )
        
        # Convert config_data dict to SystemConfig model
        system_config = _dict_to_system_config(config['config_data'])
        
        return ConfigResponse(
            config_id=config['config_id'],
            version=config['version'],
            config_data=system_config,
            created_at=config['created_at'],
            created_by=config['created_by'],
            change_notes=config['change_notes']
        )
    except Exception as e:
        logger.error(f"Error fetching config version {version}: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.put("/api/config/activate/{version}", response_model=ConfigUpdateResponse, dependencies=[Depends(require_staff)])
async def activate_config_version(version: int):
    """
    Activate a specific configuration version (rollback).
    
    Args:
        version: Version number to activate
        
    Returns:
        ConfigUpdateResponse with success status
    """
    try:
        success = system_config_manager.activate_version(version)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration version {version} not found."
            )
        
        # Clear classifier cache so new config is used immediately
        clear_config_cache()
        
        logger.info(f"Activated config version {version}")
        
        return ConfigUpdateResponse(
            success=True,
            version=version,
            message=f"Configuration version {version} activated successfully."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error activating config version {version}: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")


@app.delete("/api/config/{version}", response_model=ConfigUpdateResponse, dependencies=[Depends(require_staff)])
async def delete_config_version(version: int):
    """
    Delete a configuration version.
    Cannot delete the active version.
    
    Args:
        version: Version number to delete
        
    Returns:
        ConfigUpdateResponse with success status
    """
    try:
        success = system_config_manager.delete_version(version)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Configuration version {version} not found."
            )
        
        logger.info(f"Deleted config version {version}")
        
        return ConfigUpdateResponse(
            success=True,
            version=version,
            message=f"Configuration version {version} deleted successfully."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting config version {version}: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request. Please try again.")