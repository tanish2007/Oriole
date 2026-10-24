import os
from functools import lru_cache

from fastapi import HTTPException
from supabase import Client, create_client


@lru_cache
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase is not configured")
    return create_client(url, key)


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
