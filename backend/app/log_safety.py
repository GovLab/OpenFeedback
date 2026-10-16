"""Log helpers for lines that must never carry resident text.

Feedback text, uploaded documents, contact details and model replies that echo
them stay out of the server log. Log lengths, counts, ids and error types
instead. Exception messages are left out too: database and API errors often
echo the row or request they failed on.
"""
import os
import traceback


def describe_error(error: BaseException) -> str:
    """The error type and the innermost code location, for example 'IntegrityError at feedback_pipeline.py:127'."""
    frames = traceback.extract_tb(error.__traceback__)
    if not frames:
        return type(error).__name__
    innermost = frames[-1]
    return f"{type(error).__name__} at {os.path.basename(innermost.filename)}:{innermost.lineno}"


def file_extension(filename: str | None) -> str:
    """Only the extension of an uploaded file name, which can itself contain a name."""
    return os.path.splitext(filename or "")[1].lower() or "(none)"
