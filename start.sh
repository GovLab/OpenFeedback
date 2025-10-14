#!/bin/bash

# Startup script for OpenPermit

echo "Starting OpenPermit Feedback Classification System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker to use this script."
    echo "Or follow the manual setup instructions in README.md"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "docker-compose is not installed. Please install docker-compose."
    exit 1
fi

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable is not set."
    echo "Please set it with: export OPENAI_API_KEY=your_api_key_here"
    exit 1
fi

# Start the services
echo "Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "✅ Services started successfully!"
echo ""
echo "Access the application at:"
echo "  Frontend:     http://localhost:3000"
echo "  Backend API:  http://localhost:8000"
echo "  Neo4j Browser: http://localhost:7474 (username: neo4j, password: password123)"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
