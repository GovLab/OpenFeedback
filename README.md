# 🚀 Feedback Classification System

A web app that classifies feedback using AI and visualizes it in a graph database.

## Quick Start (2 minutes)

1. **Clone the repository**
2. **Open a terminal and run:**

   ```bash
   # Linux/Mac:
   ./start-app.sh

   # Windows (Command Prompt):
   start-app.bat

   # Windows (PowerShell):
   powershell -ExecutionPolicy Bypass -File start-app.ps1
   ```

3. **Open your browser and go to:** http://localhost:3001

4. **Try it out:**
   - Type feedback like "The app is amazing but could be faster"
   - Click submit
   - Watch AI classification appear in the interactive graph

## Requirements

- Python 3.11+
- Node.js 20+
- Neo4j (graph database)

## Setup

### 1. Install Neo4j (graph database)

[Download Neo4j](https://neo4j.com/download/) and start it with default settings

### 2. Get OpenAI API key

[Get OpenAI key](https://platform.openai.com/api-keys) for AI classification

### 3. Configure credentials

Create `backend/.env` file:

```
OPENAI_API_KEY=your_openai_api_key_here
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here
```

### 4. Start the system

```bash
# Linux/Mac:
./start-app.sh

# Windows (Command Prompt):
start-app.bat

# Windows (PowerShell):
powershell -ExecutionPolicy Bypass -File start-app.ps1
```

That's it! The system handles the rest automatically.

## What's Running

- **Frontend**: http://localhost:3001 (sometimes 3001 if 3000 is busy)
- **Backend**: http://localhost:8003 (sometimes 8003 if 8000 is busy)
- **Database**: Neo4j graph visualization

## How It Works

1. **You submit feedback** (e.g., "Love the app but it's slow")
2. **AI classifies it** using OpenAI GPT into categories like "Product/UI/Performance"
3. **Graph updates** showing relationships between feedback topics
4. **Statistics update** showing category counts

## Example Feedback to Try

- "Great app but the UI is confusing"
- "Too expensive for what it offers"
- "Perfect app, love everything about it"

Watch the graph change as you submit different feedback!

## Troubleshooting

**If ports 8000/3000 show "in use":**

- Don't worry - the system will automatically use 8003/3001 instead

**If "Access is denied" when killing processes:**

- The system will work around locked processes automatically

**If nothing happens:**

- Check the CMD windows that opened - they'll show any errors

**To manually start:**

```bash
# Backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003

# Frontend (new terminal)
cd frontend
npm run dev
```

Still having issues? Check the individual CMD windows for error messages.
