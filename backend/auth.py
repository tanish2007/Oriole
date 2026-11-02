from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from db import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])


class MeResponse(BaseModel):
    id: int
    name: str
    email: str


def verify_token(authorization: str | None) -> dict:
    """Check a Supabase login token and return who it belongs to: auth_id, email, name."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required")
    token = authorization[7:].strip()

    client = get_supabase()
    if not hasattr(client, "auth"):
        raise HTTPException(status_code=503, detail="Sign-in needs a configured Supabase project")
    try:
        user = client.auth.get_user(token).user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired sign-in")
    if user is None or not user.email:
        raise HTTPException(status_code=401, detail="Invalid or expired sign-in")

    meta = user.user_metadata or {}
    name = meta.get("full_name") or meta.get("name") or user.email.split("@")[0]
    return {"auth_id": user.id, "email": user.email, "name": name}


def find_or_create_user(identity: dict) -> dict:
    """The app's users row for this login. Created on first sign-in."""
    client = get_supabase()

    res = client.table("users").select("*").eq("auth_id", identity["auth_id"]).execute()
    if res.data:
        return res.data[0]

    # A row made before login existed (matched by email) gets linked to this account.
    res = client.table("users").select("*").eq("email", identity["email"]).execute()
    if res.data:
        row = res.data[0]
        if row.get("auth_id") is None:
            client.table("users").update({"auth_id": identity["auth_id"]}).eq("id", row["id"]).execute()
        return row

    res = (
        client.table("users")
        .insert({"auth_id": identity["auth_id"], "email": identity["email"], "name": identity["name"]})
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=500, detail="Could not create the user")
    return res.data[0]


def current_user_id(authorization: str | None = Header(default=None)) -> int:
    """For routes that should act as the signed-in user (not wired into the existing routes yet)."""
    return int(find_or_create_user(verify_token(authorization))["id"])


@router.get("/me", response_model=MeResponse)
async def me(authorization: str | None = Header(default=None)):
    user = find_or_create_user(verify_token(authorization))
    return {"id": user["id"], "name": user.get("name") or "", "email": user.get("email") or ""}
