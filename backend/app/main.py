from contextlib import asynccontextmanager
import logging
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from .models import FeedbackInput, ClassifiedFeedback, GraphData, FileUploadResponse, IndividualResponse, ConversationInput, ConversationResponse, AugmentationInput, AugmentationResponse
from .classifier import classify_feedback, chatbot_agent, augment_feedback, determine_permit_context
from .database import db
from .postgres_db import postgres_db
from .file_processor import FileProcessor


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
    # Close both database connections
    db.close()
    postgres_db.close()


app = FastAPI(
    title="Feedback Classification API",
    description="API for classifying and storing feedback in a graph database",
    version="1.0.0",
    lifespan=lifespan
)


# Configure CORS to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
            "get_stats": "/api/stats"
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
        # Determine permit context only on first call (empty conversation history)
        permit_context = ""
        if not conversation.conversation_history:
            logger.info("📍 FIRST TURN: Will determine permit context")
            permit_context = determine_permit_context(
                conversation.original_feedback,
                conversation.category_map
            )
        else:
            logger.info("📍 SUBSEQUENT TURN: Skipping permit context (already loaded)")
            logger.info("=" * 60)
        
        # Call the chatbot agent with permit context
        result = chatbot_agent(
            conversation.original_feedback,
            conversation.conversation_history,
            permit_context
        )
        
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
                    "email": feedback.contact_info.get('email'),
                    "phone": feedback.contact_info.get('phone'),
                    "location": feedback.contact_info.get('location')
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
        postgres_id = postgres_db.add_feedback(postgres_data)
        logger.info(f"Feedback stored in PostgreSQL. ID: {postgres_id}")
        
        # 2. Store graph relationships in Neo4j
        logger.debug("Storing feedback relationships in Neo4j...")
        neo4j_id = db.add_feedback(classified)
        logger.info(f"Feedback relationships stored in Neo4j. ID: {neo4j_id}")
        
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
                postgres_id = postgres_db.add_feedback(postgres_data)
                
                # Store in Neo4j
                neo4j_id = db.add_feedback(classified)
                feedback_ids.append({"postgres": postgres_id, "neo4j": neo4j_id})
            
            logger.info(f"All feedbacks stored successfully. Count: {len(feedback_ids)}")
        
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
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))




