from contextlib import asynccontextmanager
import logging
import asyncio
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from .models import FeedbackInput, ClassifiedFeedback, GraphData, FileUploadResponse, IndividualResponse, ConversationInput, ConversationResponse
from .classifier import classify_feedback, chatbot_agent
from .database import db
from .file_processor import FileProcessor


# Configure logging
# Remove any existing handlers (to reset FastAPI's logging)
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

# Configure root logger to INFO level (to avoid too much noise)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler('app.log')  # File output
    ]
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    yield
    db.close()


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
    logger.info(f"Agent processing feedback: {conversation.original_feedback[:100]}...")
    
    try:
        # Call the unified chatbot agent
        result = chatbot_agent(
            conversation.original_feedback,
            conversation.conversation_history
        )
        
        logger.info(f"Agent decision: needs_followup={result['needs_followup']}, quality_score={result.get('quality_score', 'N/A')}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error in feedback agent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/submit-feedback", response_model=ClassifiedFeedback)
async def submit_feedback(feedback: FeedbackInput):
    """
    Submit feedback for classification and storage.
    
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
        
        # Store in Neo4j database
        logger.debug("Storing feedback in database...")
        feedback_id = db.add_feedback(classified)
        logger.info(f"Feedback stored successfully. ID: {feedback_id}")
        
        return classified
        
    except Exception as e:
        logger.error(f"Error processing feedback submission: {str(e)}")
        logger.debug(f"Exception type: {type(e).__name__}")
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
            # Store all feedbacks in Neo4j database sequentially (Neo4j operations are synchronous)
            logger.debug("Storing all feedbacks in database...")
            feedback_ids = []
            for classified in classified_results:
                feedback_id = db.add_feedback(classified)
                feedback_ids.append(feedback_id)
            
            logger.info(f"All feedbacks stored successfully. IDs: {feedback_ids}")
        
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




