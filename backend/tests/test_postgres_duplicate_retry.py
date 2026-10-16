"""A retried Postgres write whose first commit actually landed must count as saved."""
import uuid
from contextlib import contextmanager

import pytest
from sqlalchemy.exc import IntegrityError

from app.postgres_db import PostgresDB

FEEDBACK_ID = str(uuid.uuid4())


def _db_whose_insert_hits_the_primary_key(row_exists: bool) -> PostgresDB:
    db = PostgresDB.__new__(PostgresDB)
    db.engine = object()
    db.SessionLocal = object()

    @contextmanager
    def failing_session():
        raise IntegrityError("INSERT", {}, Exception("duplicate key value violates unique constraint"))
        yield  # pragma: no cover

    db.get_session = failing_session
    db.feedback_exists = lambda _id: row_exists
    return db


def test_duplicate_key_on_retry_counts_as_saved_when_the_row_exists():
    db = _db_whose_insert_hits_the_primary_key(row_exists=True)
    assert db.add_feedback({"issue_description": "x"}, feedback_id=FEEDBACK_ID) == FEEDBACK_ID


def test_duplicate_key_is_still_an_error_when_the_row_is_missing():
    db = _db_whose_insert_hits_the_primary_key(row_exists=False)
    with pytest.raises(IntegrityError):
        db.add_feedback({"issue_description": "x"}, feedback_id=FEEDBACK_ID)
