from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import get_supabase, require_member

router = APIRouter(prefix="/rewards", tags=["rewards"])


class RewardCreate(BaseModel):
    user_id: int
    group_id: int
    name: str = Field(min_length=1, max_length=100)
    cost: int = Field(ge=1)
    type: Literal["individual", "group"]


@router.post("", status_code=201)
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


@router.get("/{reward_id}")
async def get_reward(reward_id: int, user_id: int):
    client = get_supabase()
    res = client.table("rewards").select("*").eq("id", reward_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Reward not found")
    reward = res.data[0]
    require_member(client, reward["group_id"], user_id)
    return reward


@router.get("")
async def list_rewards(group_id: int, user_id: int):
    client = get_supabase()
    require_member(client, group_id, user_id)
    return client.table("rewards").select("*").eq("group_id", group_id).execute().data
