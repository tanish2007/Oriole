"""Shared fixtures for chore (and other) API tests.

Uses the in-memory DemoClient so nothing hits Supabase. Auth middleware is
short-circuited to a fixed demo user.
"""

from __future__ import annotations

import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Avoid a real Supabase client if .env is loaded in this shell.
os.environ.pop("SUPABASE_URL", None)
os.environ.pop("SUPABASE_KEY", None)

from db import _shared_demo_client  # noqa: E402
from main import app  # noqa: E402
from memory import demo_client  # noqa: E402


DEMO_USER = {"id": 1, "name": "Jennifer Ye", "email": "jennifer@example.com"}


@pytest.fixture
def db():
    """Fresh in-memory tables for each test."""
    return demo_client()


@pytest.fixture
def client(db, monkeypatch) -> Generator[TestClient, None, None]:
    _shared_demo_client.cache_clear()

    monkeypatch.setattr("chores.get_supabase", lambda: db)
    monkeypatch.setattr("db.get_supabase", lambda: db)
    monkeypatch.setattr("auth.get_supabase", lambda: db)

    def fake_verify(_authorization: str | None) -> dict:
        return {"auth_id": "demo-auth", "email": DEMO_USER["email"], "name": DEMO_USER["name"]}

    def fake_user(_identity: dict) -> dict:
        return dict(DEMO_USER)

    monkeypatch.setattr("auth.verify_token", fake_verify)
    monkeypatch.setattr("auth.find_or_create_user", fake_user)

    with TestClient(app) as test_client:
        yield test_client

    _shared_demo_client.cache_clear()


@pytest.fixture
def auth_header() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def as_user(monkeypatch):
    """Switch the authenticated user mid-test: as_user(2)."""

    def _switch(user_id: int, name: str = "Member", email: str | None = None) -> dict:
        user = {
            "id": user_id,
            "name": name,
            "email": email or f"user{user_id}@example.com",
        }

        def fake_verify(_authorization: str | None) -> dict:
            return {"auth_id": f"auth-{user_id}", "email": user["email"], "name": user["name"]}

        def fake_user(_identity: dict) -> dict:
            return dict(user)

        monkeypatch.setattr("auth.verify_token", fake_verify)
        monkeypatch.setattr("auth.find_or_create_user", fake_user)
        return user

    return _switch
