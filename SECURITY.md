# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately through GitHub instead: on this repository, open the **Security** tab and choose **Report a vulnerability**.

Include what you found, how to reproduce it, and what an attacker could do with it. We will acknowledge the report, keep you updated while we fix it, and credit you when the fix ships if you would like.

## Scope

This covers the code in this repository: the Next.js front end, the FastAPI back end, and the Terraform in `terraform/demo`. Any deployment someone else runs from this code is theirs to secure.

## Handling resident data

OpenFeedback stores what residents write. If you run it:
- keep `STAFF_PASSWORD` and `SESSION_SECRET` out of source control (use `backend/.env.local` locally and a secret manager in production);
- keep the databases off the public internet, as `terraform/demo` does;
- do not add logging of feedback text; a test (`backend/tests/test_resident_text_logs.py`) guards against it.
