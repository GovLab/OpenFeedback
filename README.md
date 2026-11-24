# OpenFeedback

**AI-assisted civic feedback: helps governments listen better, and act faster.**

![OpenFeedback in 20 seconds: a resident's comment, the assistant's follow-up, the AI's classification, and the staff dashboard](docs/openfeedback-launch.gif)

*A resident's comment, the assistant's follow-up, the AI's classification, and the staff dashboard, shown with sample parks and playgrounds data. [Version with sound (mp4)](docs/openfeedback-launch.mp4).*

OpenFeedback collects resident feedback about a city service, asks follow-up questions when a comment is too vague to act on, files every comment under the city's own categories, and shows staff the patterns on a dashboard. It ships with three topics (permits, parks and playgrounds, and housing conditions and extreme heat), and the categories for each are edited by staff, not hardcoded.

## What it does

- **Residents** fill in a short, accessible form. If the comment is vague ("the AC is broken"), an assistant asks what a city worker would need to know (where, since when, who was contacted).
- **Every submission is kept.** Spam or off-topic comments are filed under *Not Relevant* instead of being rejected, and if the AI step fails the text is stored as *Unclassified* so nothing is lost.
- **The AI classifies** each comment: category and subcategory, item type, department, urgency, impact, sentiment, language and a one-line summary, all from the active configuration.
- **Staff** see totals, a network graph of categories and comments, and a searchable table, and can upload a PDF, TXT or DOCX of letters or transcripts that is split into separate items and classified the same way.
- **Staff edit the categories** in the System Configuration tab. Every change is a new version, so old feedback keeps the labels it was given.

| Resident form | Assistant follow-up | Staff dashboard |
|---|---|---|
| <img alt="Resident feedback form" src="https://github.com/user-attachments/assets/3647180a-120f-4270-96a3-1aba3af0b2b9"> | <img alt="Assistant asking a follow-up question" src="https://github.com/user-attachments/assets/14f8b5bf-271a-47cb-983a-15ca9300a61d"> | <img alt="Feedback network graph on the staff dashboard" src="https://github.com/user-attachments/assets/09e38f69-7e3b-4421-860f-f5193596204e"> |

## How it works

```
Resident form ──► /api/feedback-agent  (follow-up questions)
              └─► /api/submit-feedback ──► relevance check ─► classification ─┬─► PostgreSQL (full record, staff table)
                                                                              └─► Neo4j      (category graph)
Staff dashboard (/govt) ──► /api/stats, /api/graph, /api/postgres/feedback, /api/upload-feedback, /api/config
```

- **Front end:** Next.js, exported as a static site. Every API response is validated with Zod.
- **Back end:** FastAPI. AI replies are validated with Pydantic against the active configuration's labels. Classification uses the OpenAI API.
- **Storage:** each record goes to PostgreSQL and Neo4j. If one store fails the record is kept in the other; if both fail the resident sees an error and the save is retried.
- **Privacy:** resident feedback text is never written to the server logs.
- **Staff access:** one shared staff password unlocks the dashboard and every staff-only endpoint. Public endpoints are rate limited.

The full API is documented at `/docs` (Swagger UI) when the back end is running.

## Topics

One setting, `TOPIC`, picks what the app asks about. It must match on both sides: `TOPIC` for the back end and `NEXT_PUBLIC_TOPIC` for the front end.

| `TOPIC` | Resident question | What the assistant looks for |
|---|---|---|
| `permits` (code default) | "How was your experience with permitting?" | Permit type, cost, delays, process problems |
| `parks` | "How could your local park or playground be better?" | Park feature, location, safety, upkeep, access |
| `housing` | "How can the City help with housing conditions or extreme heat where you live?" | Issue area, neighborhood or building, how long, who was contacted |

- The AI wording for each topic is in `backend/app/topics.py`, and the assistant's background notes are in `backend/app/context/<topic>/`.
- The screen wording is in `frontend/lib/topic.ts`.
- The categories are not in code. They are versions in the System Configuration tab, so switching topic also means activating that topic's configuration. `backend/schema.sql` starts with the permits configuration, and `backend/seed/parks_config.json` and `backend/seed/housing_config.json` hold the other two.

To add a topic, add a profile to `topics.py`, a folder of background notes under `backend/app/context/`, screen wording to `topic.ts`, and a configuration file.

### Sample data

`backend/seed/seed_demo.py` publishes a configuration and then submits made-up feedback through the public form endpoint, so every item gets the same AI classification a real submission would:

```bash
STAFF_PASSWORD=... python3 backend/seed/seed_demo.py --api http://localhost:8003 \
  --config backend/seed/housing_config.json --config-notes "Housing and heat sample data" \
  --feedback backend/seed/housing_feedback.json
```

All seed feedback is invented for demos. Set `NEXT_PUBLIC_SAMPLE_DATA_NOTICE=true` to label the dashboard "Sample Data".

## Running it locally

### 1. Install the tools
- **Python 3.11+**: https://www.python.org/downloads/ (on Windows, tick "Add Python to PATH")
- **Node.js 20+**: https://nodejs.org/ (the LTS version)
- **Docker Desktop**: https://www.docker.com/products/docker-desktop/ (runs both databases)
- An **OpenAI API key**: https://platform.openai.com/api-keys

### 2. Start the databases

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432 and Neo4j on port 7687, both bound to localhost, with the passwords already set in `backend/.env.example`. On its first start against an empty database, the back end applies `backend/schema.sql`.

### 3. Set up the back end

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env.local
```

Then open `backend/.env.local` and fill in:
- `OPENAI_API_KEY`
- `STAFF_PASSWORD`: any password; you type it to open the staff dashboard
- `SESSION_SECRET`: a long random string, for example the output of `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`

### 4. Set up the front end

```bash
cd frontend
npm install
cp .env.example .env.local
```

### 5. Start the app

From the repo root, with the back end's virtual environment active:

- **Mac/Linux:** `./start-app.sh` (Ctrl+C stops both servers)
- **Windows:** `start-app.bat` (each server opens in its own window)

Or run them in two terminals: `cd backend && python -m uvicorn app.main:app --port 8003 --reload` and `cd frontend && npm run dev`.

### 6. Use it
- Resident form: http://localhost:3000
- Staff dashboard: http://localhost:3000/govt (asks for `STAFF_PASSWORD`)
- API docs: http://localhost:8003/docs

### Tests

```bash
cd backend && python -m pytest -q
cd frontend && npm run typecheck && npm run build
```

CI runs the same checks on every pull request (`.github/workflows/ci.yml`).

## Configuration

### Back end

Read from `backend/.env.local` locally, or from the environment in a deployment. The app refuses to start if a required value is missing or `SESSION_SECRET` is shorter than 32 characters.

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | yes | Classification, the follow-up assistant, and splitting uploaded files |
| `AWS_NEO4J_URI`, `AWS_NEO4J_USERNAME`, `AWS_NEO4J_PASSWORD` | yes | Neo4j connection (Bolt URI and login) |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | yes | PostgreSQL connection (port defaults to 5432) |
| `STAFF_PASSWORD` | yes | Shared password for the staff dashboard |
| `SESSION_SECRET` | yes | Signs staff login tokens (at least 32 characters) |
| `TOPIC` | no, default `permits` | `permits`, `parks` or `housing`; must match `NEXT_PUBLIC_TOPIC` |
| `CORS_ALLOWED_ORIGINS` | no, default `http://localhost:3000,http://localhost:3001` | Comma-separated front-end origins allowed to call the API |

### Front end

These are compiled into the static site, so changing one needs a rebuild.

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8003` | Back-end base URL |
| `NEXT_PUBLIC_TOPIC` | `permits` | Screen wording for the topic; must match the back end's `TOPIC` |
| `NEXT_PUBLIC_SAMPLE_DATA_NOTICE` | `false` | `true` labels the dashboard "Sample Data" |

## Deploying to AWS

`terraform/demo/` deploys the whole stack to one AWS region: the static front end on Amplify, the API on App Runner, and PostgreSQL and Neo4j in private subnets that only the API can reach, for about $45 a month. Terraform generates every password and keeps it in Secrets Manager. See [terraform/demo/README.md](terraform/demo/README.md).

## Troubleshooting

- **The back end won't start:** run `docker compose ps` and check both `postgres` and `neo4j` are running, and that `backend/.env.local` has every required value. The error message names any missing setting.
- **"relation ... does not exist":** the back end couldn't reach PostgreSQL when it started. Start the databases, then restart the back end.
- **Port already in use:** stop whatever is using port 8003 (back end). If port 3000 is busy, Next.js moves to 3001 and says so in its output.
- **The assistant never asks a follow-up:** check `OPENAI_API_KEY`. Without it the form still submits, but nothing is classified.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

## Authors and acknowledgments

- Built by the OpenFeedback team: [Arnav Jaiswal](https://github.com/ShadowMasterAJ), [Isabella Iype](https://isabellaiype.com) and Dhruv Kamalesh Kumar
- In partnership with the Burnes Center for Social Change, for the City of Boston
