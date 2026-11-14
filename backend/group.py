from collections import Counter
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import random
import string

from auth import current_user_id
from db import get_supabase, list_group_members, member_name_map, missing_column, require_member

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreate(BaseModel):
    name: str

class GroupCreateResponse(BaseModel):
    message: str
    invite_code: str
    group_id: int

class GroupJoin(BaseModel):
    invite_code: str

class GroupJoinResponse(BaseModel):
    message: str
    group_id: int

class GroupInviteCodeResponse(BaseModel):
    invite_code: str

class MemberResponse(BaseModel):
    id: int
    name: str
    points: int

class GroupSummaryResponse(BaseModel):
    id: int
    name: str
    role: Literal["owner", "member"]
    member_count: int


@router.post("", status_code=201, response_model=GroupCreateResponse)
def create_group(group: GroupCreate, user_id: int = Depends(current_user_id)):
    client = get_supabase()
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    group_data = {
        "name": group.name,
        "owner_id": user_id,
        "max_chore_points": 100,
        "invite_code": code
    }
    group_res = client.table("groups").insert(group_data).execute()
    
    if not group_res.data:
        raise HTTPException(status_code=500, detail="Failed to create group")
        
    new_group_id = group_res.data[0]["id"]
    
    member_data = {
        "group_id": new_group_id,
        "user_id": user_id,
        "role": "owner"
    }
    client.table("group_members").insert(member_data).execute()
    
    return {"message": f"Household '{group.name}' created", "invite_code": code, "group_id": new_group_id}

@router.post("/join", response_model=GroupJoinResponse)
def join_group(join_request: GroupJoin, user_id: int = Depends(current_user_id)):
    client = get_supabase()
    group_res = client.table("groups").select("id").eq("invite_code", join_request.invite_code).execute()

    if not group_res.data:
        raise HTTPException(status_code=404, detail="Invalid household code")

    group_id = group_res.data[0]["id"]

    existing_member = client.table("group_members").select("user_id").eq("group_id", group_id).eq("user_id", user_id).execute()

    if existing_member.data:
         raise HTTPException(status_code=400, detail="User is already in this household")

    member_data = {
        "group_id": group_id,
        "user_id": user_id,
        "role": "member"
    }
    client.table("group_members").insert(member_data).execute()
    
    return {"message": "Successfully joined the household", "group_id": group_id}

@router.get("/get_invite_code", response_model=GroupInviteCodeResponse)
def get_invite_code(group_id: int, user_id: int = Depends(current_user_id)):
    client = get_supabase()
    require_member(client, group_id, user_id)
        
    group_res = client.table("groups").select("invite_code").eq("id", group_id).execute()
    
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Household not found")
        
    return {"invite_code": group_res.data[0]["invite_code"]}


def _members(client, group_id: int) -> list[dict]:
    rows, _supported = list_group_members(client, group_id)
    names = member_name_map(client, [row["user_id"] for row in rows])
    return [
        {
            "id": row["user_id"],
            "name": names.get(row["user_id"]) or f"Member {row['user_id']}",
            "points": row["points"],
            "week_points": row["week_points"],
            "month_points": row["month_points"],
        }
        for row in rows
    ]


@router.get("/{group_id}/members", response_model=list[MemberResponse])
def list_members(group_id: int, user_id: int = Depends(current_user_id)):
    client = get_supabase()
    require_member(client, group_id, user_id)
    members = _members(client, group_id)
    members.sort(key=lambda member: (member["name"].lower(), member["id"]))
    return [{"id": member["id"], "name": member["name"], "points": member["points"]} for member in members]


@router.get("/{group_id}/leaderboard", response_model=list[MemberResponse])
def leaderboard(group_id: int, period: Literal["week", "month"], user_id: int = Depends(current_user_id)):
    client = get_supabase()
    require_member(client, group_id, user_id)
    key = "month_points" if period == "month" else "week_points"
    entries = [
        {"id": member["id"], "name": member["name"], "points": member[key]}
        for member in _members(client, group_id)
    ]
    entries.sort(key=lambda entry: (-entry["points"], entry["name"].lower(), entry["id"]))
    return entries


def _owner_id(client, group_id: int) -> int:
    res = client.table("groups").select("owner_id").eq("id", group_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Household not found")
    return int(res.data[0]["owner_id"])


def _drop_member(client, group_id: int, member_id: int) -> None:
    """Remove a member and put their claimed chores back up for grabs."""
    try:
        (
            client.table("chores")
            .update({"status": "available", "assignee_id": None})
            .eq("group_id", group_id)
            .eq("assignee_id", member_id)
            .eq("status", "in_progress")
            .execute()
        )
    except Exception as exc:
        if not missing_column(exc):
            raise
    client.table("group_members").delete().eq("group_id", group_id).eq("user_id", member_id).execute()


@router.delete("/{group_id}/members/{member_id}", status_code=204)
def remove_member(group_id: int, member_id: int, user_id: int = Depends(current_user_id)):
    client = get_supabase()
    require_member(client, group_id, user_id)
    if _owner_id(client, group_id) != user_id:
        raise HTTPException(status_code=403, detail="Only the household owner can remove members.")
    if member_id == user_id:
        raise HTTPException(status_code=400, detail="You can't remove yourself.")
    require_member(client, group_id, member_id)
    _drop_member(client, group_id, member_id)


@router.post("/{group_id}/leave", status_code=204)
def leave_group(group_id: int, user_id: int = Depends(current_user_id)):
    client = get_supabase()
    require_member(client, group_id, user_id)
    if _owner_id(client, group_id) == user_id:
        raise HTTPException(status_code=400, detail="The owner can't leave their own household.")
    _drop_member(client, group_id, user_id)


@router.get("", response_model=list[GroupSummaryResponse])
def list_groups(user_id: int = Depends(current_user_id)):
    client = get_supabase()
    memberships = client.table("group_members").select("group_id, role").eq("user_id", user_id).execute().data
    if not memberships:
        return []

    group_ids = [m["group_id"] for m in memberships]
    roles = {m["group_id"]: m["role"] for m in memberships}
    groups = client.table("groups").select("id, name").in_("id", group_ids).execute().data
    all_members = client.table("group_members").select("group_id").in_("group_id", group_ids).execute().data
    counts = Counter(m["group_id"] for m in all_members)

    return [
        {"id": g["id"], "name": g["name"], "role": roles[g["id"]], "member_count": counts[g["id"]]}
        for g in groups
    ]