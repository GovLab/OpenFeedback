"""Batch upload segmentation: the model may wrap its JSON in a Markdown fence. No network, no keys."""
import asyncio
import os
from types import SimpleNamespace

# Dummy settings so app.config loads; the OpenAI client is replaced in every test.
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

import pytest  # noqa: E402

from app import file_processor  # noqa: E402
from app.file_processor import FileProcessor, strip_code_fence  # noqa: E402

SEGMENTS = [
    "The playground swing set near the east gate has a broken chain.",
    "Parking at the community center is impossible on weekday evenings.",
    "The water fountain by the ball field has not worked since June.",
]


def _fake_client(content):
    message = SimpleNamespace(content=content)
    response = SimpleNamespace(choices=[SimpleNamespace(message=message)])
    completions = SimpleNamespace(create=lambda **kwargs: response)
    return SimpleNamespace(chat=SimpleNamespace(completions=completions))


def _segment(monkeypatch, model_output):
    monkeypatch.setattr(file_processor, "client", _fake_client(model_output))
    return asyncio.run(FileProcessor.segment_text_into_feedbacks("whole uploaded document"))


def test_fenced_json_array_splits_into_separate_items(monkeypatch):
    import json
    fenced = "```json\n" + json.dumps(SEGMENTS, indent=2) + "\n```"
    assert _segment(monkeypatch, fenced) == SEGMENTS


def test_bare_fence_without_language_tag_is_accepted(monkeypatch):
    import json
    fenced = "```\n" + json.dumps(SEGMENTS) + "\n```"
    assert _segment(monkeypatch, fenced) == SEGMENTS


def test_plain_json_array_still_works(monkeypatch):
    import json
    assert _segment(monkeypatch, json.dumps(SEGMENTS)) == SEGMENTS


def test_unparseable_response_still_falls_back_to_whole_text(monkeypatch):
    assert _segment(monkeypatch, "```json\nnot json at all\n```") == ["whole uploaded document"]


def test_strip_code_fence_leaves_plain_text_alone():
    assert strip_code_fence('["a"]') == '["a"]'
    assert strip_code_fence('```json\n["a"]\n```') == '["a"]'
