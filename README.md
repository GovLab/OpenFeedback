# OpenPermit - Feedback Classification System

A comprehensive web application for collecting, classifying, and visualizing feedback using AI and graph databases.

## Features

- 🤖 **AI-Powered Classification**: Uses OpenAI's GPT models to automatically classify feedback into categories and subcategories
- 📊 **Graph Visualization**: Real-time visualization of feedback relationships using Neo4j graph database
- 🚀 **Modern Stack**: FastAPI backend with Next.js frontend for optimal performance
- 📈 **Analytics**: Track feedback statistics and category distributions
- 🎨 **Beautiful UI**: Clean, responsive interface built with Tailwind CSS

## Architecture

### Backend (FastAPI + Python)
- **FastAPI**: Modern, high-performance Python web framework
- **OpenAI API**: GPT-3.5-turbo for feedback classification
- **Neo4j**: Graph database for storing and querying feedback relationships
- **Pydantic**: Data validation and settings management

### Frontend (Next.js + TypeScript)
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Force Graph**: Interactive graph visualization
- **Axios**: HTTP client for API communication

## Prerequisites

- Python 3.11+
- Node.js 20+
- Neo4j 5.16+ (or use Docker)
- OpenAI API key

## Quick Start with Docker

The easiest way to run the entire stack:

```bash
# Clone the repository
git clone https://github.com/ShadowMasterAJ/OpenPermit.git
cd OpenPermit

# Set your OpenAI API key
export OPENAI_API_KEY=your_api_key_here

# Start all services
docker-compose up
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Neo4j Browser: http://localhost:7474

## Manual Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from example:
```bash
cp .env.example .env
```

5. Edit `.env` and add your credentials:
```env
OPENAI_API_KEY=your_openai_api_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

6. Start the backend:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

4. Start the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000

### Neo4j Setup

#### Option 1: Local Installation
1. Download and install Neo4j from https://neo4j.com/download/
2. Start Neo4j and create a database
3. Set the password and update the `.env` file

#### Option 2: Docker
```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  neo4j:5.16.0
```

## API Endpoints

### POST /api/feedback
Submit feedback for classification

**Request:**
```json
{
  "text": "The app is great but the UI could be improved"
}
```

**Response:**
```json
{
  "text": "The app is great but the UI could be improved",
  "categories": ["Product"],
  "subcategories": ["UI/UX"],
  "sentiment": "Positive"
}
```

### GET /api/graph
Get graph data for visualization

**Response:**
```json
{
  "nodes": [
    {
      "id": "123",
      "label": "Product",
      "type": "Category"
    }
  ],
  "relationships": [
    {
      "source": "456",
      "target": "123",
      "type": "BELONGS_TO"
    }
  ]
}
```

### GET /api/stats
Get feedback statistics

**Response:**
```json
{
  "total_feedback": 42,
  "categories": [
    {
      "category": "Product",
      "count": 25
    }
  ]
}
```

## Feedback Categories

The system classifies feedback into the following categories:

- **Product**: Issues related to product features, functionality, or quality
  - UI/UX, Performance, Bugs, Feature Request
- **Service**: Issues related to customer service or support
  - Response Time, Quality, Accessibility
- **Pricing**: Issues related to pricing or billing
  - Cost, Value, Payment Issues
- **General**: General feedback or suggestions
  - Suggestion, Complaint, Praise

## Development

### Backend Development
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### View API Documentation
FastAPI automatically generates interactive API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
OpenPermit/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI application
│   │   ├── config.py         # Configuration management
│   │   ├── models.py         # Pydantic models
│   │   ├── classifier.py     # OpenAI classification logic
│   │   └── database.py       # Neo4j database operations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Main page
│   │   └── globals.css
│   ├── components/
│   │   ├── FeedbackForm.tsx
│   │   ├── GraphVisualization.tsx
│   │   └── StatsDisplay.tsx
│   ├── lib/
│   │   └── api.ts            # API client
│   ├── package.json
│   ├── Dockerfile
│   └── .env.local.example
├── docker-compose.yml
└── README.md
```

## Technologies Used

### Backend
- FastAPI 0.109.0
- OpenAI API (GPT-3.5-turbo)
- Neo4j 5.16.0
- Pydantic 2.5.3
- Uvicorn

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Axios
- React Force Graph 2D

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- OpenAI for the GPT API
- Neo4j for the graph database
- The FastAPI and Next.js communities