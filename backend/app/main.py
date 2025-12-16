from contextlib import asynccontextmanager
import logging
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .models import FeedbackInput, ClassifiedFeedback, GraphData, FileUploadResponse, IndividualResponse, ConversationInput, ConversationResponse, AugmentationInput, AugmentationResponse, ConfigResponse, ConfigUpdateRequest, ConfigUpdateResponse, ConfigHistoryResponse, ConfigVersion, SystemConfig, Category
from .classifier import classify_feedback, chatbot_agent, augment_feedback, determine_permit_context, detect_spam_or_invalid, clear_config_cache
from .database import db
from .postgres_db import postgres_db
from .file_processor import FileProcessor
from .system_config import system_config_manager


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


# Helper function to convert sentiment to numeric score
def sentiment_to_score(sentiment: str) -> float:
    """Convert sentiment string to numeric score."""
    sentiment_map = {
        "positive": 0.7,
        "negative": -0.7,
        "neutral": 0.0,
        "very positive": 1.0,
        "very negative": -1.0
    }
    return sentiment_map.get(sentiment.lower() if sentiment else "", 0.0)


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
            "detail": "An internal server error occurred. The server continues to run.",
            "error_type": type(exc).__name__
        }
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://main.d57dpeqds75ja.amplifyapp.com",  # Your Amplify frontend
        "https://main.d3f474el750k1.amplifyapp.com",
        "http://localhost:3000",  # Local development
        "http://localhost:3001",  # Local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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


@app.post("/api/feedback-agent")
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
            
            if spam_check.get("is_invalid", False):
                logger.info("⚠️ Feedback detected as spam/invalid - returning early")
                return {
                    "message": "We cannot allow non-permit related feedback or other contect.",
                    "needs_followup": False,
                    "quality_score": 0,
                    "is_invalid": True
                }
            
            # Determine permit context only on first call
            logger.info("📍 FIRST TURN: Will determine permit context")
            permit_context = determine_permit_context(
                conversation.original_feedback,
                conversation.category_map
            )
        else:
            logger.info("📍 SUBSEQUENT TURN: Skipping spam check and permit context (already loaded)")
            permit_context = ""
            logger.info("=" * 60)
        
        # Call the chatbot agent with permit context
        result = chatbot_agent(
            conversation.original_feedback,
            conversation.conversation_history,
            permit_context
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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/augment-feedback", response_model=AugmentationResponse)
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
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/submit-feedback", response_model=ClassifiedFeedback)
async def submit_feedback(feedback: FeedbackInput):
    """
    Submit feedback for classification and storage in both PostgreSQL and Neo4j.
    
    Args:
        feedback: FeedbackInput object containing the feedback text
        
    Returns:
        ClassifiedFeedback object with categories and subcategories
    """
    logger.info(f"Received feedback submission: {feedback.text[:100]}...")
    
    try:
        # Classify the feedback using OpenAI
        logger.debug("Starting feedback classification...")
        classified = await classify_feedback(feedback.text)
        logger.info(f"Classification completed. Categories: {list(classified.category_map.keys())}")
        
        # Generate a single UUID for both databases
        import uuid as uuid_module
        shared_feedback_id = str(uuid_module.uuid4())
        logger.info(f"Generated shared feedback ID: {shared_feedback_id}")
        
        # 1. Store FULL data in PostgreSQL (with AI-generated fields)
        logger.debug("Storing feedback in PostgreSQL...")
        
        # Process contact information if provided
        followup_opt_in = False
        user_contact_info = None
        if feedback.contact_info:
            followup_opt_in = feedback.contact_info.get('opted_in', False)
            if followup_opt_in:
                # Store contact details in JSONB format (name is optional, others are required)
                user_contact_info = {
                    "name": feedback.contact_info.get('name', ''),
                    "email": feedback.contact_info.get('email'),
                    "phone": feedback.contact_info.get('phone')
                }
                # Only add name if it's provided and not empty
                name = feedback.contact_info.get('name', '').strip()
                if name:
                    user_contact_info['name'] = name
                    
                logger.info(f"User opted in for follow-up. Email: {user_contact_info.get('email')}, Name provided: {bool(name)}")
            else:
                logger.info("User opted out of follow-up contact")
        
        postgres_data = {
            "issue_description": feedback.text,
            "permit_type": classified.permit_type,
            "category": list(classified.category_map.keys())[0] if classified.category_map else None,
            "subcategory": list(classified.category_map.values())[0][0] if classified.category_map and list(classified.category_map.values())[0] else None,
            "ai_summary": classified.ai_summary,
            "department_predicted": classified.department_predicted,
            "sentiment_score": sentiment_to_score(classified.sentiment) if classified.sentiment else None,
            "urgency_level": classified.urgency_level,
            "impact_type": classified.impact_type,
            "language": classified.language,
            "status": "New",
            "feedback_source": "OpenPermit",
            "timestamp_processed": datetime.now(),
            "followup_opt_in": followup_opt_in,
            "user_contact_info": user_contact_info
        }
        
        postgres_id = None
        neo4j_id = None
        
        # Try to store in PostgreSQL, but don't fail if it doesn't work
        try:
            postgres_id = postgres_db.add_feedback(postgres_data, feedback_id=shared_feedback_id)
            logger.info(f"Feedback stored in PostgreSQL. ID: {postgres_id}")
        except Exception as e:
            logger.error(f"Failed to store feedback in PostgreSQL: {str(e)}")
            # Continue execution even if PostgreSQL fails
        
        # 2. Store graph relationships in Neo4j
        logger.debug("Storing feedback relationships in Neo4j...")
        try:
            neo4j_id = db.add_feedback(classified, feedback_id=shared_feedback_id)
            logger.info(f"Feedback relationships stored in Neo4j. ID: {neo4j_id}")
            if postgres_id:
                logger.info(f"Verified: Both databases using same ID: {postgres_id == neo4j_id}")
        except Exception as e:
            logger.error(f"Failed to store feedback in Neo4j: {str(e)}")
            # Continue execution even if Neo4j fails
        
        # If both database operations failed, raise an error
        if postgres_id is None and neo4j_id is None:
            raise Exception("Failed to store feedback in both databases")
        
        return classified
        
    except Exception as e:
        logger.error(f"Error processing feedback submission: {str(e)}")
        logger.debug(f"Exception type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-feedback", response_model=FileUploadResponse)
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
        
        # Process all feedback segments in parallel
        logger.debug(f"Starting parallel classification of {len(feedback_texts)} feedback segments...")
        
        # Create tasks for parallel processing
        classification_tasks = [classify_feedback(text) for text in feedback_texts]
        classified_results = await asyncio.gather(*classification_tasks)
        
        logger.info(f"All {len(classified_results)} feedback segments classified successfully")
        
        if store_in_database:
            # Store all feedbacks in both databases
            logger.debug("Storing all feedbacks in databases...")
            feedback_ids = []
            for i, (text, classified) in enumerate(zip(feedback_texts, classified_results)):
                # Generate a single UUID for both databases
                import uuid as uuid_module
                shared_feedback_id = str(uuid_module.uuid4())
                
                # Store in PostgreSQL with all AI-generated fields
                postgres_data = {
                    "issue_description": text,
                    "permit_type": classified.permit_type,
                    "category": list(classified.category_map.keys())[0] if classified.category_map else None,
                    "subcategory": list(classified.category_map.values())[0][0] if classified.category_map and list(classified.category_map.values())[0] else None,
                    "ai_summary": classified.ai_summary,
                    "department_predicted": classified.department_predicted,
                    "sentiment_score": sentiment_to_score(classified.sentiment) if classified.sentiment else None,
                    "urgency_level": classified.urgency_level,
                    "impact_type": classified.impact_type,
                    "language": classified.language,
                    "status": "New",
                    "feedback_source": "OpenPermit",
                    "timestamp_processed": datetime.now()
                }
                
                postgres_id = None
                neo4j_id = None
                
                # Try PostgreSQL, but don't fail if it doesn't work
                try:
                    postgres_id = postgres_db.add_feedback(postgres_data, feedback_id=shared_feedback_id)
                except Exception as e:
                    logger.error(f"Failed to store feedback {i+1} in PostgreSQL: {str(e)}")
                
                # Try Neo4j, but don't fail if it doesn't work
                try:
                    neo4j_id = db.add_feedback(classified, feedback_id=shared_feedback_id)
                except Exception as e:
                    logger.error(f"Failed to store feedback {i+1} in Neo4j: {str(e)}")
                
                feedback_ids.append({"postgres": postgres_id, "neo4j": neo4j_id, "shared_id": shared_feedback_id})
            
            logger.info(f"Feedback storage completed. Count: {len(feedback_ids)}")
        
        logger.info("================================================")
        logger.info("Not storing feedbacks in database")
        logger.info("================================================")
        
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/classify-feedback", response_model=FileUploadResponse)
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph", response_model=GraphData)
async def get_graph():
    """
    Retrieve graph data for visualization.
    
    Returns:
        GraphData object containing nodes and relationships
    """
    try:
        graph_data = db.get_graph_data()
        return graph_data
    except Exception as e:
        logger.error(f"Error retrieving graph data: {str(e)}")
        # Return empty graph data instead of crashing
        return GraphData(nodes=[], relationships=[])

@app.get("/api/stats")
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


@app.get("/api/postgres/feedback")
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
        feedbacks = postgres_db.get_all_feedback(limit=limit, offset=offset)
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


@app.get("/api/verify-ids")
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
@app.get("/api/config", response_model=ConfigResponse)
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
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/config", response_model=ConfigUpdateResponse)
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
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config/history", response_model=ConfigHistoryResponse)
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
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/config/{version}", response_model=ConfigResponse)
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
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/config/activate/{version}", response_model=ConfigUpdateResponse)
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
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/config/{version}", response_model=ConfigUpdateResponse)
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
        raise HTTPException(status_code=500, detail=str(e))