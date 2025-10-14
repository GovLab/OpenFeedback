# Quick Start Guide

This guide will help you get the OpenPermit Feedback Classification System up and running quickly.

## Prerequisites

Before starting, ensure you have:
- Docker and Docker Compose installed
- An OpenAI API key (get one at https://platform.openai.com/api-keys)

## Getting Started in 3 Steps

### Step 1: Clone the Repository
```bash
git clone https://github.com/ShadowMasterAJ/OpenPermit.git
cd OpenPermit
```

### Step 2: Set Your OpenAI API Key
```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

### Step 3: Start the Application
```bash
./start.sh
```

Or manually with Docker Compose:
```bash
docker-compose up
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Neo4j Browser**: http://localhost:7474 (username: neo4j, password: password123)

## Using the Application

1. Open http://localhost:3000 in your browser
2. Enter some feedback in the text area (e.g., "The app is great but the UI could be better")
3. Click "Submit Feedback"
4. Watch as the feedback is automatically classified and added to the graph
5. View the graph visualization showing relationships between feedback, categories, and subcategories

## Example Feedback to Try

Here are some example feedback entries you can try:

- "Your customer service response time is too slow"
- "I love the new features but they're a bit buggy"
- "The pricing is too high for what you offer"
- "Great product! Keep up the good work"
- "The app crashes when I try to export data"

## Stopping the Application

```bash
docker-compose down
```

## Troubleshooting

### Issue: "OPENAI_API_KEY environment variable is not set"
**Solution**: Make sure to set your OpenAI API key before starting:
```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

### Issue: "Port already in use"
**Solution**: Make sure no other services are running on ports 3000, 8000, 7474, or 7687.

### Issue: Neo4j connection failed
**Solution**: Wait a few seconds for Neo4j to fully start up, then try again.

## Manual Setup (Without Docker)

If you prefer not to use Docker, see the [README.md](README.md) for detailed manual setup instructions.

## Next Steps

- Explore the API documentation at http://localhost:8000/docs
- View the graph database in the Neo4j browser at http://localhost:7474
- Check the [README.md](README.md) for more advanced configuration options
- Customize the feedback categories in `backend/app/classifier.py`

## Support

If you encounter any issues, please check the [README.md](README.md) for detailed documentation or open an issue on GitHub.
