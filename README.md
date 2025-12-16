# 🗣️ OpenFeedback

**An AI-powered civic feedback system that helps governments listen better — and act faster.**

OpenFeedback is a full-stack web application that collects, clarifies, classifies, and visualizes constituent feedback about permitting experiences. It transforms unstructured public input into structured, actionable insights using AI and a graph database, enabling city staff to identify patterns, prioritize issues, and ensure no feedback is lost.

---

## 🌍 What OpenFeedback Does

OpenFeedback bridges the gap between **how residents share feedback** and **how governments act on it**.

- Residents submit feedback through a simple, accessible form  
- An AI assistant asks clarifying questions to improve data quality  
- Feedback is automatically classified into standardized categories  
- A graph-based dashboard visualizes themes, relationships, and trends  
- Staff can spot systemic issues instead of reacting to one-off complaints  

---

## 🧭 Core Features

### 📝 Constituent Feedback Intake
- Short, mobile-friendly feedback form  
- Optional file uploads (screenshots, PDFs)  
- Optional contact information for follow-up  
- Designed to be embedded directly into Boston.gov permit pages  

📸 **Constituent Facing Form:**  
<img width="1430" height="707" alt="Main Page" src="https://github.com/user-attachments/assets/3647180a-120f-4270-96a3-1aba3af0b2b9" />

---

### 🤖 AI-Assisted Feedback Clarification
- Friendly chatbot asks follow-up questions when feedback is vague  
- Improves clarity at submission time (e.g., “Which step caused confusion?”)  
- Reduces staff time spent interpreting unclear comments  

📸 **Chatbot Clarification Flow:**  
<img width="542" height="369" alt="Chatbot" src="https://github.com/user-attachments/assets/14f8b5bf-271a-47cb-983a-15ca9300a61d" />

---

### 🧠 Automated Classification
- Uses generative AI to categorize feedback into city-defined issue areas:
  - Process & Operations  
  - Policy / Rules Clarity  
  - Economic & Equity Concerns  
  - Communication & Service  
- Extracts metadata such as urgency, sentiment, and affected department  

---

### 🕸️ Graph-Based Visualization (Neo4j)
- Feedback is stored and visualized as a graph  
- Nodes represent feedback, themes, categories, and attributes  
- Relationships reveal recurring issues and cross-department patterns  

📸 **Neo4j graph visualization:**  
<img width="1419" height="714" alt="Graph" src="https://github.com/user-attachments/assets/09e38f69-7e3b-4421-860f-f5193596204e" />

---

### 📊 Staff Insights & Analytics
- Live statistics update as new feedback arrives  
- Enables pattern detection across time, categories, and volume  
- Designed to support staff dashboards and executive reporting  

📸 **Staff Dashboard / Analytics View:** 
<img width="1418" height="683" alt="Table View" src="https://github.com/user-attachments/assets/613338ab-e1f5-4071-99d2-99c56a14ff91" />


---

## Step 1: Install Required Software

Before starting, you need to install these programs on your computer:

### Python (version 3.11 or newer)
- Go to https://www.python.org/downloads/
- Download and run the installer
- **Important:** Check the box that says "Add Python to PATH" during installation

### Node.js (version 20 or newer)
- Go to https://nodejs.org/
- Download the "LTS" version and run the installer

### PostgreSQL (the main database)
- Go to https://www.postgresql.org/download/
- Download and run the installer for your operating system
- During installation:
  - Remember the password you set for the "postgres" user
  - Keep the default port (5432)
- After installation, open **pgAdmin** (installed with PostgreSQL) or the **SQL Shell (psql)**
- Create a new database called `openfeedback`:
  - In pgAdmin: Right-click "Databases" → "Create" → "Database" → name it `openfeedback`
  - In psql: Run `CREATE DATABASE openfeedback;`

### Neo4j Desktop (the graph database)
- Go to https://neo4j.com/download/
- Create a free account and download Neo4j Desktop
- Install and open Neo4j Desktop
- Click "New" → "Create project"
- Inside your project, click "Add" → "Local DBMS"
- Set a password you'll remember (you'll need it later)
- Click "Create" then click "Start" to run the database

---

## Step 2: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy and save the key somewhere safe (you'll only see it once!)

---

## Step 3: Configure the App

1. Open the project folder in File Explorer
2. Go into the `backend` folder
3. Create a new text file and name it exactly `.env.local` (include the dot at the start)
4. Open the file and paste this, replacing the placeholder values with your actual credentials:

```
# OpenAI
OPENAI_API_KEY=paste_your_openai_key_here

# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=openfeedback
POSTGRES_USER=postgres
POSTGRES_PASSWORD=the_password_you_set_during_postgres_installation

# Neo4j Database
AWS_NEO4J_URI=bolt://localhost:7687
AWS_NEO4J_USERNAME=neo4j
AWS_NEO4J_PASSWORD=the_password_you_set_for_neo4j
```

5. Save and close the file

---

## Step 4: Set Up Database Tables

The database needs tables created before the app can store data.

### Using pgAdmin (recommended for beginners):

1. In pgAdmin, expand your server → expand "Databases" → click on `openfeedback`
2. Right-click on `openfeedback` and select "Query Tool"
3. Open the file `backend/schema.sql` from the project folder (File → Open)
4. Click the "Execute" button (▶) to run it

You should see "CREATE TABLE" and "INSERT" messages — that means it worked!

### Using psql (command line):

```bash
cd backend
psql -U postgres -d openfeedback -f schema.sql
```

---

## Step 5: Start the App

Make sure both databases are running:
- PostgreSQL should start automatically after installation
- Neo4j should show green "Started" status in Neo4j Desktop

Then start the app:

**On Windows:**
- Double-click `start-app.bat` in the project folder

**On Mac/Linux:**
- Open Terminal in the project folder
- Run: `./start-app.sh`

Wait about 30 seconds for everything to start up.

---

## Step 6: Use the App

1. Open your web browser
2. Go to http://localhost:3000
3. Type some feedback in the box
4. Click Submit
5. Watch the AI classify your feedback and update the graph!
---

## Troubleshooting

### The app won't start
- Make sure PostgreSQL is running (check Services on Windows, or run `pg_isready` in terminal)
- Make sure Neo4j Desktop shows your database as "Started" (green)
- Check that your `.env.local` file is in the `backend` folder with the correct values

### Database connection errors
- Double-check your passwords in the `.env.local` file match what you set during installation
- Make sure PostgreSQL is using port 5432 (the default)
- Make sure Neo4j is using port 7687 (the default)

### "relation feedback2 does not exist" or similar table errors
- You skipped Step 4! Go back and run schema.sql in pgAdmin

### "Port already in use" messages
- This is normal! The app automatically switches to backup ports (8003/3001)

### Nothing shows up in the browser
- Try http://localhost:3001 (sometimes it uses a different port)
- Check the terminal windows for error messages

### Manual startup (if the script doesn't work)

Open two separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## How It Works

1. You type feedback into the web app
2. The AI (OpenAI GPT) reads it and decides what categories it fits (like "Product", "UI", "Performance")
3. The results get saved to both databases:
   - **PostgreSQL** stores the full feedback details (text, timestamps, AI analysis)
   - **Neo4j** stores the relationships between categories for the graph visualization
4. The interactive graph updates to show your feedback and how topics connect


## Authors and Acknowledgments
- Built by the OpenFeedback team
-   [Arnav Jaiswal](https://github.com/ShadowMasterAJ).
-   [Isabella Iype](https://isabellaiype.com).
-   In partnership with the Burnes Center for Social Change
-   For the City of Boston




