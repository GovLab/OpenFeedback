"""Shared test setup: dummy settings, and no test can reach a real database.

Settings are read from the environment when app.config is first imported, so
the dummy values are set here before any test module imports the app. They are
forced (not defaulted) so a developer's real .env.local is never used.
"""
import os
import sys
from unittest.mock import MagicMock

import pytest

os.environ.update({
    "OPENAI_API_KEY": "test-key",
    "AWS_NEO4J_URI": "bolt://127.0.0.1:1",
    "AWS_NEO4J_USERNAME": "test",
    "AWS_NEO4J_PASSWORD": "test",
    "POSTGRES_HOST": "127.0.0.1",
    "POSTGRES_PORT": "1",
    "POSTGRES_DB": "test",
    "POSTGRES_USER": "test",
    "POSTGRES_PASSWORD": "test",
    "STAFF_PASSWORD": "test-staff-password",
    "SESSION_SECRET": "t" * 40,
})

# Modules that hold a reference to a database handle. Patched for every test.
DATABASE_HOLDERS = ("app.database", "app.postgres_db", "app.feedback_pipeline", "app.main")


@pytest.fixture(autouse=True)
def no_real_databases(monkeypatch):
    """Replace both database handles with mocks, so no test opens a connection."""
    import app.main  # noqa: F401  (imports every module in DATABASE_HOLDERS)

    fake_postgres, fake_neo4j = MagicMock(name="postgres_db"), MagicMock(name="neo4j_db")
    for module_name in DATABASE_HOLDERS:
        module = sys.modules.get(module_name)
        if module is None:
            continue
        if hasattr(module, "postgres_db"):
            monkeypatch.setattr(module, "postgres_db", fake_postgres)
        if hasattr(module, "db"):
            monkeypatch.setattr(module, "db", fake_neo4j)
    yield
