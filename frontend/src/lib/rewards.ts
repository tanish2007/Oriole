/**
 * Reward client. Pages should only talk to these functions.
 * The API stores name and type. This file maps those to title and scope.
 */

import * as rewards from "@/lib/api/gen/rewards"

import { toApiRewardType, toMember, toReward } from "./map";
import { CURRENT_USER } from "./session";
import type { Member, Reward, RewardInput } from "./types";

export type { Reward, RewardInput, RewardScope } from "./types";

function cleanReward(input: RewardInput): RewardInput
{
  const title = input.title.trim();
  if (!title) throw new Error("Enter a reward name.");
  if (!Number.isInteger(input.cost) || input.cost < 1) {
    throw new Error("Enter whole points, 1 or more.");
  }
  if (input.scope !== "Group" && input.scope !== "Personal") {
    throw new Error("Choose group or personal.");
  }
  return { title, cost: input.cost, scope: input.scope };
}

function rewardBody(input: RewardInput)
{
  return {
    name: input.title,
    cost: input.cost,
    type: toApiRewardType(input.scope),
  };
}

export async function listRewards(groupId: number): Promise<Reward[]>
{
  const response = await rewards.listRewards({group_id: groupId, user_id: CURRENT_USER.id});
  return response.map(toReward);
}

export async function createReward(groupId: number, input: RewardInput): Promise<Reward>
{
  const cleaned = cleanReward(input);
  const response = await rewards.createReward({user_id: CURRENT_USER.id, group_id: groupId, ...rewardBody(cleaned)});
  return toReward(response);
}

export async function updateReward(_groupId: number, rewardId: number, input: RewardInput): Promise<Reward>
{
  const cleaned = cleanReward(input);
  const response = await rewards.updateReward(rewardId, rewardBody(cleaned),  {user_id: CURRENT_USER.id});
  return toReward(response);
}

export async function deleteReward(_groupId: number, rewardId: number): Promise<void>
{
  await rewards.deleteReward(rewardId, {user_id: CURRENT_USER.id});
}

export async function redeemReward(_groupId: number, rewardId: number): Promise<Member>
{
  const response = await rewards.redeemReward(rewardId, {user_id: CURRENT_USER.id});
  return toMember(response);
}
