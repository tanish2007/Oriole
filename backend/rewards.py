from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import get_supabase, list_group_members, public_member, require_member, save_member_points

router = APIRouter(prefix="/rewards", tags=["rewards"])


class RewardCreate(BaseModel):
    user_id: int
    group_id: int
    name: str = Field(min_length=1, max_length=100)
    cost: int = Field(ge=1)
    type: Literal["individual", "group"]


class RewardUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    cost: int = Field(ge=1)
    type: Literal["individual", "group"]


class RewardResponse(BaseModel):
    id: int
    group_id: int
    created_by: int
    name: str
    cost: int
    type: Literal["individual", "group"]


class MemberPoints(BaseModel):
    id: int
    name: str
    points: int


def load_reward(client, reward_id: int, user_id: int) -> dict:
    res = client.table("rewards").select("*").eq("id", reward_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Reward not found")
    reward = res.data[0]
    require_member(client, reward["group_id"], user_id)
    return reward


@router.post("", status_code=201, response_model=RewardResponse)
async def create_reward(body: RewardCreate):
    client = get_supabase()
    require_member(client, body.group_id, body.user_id)

    res = (
        client.table("rewards")
        .insert(
            {
                "group_id": body.group_id,
                "created_by": body.user_id,
                "name": body.name,
                "cost": body.cost,
                "type": body.type,
            }
        )
        .execute()
    )
    return res.data[0]


@router.get("/{reward_id}", response_model=RewardResponse)
async def get_reward(reward_id: int, user_id: int):
    client = get_supabase()
    return load_reward(client, reward_id, user_id)


@router.patch("/{reward_id}", response_model=RewardResponse)
async def update_reward(reward_id: int, body: RewardUpdate, user_id: int):
    client = get_supabase()
    load_reward(client, reward_id, user_id)
    res = (
        client.table("rewards")
        .update({"name": body.name, "cost": body.cost, "type": body.type})
        .eq("id", reward_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Reward not found")
    return res.data[0]


@router.delete("/{reward_id}", status_code=204)
async def delete_reward(reward_id: int, user_id: int):
    client = get_supabase()
    load_reward(client, reward_id, user_id)
    client.table("rewards").delete().eq("id", reward_id).execute()


@router.post("/{reward_id}/redeem", response_model=MemberPoints)
async def redeem_reward(reward_id: int, user_id: int):
    client = get_supabase()
    reward = load_reward(client, reward_id, user_id)
    rows, supported = list_group_members(client, reward["group_id"])
    if not supported:
        raise HTTPException(status_code=400, detail="Add a points column on group_members to redeem rewards")
    member = next((row for row in rows if row["user_id"] == user_id), None)
    if member is None:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    if member["points"] < reward["cost"]:
        raise HTTPException(status_code=400, detail="Not enough points.")
    save_member_points(
        client,
        reward["group_id"],
        user_id,
        {"points": member["points"] - reward["cost"]},
    )
    return public_member(client, reward["group_id"], user_id)


@router.get("", response_model=list[RewardResponse])
async def list_rewards(group_id: int, user_id: int):
    client = get_supabase()
    require_member(client, group_id, user_id)
    return client.table("rewards").select("*").eq("group_id", group_id).execute().data
