import logging
import os
import threading
from functools import lru_cache

from fastapi import HTTPException
from supabase import Client, create_client

from memory import DemoClient, demo_client

log = logging.getLogger("uvicorn.error")


_thread = threading.local()


@lru_cache
def _shared_demo_client() -> DemoClient:
    log.warning("Supabase is not configured. Serving the in-memory Team Oriole demo.")
    return demo_client()


def get_supabase() -> Client | DemoClient:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return _shared_demo_client()
    # One client per thread: sharing one across the threadpool fails under load with httpx.ReadError.
    if not hasattr(_thread, "client"):
        _thread.client = create_client(url, key)
    return _thread.client


def require_member(client: Client, group_id: int, user_id: int) -> None:
    """Group data is members-only."""
    res = (
        client.table("group_members")
        .select("user_id")
        .eq("group_id", group_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=403, detail="Not a member of this group")


def missing_column(exc: BaseException) -> bool:
    text = str(exc)
    return "PGRST204" in text or "42703" in text or "schema cache" in text


def _lookup_failed(exc: BaseException) -> bool:
    text = str(exc)
    return missing_column(exc) or "PGRST205" in text or "42P01" in text or "does not exist" in text


def member_name_map(client: Client, user_ids: list[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    try:
        res = client.table("users").select("id, name").in_("id", user_ids).execute()
    except Exception as exc:
        if _lookup_failed(exc):
            return {}
        raise
    names: dict[int, str] = {}
    for row in res.data or []:
        value = row.get("name")
        if isinstance(value, str) and value.strip():
            names[int(row["id"])] = value
    return names


def list_group_members(client: Client, group_id: int) -> tuple[list[dict], bool]:
    """Rows of user_id, points, week_points, month_points. The flag is false when point columns are absent."""
    try:
        res = (
            client.table("group_members")
            .select("user_id, points, week_points, month_points")
            .eq("group_id", group_id)
            .execute()
        )
        rows = [
            {
                "user_id": int(row["user_id"]),
                "points": int(row.get("points") or 0),
                "week_points": int(row.get("week_points") or 0),
                "month_points": int(row.get("month_points") or 0),
            }
            for row in (res.data or [])
        ]
        return rows, True
    except Exception as exc:
        if not missing_column(exc):
            raise
    res = client.table("group_members").select("user_id").eq("group_id", group_id).execute()
    rows = [
        {"user_id": int(row["user_id"]), "points": 0, "week_points": 0, "month_points": 0}
        for row in (res.data or [])
    ]
    return rows, False


def save_member_points(client: Client, group_id: int, user_id: int, fields: dict) -> dict:
    try:
        res = (
            client.table("group_members")
            .update(fields)
            .eq("group_id", group_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        if missing_column(exc):
            raise HTTPException(
                status_code=400,
                detail="Add points, week_points, and month_points on group_members",
            )
        raise
    if not res.data:
        raise HTTPException(status_code=404, detail="Member not found")
    return res.data[0]


def public_member(client: Client, group_id: int, user_id: int) -> dict:
    rows, _supported = list_group_members(client, group_id)
    member = next((row for row in rows if row["user_id"] == user_id), None)
    if member is None:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    names = member_name_map(client, [user_id])
    return {
        "id": user_id,
        "name": names.get(user_id) or f"Member {user_id}",
        "points": member["points"],
    }
