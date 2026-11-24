# Contributing to OpenFeedback

Thanks for helping. Bug reports, fixes, new topics and accessibility improvements are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.

## Local setup

Follow "Running it locally" in the [README](README.md). You need Python 3.11+, Node 20+, Docker and an OpenAI API key.

## Making a change

1. Branch from `main`.
2. Keep changes focused, and match the style of the code around them.
3. Run the checks:
   ```bash
   cd backend && python -m pytest -q
   cd frontend && npm run typecheck && npm run build
   ```
4. For front-end changes, keep the app at WCAG 2.2 AA: label every control, keep keyboard access working, and check colour contrast.
5. Never commit secrets, `.env.local` files, Terraform state or real resident feedback. Sample data must be clearly invented.
6. Use a conventional commit message (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) and open a pull request describing what changed and how you tested it.

## Adding a topic

See the "Topics" section of the README: a profile in `backend/app/topics.py`, background notes in `backend/app/context/<topic>/`, screen wording in `frontend/lib/topic.ts`, and a configuration file in `backend/seed/`.
