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

## Topics

The app was built for permit feedback, and can also run as a parks and playgrounds feedback tool. One setting, `TOPIC`, picks which:

| `TOPIC` | Resident question | What the AI looks for |
|---|---|---|
| `permits` (default) | "How was your experience with permitting?" | Permit type, cost, delays, process problems |
| `parks` | "How could your local park or playground be better?" | Park feature, location, safety, upkeep, access |

- **Back end:** set `TOPIC` in `backend/.env.local`. The topic-specific AI wording lives in `backend/app/topics.py`, and the chatbot's background notes are in `backend/app/context/<topic>/`.
- **Front end:** set `NEXT_PUBLIC_TOPIC` to the same value (the screen wording is in `frontend/lib/topic.ts`).
- **Categories:** the category lists themselves are not in code. They're versions in the **System Configuration** tab, so switching topic also means activating that topic's config version (v1 is permits, and `backend/seed/parks_config.json` is parks).

### Demo data
`backend/seed/seed_demo.py` publishes a config file and then submits made-up feedback through the public form endpoint, so every item gets real AI classification:

```bash
STAFF_PASSWORD=... python3 backend/seed/seed_demo.py --api http://localhost:8003 \
  --config backend/seed/parks_config.json --config-notes "Parks & playgrounds demo" \
  --feedback backend/seed/parks_feedback.json
```

Set `NEXT_PUBLIC_SAMPLE_DATA_NOTICE=true` to label the dashboard "Sample Data".

---

## Running It Locally

### 1. Install the tools
- **Python 3.11+**: https://www.python.org/downloads/ (on Windows, tick "Add Python to PATH")
- **Node.js 20+**: https://nodejs.org/ (the LTS version)
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/ (runs both databases for you)

### 2. Start the databases
From the project folder:

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 and Neo4j on port 7687, with the passwords already set in `backend/.env.example`. The backend creates the tables and the starting category list the first time it connects, so there's no SQL to run by hand.

### 3. Configure the backend
```bash
cd backend
cp .env.example .env.local
```

Open `backend/.env.local` and fill in:
- `OPENAI_API_KEY`: from https://platform.openai.com/api-keys
- `STAFF_PASSWORD`: any password; you'll type it to open the staff dashboard
- `SESSION_SECRET`: a long random string, e.g. the output of `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`

### 4. Start the app
**Mac/Linux:** `./start-app.sh`  
**Windows:** double-click `start-app.bat`

### 5. Use it
- Resident form: http://localhost:3000
- Staff dashboard: http://localhost:3000/govt (asks for `STAFF_PASSWORD`)

---

## Deploying to AWS

`terraform/demo/` holds the current AWS setup (us-east-1): a static front end on Amplify, the API on App Runner, and PostgreSQL and Neo4j in private subnets that only the API can reach. See [terraform/demo/README.md](terraform/demo/README.md). The older `terraform/prod` and `terraform/test` folders are kept for reference only.

---

## Troubleshooting

### The app won't start
- Make sure both databases are running: `docker compose ps` should list `postgres` and `neo4j` as running
- Check that your `.env.local` file is in the `backend` folder with the correct values

### Database connection errors
- Double-check your passwords in the `.env.local` file match what you set during installation
- Make sure nothing else on your machine is already using port 5432 or 7687

### "relation feedback2 does not exist" or similar table errors
- The backend couldn't reach PostgreSQL when it started. Check `docker compose ps`, then restart the backend

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




