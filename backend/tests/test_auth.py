from __future__ import annotations

import pytest
from fastapi import HTTPException

from auth import (
    current_user,
    current_user_id,
    find_or_create_user,
    verify_token,
)


class MockUser:
    def __init__(self, uid: str, email: str | None, metadata: dict | None = None):
        self.id = uid
        self.email = email
        self.user_metadata = metadata or {}


class MockAuthResponse:
    def __init__(self, user: MockUser | None):
        self.user = user


class MockAuthService:
    def __init__(self, user: MockUser | None = None, raise_error: bool = False):
        self._user = user
        self._raise_error = raise_error

    def get_user(self, token: str):
        if self._raise_error:
            raise RuntimeError("Expired or invalid JWT")
        return MockAuthResponse(self._user)


class MockSupabaseClient:
    def __init__(self, auth_service=None):
        if auth_service is not None:
            self.auth = auth_service


def test_verify_token_missing_header():
    """Reject requests missing the authorization header."""
    with pytest.raises(HTTPException) as exc:
        verify_token(None)
    assert exc.value.status_code == 401
    assert "sign in required" in exc.value.detail.lower()


def test_verify_token_empty_header():
    """Reject requests with an empty authorization header."""
    with pytest.raises(HTTPException) as exc:
        verify_token("")
    assert exc.value.status_code == 401
    assert "sign in required" in exc.value.detail.lower()


def test_verify_token_invalid_prefix():
    """Reject authorization headers that do not start with Bearer."""
    with pytest.raises(HTTPException) as exc:
        verify_token("Token some-secret-token")
    assert exc.value.status_code == 401
    assert "sign in required" in exc.value.detail.lower()


def test_verify_token_missing_supabase_auth_attribute(monkeypatch):
    """Return 503 if the Supabase client lacks auth configuration."""
    monkeypatch.setattr("auth.get_supabase", lambda: object())
    with pytest.raises(HTTPException) as exc:
        verify_token("Bearer valid-looking-token")
    assert exc.value.status_code == 503
    assert "needs a configured supabase project" in exc.value.detail.lower()


def test_verify_token_supabase_throws_error(monkeypatch):
    """Return 401 when Supabase auth raises an error for an invalid token."""
    mock_client = MockSupabaseClient(MockAuthService(raise_error=True))
    monkeypatch.setattr("auth.get_supabase", lambda: mock_client)
    with pytest.raises(HTTPException) as exc:
        verify_token("Bearer expired-token")
    assert exc.value.status_code == 401
    assert "invalid or expired" in exc.value.detail.lower()


def test_verify_token_user_is_none(monkeypatch):
    """Return 401 when Supabase returns no user for the token."""
    mock_client = MockSupabaseClient(MockAuthService(user=None))
    monkeypatch.setattr("auth.get_supabase", lambda: mock_client)
    with pytest.raises(HTTPException) as exc:
        verify_token("Bearer token-with-empty-user")
    assert exc.value.status_code == 401
    assert "invalid or expired" in exc.value.detail.lower()


def test_verify_token_user_missing_email(monkeypatch):
    """Return 401 when the authenticated user has no email."""
    mock_user = MockUser(uid="auth-1", email=None)
    mock_client = MockSupabaseClient(MockAuthService(user=mock_user))
    monkeypatch.setattr("auth.get_supabase", lambda: mock_client)
    with pytest.raises(HTTPException) as exc:
        verify_token("Bearer token-no-email")
    assert exc.value.status_code == 401
    assert "invalid or expired" in exc.value.detail.lower()


def test_verify_token_extracts_full_name(monkeypatch):
    """Extract user ID, email, and full_name from user metadata."""
    mock_user = MockUser(
        uid="auth-100",
        email="alex@example.com",
        metadata={"full_name": "Alex Johnson"},
    )
    mock_client = MockSupabaseClient(MockAuthService(user=mock_user))
    monkeypatch.setattr("auth.get_supabase", lambda: mock_client)

    identity = verify_token("Bearer token-100")
    assert identity == {
        "auth_id": "auth-100",
        "email": "alex@example.com",
        "name": "Alex Johnson",
    }


def test_verify_token_extracts_name_fallback(monkeypatch):
    """Fallback to name in metadata when full_name is absent."""
    mock_user = MockUser(
        uid="auth-101",
        email="taylor@example.com",
        metadata={"name": "Taylor"},
    )
    mock_client = MockSupabaseClient(MockAuthService(user=mock_user))
    monkeypatch.setattr("auth.get_supabase", lambda: mock_client)

    identity = verify_token("Bearer token-101")
    assert identity["name"] == "Taylor"


def test_verify_token_email_prefix_fallback(monkeypatch):
    """Fallback to the email prefix when no name metadata exists."""
    mock_user = MockUser(
        uid="auth-102",
        email="sammy@example.com",
        metadata={},
    )
    mock_client = MockSupabaseClient(MockAuthService(user=mock_user))
    monkeypatch.setattr("auth.get_supabase", lambda: mock_client)

    identity = verify_token("Bearer token-102")
    assert identity["name"] == "sammy"


def test_find_or_create_user_returns_existing_by_auth_id(db, monkeypatch):
    """Return the existing user when matched by auth_id."""
    monkeypatch.setattr("auth.get_supabase", lambda: db)
    db.table("users").insert(
        {"auth_id": "auth-existing", "email": "exist@example.com", "name": "Existing User"}
    ).execute()

    identity = {"auth_id": "auth-existing", "email": "other@example.com", "name": "Different"}
    user = find_or_create_user(identity)
    assert user["name"] == "Existing User"
    assert user["auth_id"] == "auth-existing"


def test_find_or_create_user_links_existing_email_without_auth_id(db, monkeypatch):
    """Link auth_id to a pre-existing user matched by email."""
    monkeypatch.setattr("auth.get_supabase", lambda: db)
    db.table("users").insert(
        {"auth_id": None, "email": "invited@example.com", "name": "Invited User"}
    ).execute()

    identity = {"auth_id": "auth-linked", "email": "invited@example.com", "name": "Invited User"}
    user = find_or_create_user(identity)
    assert user["email"] == "invited@example.com"

    updated = db.table("users").select("*").eq("email", "invited@example.com").execute().data[0]
    assert updated["auth_id"] == "auth-linked"


def test_find_or_create_user_creates_brand_new_user(db, monkeypatch):
    """Insert and return a new user when neither auth_id nor email exists."""
    monkeypatch.setattr("auth.get_supabase", lambda: db)
    identity = {"auth_id": "auth-new", "email": "brandnew@example.com", "name": "Brand New"}
    user = find_or_create_user(identity)

    assert user["email"] == "brandnew@example.com"
    assert user["name"] == "Brand New"
    assert user["auth_id"] == "auth-new"
    assert "id" in user


def test_find_or_create_user_email_already_used_preserves_original_account(db, monkeypatch):
    """Preserve existing user account without overwriting auth_id or creating duplicates."""
    monkeypatch.setattr("auth.get_supabase", lambda: db)

    db.table("users").insert(
        {
            "auth_id": "original-auth-id",
            "email": "claimed@example.com",
            "name": "Original Owner",
        }
    ).execute()

    total_users_before = len(db.table("users").select("*").execute().data)

    unmatched_identity = {
        "auth_id": "different-auth-id",
        "email": "claimed@example.com",
        "name": "Different Name",
    }
    user = find_or_create_user(unmatched_identity)

    assert user["email"] == "claimed@example.com"
    assert user["auth_id"] == "original-auth-id"
    assert user["name"] == "Original Owner"

    matching_rows = db.table("users").select("*").eq("email", "claimed@example.com").execute().data
    assert len(matching_rows) == 1
    assert len(db.table("users").select("*").execute().data) == total_users_before


def test_current_user_and_id_helpers():
    """Verify current_user and current_user_id extract data from request state."""
    class MockRequestState:
        user = {"id": 42, "name": "Test User", "email": "test@example.com"}

    class MockRequest:
        state = MockRequestState()

    req = MockRequest()
    extracted_user = current_user(req)
    assert extracted_user["id"] == 42
    assert current_user_id(extracted_user) == 42


def test_get_me_success(client, auth_header):
    """Return the current user profile on GET /auth/me."""
    res = client.get("/auth/me", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["name"] == "Jennifer Ye"
    assert data["email"] == "jennifer@example.com"


def test_get_me_as_different_user(client, auth_header, as_user):
    """Reflect the active user profile when switching users."""
    as_user(2, name="Nathan Lam", email="nathan@example.com")
    res = client.get("/auth/me", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 2
    assert data["name"] == "Nathan Lam"
    assert data["email"] == "nathan@example.com"


def test_public_endpoints_bypass_auth(client):
    """Allow unauthenticated access to public endpoints like / and /openapi.json."""
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json() == {"message": "Hello World"}

    res_openapi = client.get("/openapi.json")
    assert res_openapi.status_code == 200


def test_options_method_bypasses_auth(client):
    """Allow CORS preflight OPTIONS requests without requiring authentication."""
    res = client.options(
        "/auth/me",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res.status_code == 200


def test_middleware_rejects_missing_auth(client, monkeypatch):
    """Reject unauthenticated requests through the middleware with 401."""
    def reject_auth(_header):
        raise HTTPException(status_code=401, detail="Sign in required")

    monkeypatch.setattr("auth.verify_token", reject_auth)

    res = client.get("/auth/me")
    assert res.status_code == 401
    assert "sign in required" in res.json()["detail"].lower()


def test_middleware_rejects_malformed_or_expired_auth(client, monkeypatch):
    """Reject invalid or expired authorization tokens through middleware with 401."""
    def reject_auth(_header):
        raise HTTPException(status_code=401, detail="Invalid or expired sign-in")

    monkeypatch.setattr("auth.verify_token", reject_auth)

    res = client.get("/auth/me", headers={"Authorization": "Bearer expired-token"})
    assert res.status_code == 401
    assert "invalid or expired" in res.json()["detail"].lower()
