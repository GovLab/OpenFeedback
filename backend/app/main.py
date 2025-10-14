from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import FeedbackInput, ClassifiedFeedback, GraphData
from .classifier import classify_feedback
from .database import db
from .config import settings


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
        "message": "Feedback Classification API",
        "version": "1.0.0",
        "endpoints": {
            "submit_feedback": "/api/feedback",
            "get_graph": "/api/graph",
            "get_stats": "/api/stats"
        }
    }


@app.post("/api/feedback", response_model=ClassifiedFeedback)
async def submit_feedback(feedback: FeedbackInput):
    """
    Submit feedback for classification and storage.
    
    Args:
        feedback: FeedbackInput object containing the feedback text
        
    Returns:
        ClassifiedFeedback object with categories and subcategories
    """
    try:
        # Classify the feedback using OpenAI
        classified = await classify_feedback(feedback.text)
        
        # Store in Neo4j database
        feedback_id = db.add_feedback(classified)
        
        return classified
    except Exception as e:
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
