from collections import Counter
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
import string

from db import get_supabase, list_group_members, member_name_map, require_member

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreate(BaseModel):
    name: str
    owner_id: int

class GroupCreateResponse(BaseModel):
    message: str
    invite_code: str
    group_id: int

class GroupJoin(BaseModel):
    user_id: int
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
async def create_group(group: GroupCreate):
    client = get_supabase()
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    group_data = {
        "name": group.name,
        "owner_id": group.owner_id,
        "max_chore_points": 100,
        "invite_code": code
    }
    group_res = client.table("groups").insert(group_data).execute()
    
    if not group_res.data:
        raise HTTPException(status_code=500, detail="Failed to create group")
        
    new_group_id = group_res.data[0]["id"]
    
    member_data = {
        "group_id": new_group_id,
        "user_id": group.owner_id,
        "role": "owner"
    }
    client.table("group_members").insert(member_data).execute()
    
    return {"message": f"Household '{group.name}' created", "invite_code": code, "group_id": new_group_id}

@router.post("/join", response_model=GroupJoinResponse)
async def join_group(join_request: GroupJoin):
    client = get_supabase()
    group_res = client.table("groups").select("id").eq("invite_code", join_request.invite_code).execute()

    if not group_res.data:
        raise HTTPException(status_code=404, detail="Invalid household code")

    group_id = group_res.data[0]["id"]

    existing_member = client.table("group_members").select("id").eq("group_id", group_id).eq("user_id", join_request.user_id).execute()

    if existing_member.data:
         raise HTTPException(status_code=400, detail="User is already in this household")

    member_data = {
        "group_id": group_id,
        "user_id": join_request.user_id,
        "role": "member"
    }
    client.table("group_members").insert(member_data).execute()
    
    return {"message": "Successfully joined the household", "group_id": group_id}

@router.get("/get_invite_code", response_model=GroupInviteCodeResponse)
async def get_invite_code(group_id: int, user_id: int):
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
async def list_members(group_id: int, user_id: int):
    client = get_supabase()
    require_member(client, group_id, user_id)
    members = _members(client, group_id)
    members.sort(key=lambda member: (member["name"].lower(), member["id"]))
    return [{"id": member["id"], "name": member["name"], "points": member["points"]} for member in members]


@router.get("/{group_id}/leaderboard", response_model=list[MemberResponse])
async def leaderboard(group_id: int, user_id: int, period: Literal["week", "month"]):
    client = get_supabase()
    require_member(client, group_id, user_id)
    key = "month_points" if period == "month" else "week_points"
    entries = [
        {"id": member["id"], "name": member["name"], "points": member[key]}
        for member in _members(client, group_id)
    ]
    entries.sort(key=lambda entry: (-entry["points"], entry["name"].lower(), entry["id"]))
    return entries


@router.get("", response_model=list[GroupSummaryResponse])
async def list_groups(user_id: int):
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