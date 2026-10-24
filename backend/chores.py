from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import get_supabase, require_member

router = APIRouter(prefix="/chores", tags=["chores"])


class ChoreCreate(BaseModel):
    user_id: int
    group_id: int
    title: str = Field(min_length=1, max_length=100)
    description: str = ""
    points: int = Field(ge=1)


@router.post("", status_code=201)
async def create_chore(body: ChoreCreate):
    client = get_supabase()
    require_member(client, body.group_id, body.user_id)

    group = (
        client.table("groups")
        .select("max_chore_points")
        .eq("id", body.group_id)
        .single()
        .execute()
    )
    max_points = group.data["max_chore_points"]
    if max_points is not None and body.points > max_points:
        raise HTTPException(
            status_code=400,
            detail=f"Points cannot exceed the group limit of {max_points}",
        )

    res = (
        client.table("chores")
        .insert(
            {
                "group_id": body.group_id,
                "created_by": body.user_id,
                "title": body.title,
                "description": body.description,
                "points": body.points,
                "status": "available",
            }
        )
        .execute()
    )
    return res.data[0]


@router.get("/{chore_id}")
async def get_chore(chore_id: int, user_id: int):
    client = get_supabase()
    res = client.table("chores").select("*").eq("id", chore_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Chore not found")
    chore = res.data[0]
    require_member(client, chore["group_id"], user_id)
    return chore


@router.get("")
async def list_chores(group_id: int, user_id: int, status: str | None = None):
    client = get_supabase()
    require_member(client, group_id, user_id)
    query = client.table("chores").select("*").eq("group_id", group_id)
    if status:
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data
