from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
import string

from db import get_supabase, require_member

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