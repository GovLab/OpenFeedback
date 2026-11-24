# 🗣️ OpenFeedback

**An AI-powered civic feedback system that helps governments listen better — and act faster.**

![OpenFeedback in 20 seconds: a resident's comment, the chatbot's follow-up, the AI's classification, and the staff dashboard](docs/openfeedback-launch.gif)

*A resident's comment, the chatbot's follow-up, the AI's classification, and the staff dashboard. Shown with sample parks and playgrounds data. [Version with sound (mp4)](docs/openfeedback-launch.mp4).*

OpenFeedback is a full-stack web application that collects, clarifies, classifies, and visualizes constituent feedback about city services. The default topic is permits; a parks and playgrounds topic is included (see Topics). It transforms unstructured public input into structured, actionable insights using AI and a graph database, enabling city staff to identify patterns, prioritize issues, and ensure no feedback is lost.

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
- Optional contact information for follow-up  
- Every submission is accepted. Off-topic or spam submissions are filed under Not Relevant, not rejected (see below)  

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
- Uses generative AI to file feedback under the categories in the active system configuration. Categories are edited in the **System Configuration** tab, not in code
- Extracts metadata such as urgency, sentiment, and affected department  
- **Not Relevant:** off-topic, spam, abusive or empty submissions are stored, not rejected. They are filed under *Not Relevant* and are not routed to a department
- **Unclassified:** if the AI step fails, the text is still stored under *Unclassified* so nothing is lost
- Both categories are always shown in the graph with a legend entry
- Staff batch uploads (PDF, TXT or DOCX) go through the same classification and storage path

---

### 🕸️ Graph-Based Visualization (Neo4j)
- Feedback is stored and visualized as a graph  
- Nodes represent feedback, themes, categories, and attributes  
- Relationships reveal recurring issues and cross-department patterns  

📸 **Neo4j graph visualization:**  
<img width="1419" height="714" alt="Graph" src="https://github.com/user-attachments/assets/09e38f69-7e3b-4421-860f-f5193596204e" />

---

### 📊 Staff Insights & Analytics
- Statistics and the graph load when the dashboard opens, and again after a batch upload finishes  
- Enables pattern detection across time, categories, and volume  
- Designed to support staff dashboards and executive reporting  

📸 **Staff Dashboard / Analytics View:** 
<img width="1418" height="683" alt="Table View" src="https://github.com/user-attachments/assets/613338ab-e1f5-4071-99d2-99c56a14ff91" />


---

## Topics

The app was built for permit feedback, and can also run as a parks and playgrounds tool or a housing conditions and extreme heat tool. One setting, `TOPIC`, picks which:

| `TOPIC` | Resident question | What the AI looks for |
|---|---|---|
| `permits` (default) | "How was your experience with permitting?" | Permit type, cost, delays, process problems |
| `parks` | "How could your local park or playground be better?" | Park feature, location, safety, upkeep, access |
| `housing` | "How can the City help with housing conditions or extreme heat where you live?" | Issue area, neighborhood or building, how long, who was contacted |

- **Back end:** set `TOPIC` in `backend/.env.local`. The topic-specific AI wording lives in `backend/app/topics.py`, and the chatbot's background notes are in `backend/app/context/<topic>/`.
- **Front end:** set `NEXT_PUBLIC_TOPIC` to the same value (the screen wording is in `frontend/lib/topic.ts`).
- **Categories:** the category lists themselves are not in code. They're versions in the **System Configuration** tab, so switching topic also means activating that topic's config version (v1 is permits, `backend/seed/parks_config.json` is parks, and `backend/seed/housing_config.json` is housing).

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

This starts PostgreSQL on port 5432 and Neo4j on port 7687, with the passwords already set in `backend/.env.example`. When the backend starts against an empty database, it applies `backend/schema.sql` (tables, enums and the starting configuration). It does not reseed a database that already has tables.

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
- Resident form: http://localhost:3000 (Next.js uses 3001 if 3000 is busy)
- Staff dashboard: http://localhost:3000/govt (asks for `STAFF_PASSWORD`)

---

## Configuration

### Backend environment variables

Read from `backend/.env.local` locally, or from the App Runner service in AWS. The app refuses to start if a required value is missing or `SESSION_SECRET` is shorter than 32 characters.

| Variable | Required | Purpose | Where it comes from in the AWS demo |
|---|---|---|---|
| `OPENAI_API_KEY` | yes | Classification, the follow-up assistant, and batch segmentation | Secrets Manager (`openai` secret) |
| `AWS_NEO4J_URI`, `AWS_NEO4J_USERNAME`, `AWS_NEO4J_PASSWORD` | yes | Neo4j graph database (Bolt URI and login) | Secrets Manager |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | yes | PostgreSQL database (port defaults to 5432) | Secrets Manager |
| `STAFF_PASSWORD` | yes | Shared password for the staff dashboard | Secrets Manager |
| `SESSION_SECRET` | yes | Signs staff login tokens (at least 32 characters) | Secrets Manager |
| `TOPIC` | no, default `permits` | `permits`, `parks` or `housing`; must match `NEXT_PUBLIC_TOPIC` | Terraform variable `topic` |
| `CORS_ALLOWED_ORIGINS` | no, default `http://localhost:3000,http://localhost:3001` | Comma-separated frontend origins allowed to call the API | Set to the Amplify frontend URL |
| `USE_SECRETS_MANAGER`, `SECRET_NAME`, `AWS_REGION` | no, legacy | Load settings from AWS Secrets Manager instead of environment variables. Only the older `terraform/prod` and `terraform/test` environments use these | Not used by `terraform/demo` |

### Frontend environment variables

These are compiled into the static site at build time, so changing one needs a rebuild.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8003` | Backend base URL. `terraform/demo/deploy.sh` sets it to the App Runner URL |
| `NEXT_PUBLIC_TOPIC` | `permits` | Screen wording for the chosen topic; must match the backend `TOPIC` |
| `NEXT_PUBLIC_SAMPLE_DATA_NOTICE` | `false` | `true` labels the dashboard "Sample Data" |

---

## Deploying to AWS

`terraform/demo/` holds the current AWS setup (us-east-1): a static front end on Amplify, the API on App Runner, and PostgreSQL and Neo4j in private subnets that only the API can reach. See [terraform/demo/README.md](terraform/demo/README.md). The older `terraform/prod` and `terraform/test` folders are kept for reference only. Their guide, `terraform/README.md`, describes those older environments and does not apply to `terraform/demo`.

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
- Nothing switches ports automatically. Stop the other process using port 8003 (backend) or 3000 (frontend), then start again

### Nothing shows up in the browser
- Try http://localhost:3001 if http://localhost:3000 did not open
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

1. The resident types feedback. Before submitting, the follow-up assistant (`/api/feedback-agent`) may ask one or more questions. If the assistant is unavailable, the form submits anyway
2. On submit (`/api/submit-feedback`), the AI files the feedback under the active configuration's categories, tags it Not Relevant if needed, and records which configuration version it used
3. The result is saved to both databases:
   - **PostgreSQL** stores the full record (text, timestamps, AI analysis) for the staff table
   - **Neo4j** stores the category links for the graph visualization
   - If one database fails, the record is kept in the other and the failure is logged. If both fail, the full text is logged so it can be recovered, and the resident gets an error
4. The staff dashboard reads both stores and shows the graph, statistics and table. If a store cannot be read, the dashboard shows an error rather than zeros


## Authors and Acknowledgments
- Built by the OpenFeedback team
-   [Arnav Jaiswal](https://github.com/ShadowMasterAJ).
-   [Isabella Iype](https://isabellaiype.com).
-   In partnership with the Burnes Center for Social Change
-   For the City of Boston




