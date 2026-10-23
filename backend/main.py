import os
import random
import string
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client


app = FastAPI()

class GroupCreate(BaseModel):
    name: str
    owner_id: str

class GroupJoin(BaseModel):
    user_id: str
    invite_code: str

@app.get("/")
async def root():
    return {"message": "Hello World"}

# supabase key here (idk whos handling this is this supposed to be me? NL 10/23/2026)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "your_supabase_url_here")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "your_supabase_anon_key_here")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@app.post("/groups")
async def create_group(group: GroupCreate):
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    group_data = {
        "name": group.name,
        "owner_id": group.owner_id,
        "max_chore_points": 100,
        "invite_code": code
    }
    group_res = supabase.table("groups").insert(group_data).execute()
    
    if not group_res.data:
        raise HTTPException(status_code=500, detail="Failed to create group")
        
    new_group_id = group_res.data[0]["id"]
    
    member_data = {
        "group_id": new_group_id,
        "user_id": group.owner_id,
        "role": "owner"
    }
    supabase.table("group_members").insert(member_data).execute()
    
    return {"message": f"Household '{group.name}' created", "invite_code": code, "group_id": new_group_id}

@app.post("/groups/join")
async def join_group(join_request: GroupJoin):

    group_res = supabase.table("groups").select("id").eq("invite_code", join_request.invite_code).execute()
    
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Invalid household code")
        
    group_id = group_res.data[0]["id"]
    
    existing_member = supabase.table("group_members").select("id").eq("group_id", group_id).eq("user_id", join_request.user_id).execute()

    if existing_member.data:
         raise HTTPException(status_code=400, detail="User is already in this household")
    
    member_data = {
        "group_id": group_id,
        "user_id": join_request.user_id,
        "role": "member"
    }
    supabase.table("group_members").insert(member_data).execute()
    
    return {"message": "Successfully joined the household", "group_id": group_id}

@app.get("/g")
async def get_invite_code(group_id: str, user_id: str):
    member_check = supabase.table("group_members").select("id").eq("group_id", group_id).eq("user_id", user_id).execute()
    
    if not member_check.data:
        raise HTTPException(status_code=403, detail="Access denied: You are not a member of this household")
        
    group_res = supabase.table("groups").select("invite_code").eq("id", group_id).execute()
    
    if not group_res.data:
        raise HTTPException(status_code=404, detail="Household not found")
        
    return {"invite_code": group_res.data[0]["invite_code"]}