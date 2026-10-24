import re
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import get_supabase, list_group_members, missing_column, require_member, save_member_points

router = APIRouter(prefix="/chores", tags=["chores"])


class ChoreCreate(BaseModel):
    user_id: int
    group_id: int
    title: str = Field(min_length=1, max_length=100)
    description: str = ""
    points: int = Field(ge=1)
    due: str | None = None


class ChoreResponse(BaseModel):
    id: int
    group_id: int
    created_by: int
    title: str
    description: str
    points: int
    status: str
    created_at: datetime
    assignee_id: int | None = None
    due: str | None = None


class CompleteChoreResponse(BaseModel):
    chore: ChoreResponse
    points: int


def load_chore(client, chore_id: int, user_id: int) -> dict:
    res = client.table("chores").select("*").eq("id", chore_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Chore not found")
    chore = res.data[0]
    require_member(client, chore["group_id"], user_id)
    return chore


def insert_chore(client, row: dict):
    try:
        return client.table("chores").insert(row).execute()
    except Exception as exc:
        if not missing_column(exc) or "due" not in row:
            raise
        slim = {key: value for key, value in row.items() if key != "due"}
        return client.table("chores").insert(slim).execute()


@router.post("", status_code=201, response_model=ChoreResponse)
async def create_chore(body: ChoreCreate):
    client = get_supabase()
    require_member(client, body.group_id, body.user_id)

    if body.due is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", body.due):
        raise HTTPException(status_code=400, detail="Pick a due date.")

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

    row = {
        "group_id": body.group_id,
        "created_by": body.user_id,
        "title": body.title,
        "description": body.description,
        "points": body.points,
        "status": "available",
    }
    if body.due is not None:
        row["due"] = body.due
    res = insert_chore(client, row)
    return res.data[0]


@router.get("/{chore_id}", response_model=ChoreResponse)
async def get_chore(chore_id: int, user_id: int):
    client = get_supabase()
    return load_chore(client, chore_id, user_id)


@router.delete("/{chore_id}", status_code=204)
async def delete_chore(chore_id: int, user_id: int):
    client = get_supabase()
    load_chore(client, chore_id, user_id)
    client.table("chores").delete().eq("id", chore_id).execute()


@router.post("/{chore_id}/claim", response_model=ChoreResponse)
async def claim_chore(chore_id: int, user_id: int):
    client = get_supabase()
    chore = load_chore(client, chore_id, user_id)
    if chore["status"] != "available" or chore.get("assignee_id") is not None:
        raise HTTPException(status_code=400, detail="Chore is not available.")
    try:
        res = (
            client.table("chores")
            .update({"status": "in_progress", "assignee_id": user_id})
            .eq("id", chore_id)
            .execute()
        )
    except Exception as exc:
        if missing_column(exc):
            raise HTTPException(status_code=400, detail="Add an assignee_id column on chores to claim a chore")
        raise
    if not res.data:
        raise HTTPException(status_code=404, detail="Chore not found")
    return res.data[0]


@router.post("/{chore_id}/complete", response_model=CompleteChoreResponse)
async def complete_chore(chore_id: int, user_id: int):
    client = get_supabase()
    chore = load_chore(client, chore_id, user_id)
    assignee = chore.get("assignee_id")
    if chore["status"] != "in_progress" or (assignee is not None and assignee != user_id):
        raise HTTPException(status_code=400, detail="You can't complete this chore.")

    rows, supported = list_group_members(client, chore["group_id"])
    if not supported:
        raise HTTPException(
            status_code=400,
            detail="Add points, week_points, and month_points on group_members to complete a chore",
        )
    member = next((row for row in rows if row["user_id"] == user_id), None)
    if member is None:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    updated = save_member_points(
        client,
        chore["group_id"],
        user_id,
        {
            "points": member["points"] + chore["points"],
            "week_points": member["week_points"] + chore["points"],
            "month_points": member["month_points"] + chore["points"],
        },
    )
    res = (
        client.table("chores")
        .update({"status": "completed"})
        .eq("id", chore_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Chore not found")
    return {"chore": res.data[0], "points": int(updated.get("points") or 0)}


@router.get("", response_model=list[ChoreResponse])
async def list_chores(group_id: int, user_id: int, status: str | None = None):
    client = get_supabase()
    require_member(client, group_id, user_id)
    query = client.table("chores").select("*").eq("group_id", group_id)
    if status:
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data
