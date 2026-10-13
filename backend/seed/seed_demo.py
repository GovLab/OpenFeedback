"""
Load demo data into a running OpenFeedback API.

  STAFF_PASSWORD=... python seed/seed_demo.py --api https://<api-host> \
      --config seed/parks_config.json --feedback seed/parks_feedback.json

1. Publishes the config file as a new system config version, unless the active
   config already matches it.
2. Submits each feedback item through the public endpoint, so it gets the same
   AI classification a real resident's submission would.

Standard library only, so it runs without the backend's virtualenv.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

# The public endpoints allow 20 requests/minute per IP
SECONDS_BETWEEN_SUBMISSIONS = 3.2
CONFIG_KEYS = ["categories", "permit_types", "departments", "impact_types",
               "urgency_levels", "sentiment_options", "priority_levels"]


def call(api: str, method: str, path: str, body=None, token: str = None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(f"{api}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read())


def publish_config(api: str, token: str, config: dict, notes: str) -> None:
    active = call(api, "GET", "/api/config", token=token)
    if all(active["config_data"].get(key) == config.get(key) for key in CONFIG_KEYS):
        print(f"Active config v{active['version']} already matches; not publishing a new version")
        return
    result = call(api, "PUT", "/api/config", token=token,
                  body={"config_data": config, "created_by": "seed_demo.py", "change_notes": notes})
    print(f"Published config v{result['version']}")


def submit_feedback(api: str, items: list) -> int:
    failures = 0
    for index, item in enumerate(items, 1):
        try:
            result = call(api, "POST", "/api/submit-feedback", body=item)
            categories = ", ".join(result.get("category_map", {})) or "none"
            print(f"[{index}/{len(items)}] {result.get('permit_type')} | {categories}")
        except urllib.error.HTTPError as e:
            failures += 1
            print(f"[{index}/{len(items)}] FAILED ({e.code}): {item['text'][:60]}...", file=sys.stderr)
        time.sleep(SECONDS_BETWEEN_SUBMISSIONS)
    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api", required=True, help="API base URL, no trailing slash")
    parser.add_argument("--config", help="System config JSON to publish first")
    parser.add_argument("--config-notes", default="Demo data config")
    parser.add_argument("--feedback", required=True, help="JSON list of {text, contact_info?}")
    args = parser.parse_args()

    password = os.environ.get("STAFF_PASSWORD")
    if not password:
        print("Set STAFF_PASSWORD in the environment", file=sys.stderr)
        return 1

    api = args.api.rstrip("/")
    token = call(api, "POST", "/api/staff/login", body={"password": password})["token"]

    if args.config:
        with open(args.config) as f:
            publish_config(api, token, json.load(f), args.config_notes)

    with open(args.feedback) as f:
        items = json.load(f)
    failures = submit_feedback(api, items)
    print(f"Done: {len(items) - failures} submitted, {failures} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
