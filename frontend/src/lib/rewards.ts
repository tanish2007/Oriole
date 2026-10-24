/**
 * Reward client. Pages should only talk to these functions.
 * The API stores name and type. This file maps those to title and scope.
 */

import { request } from "./http";
import { type ApiMember, type ApiReward, toApiRewardType, toMember, toReward } from "./map";
import { routes } from "./routes";
import { CURRENT_USER } from "./session";
import type { Member, Reward, RewardInput } from "./types";

export type { Reward, RewardInput, RewardScope } from "./types";

function cleanReward(input: RewardInput): RewardInput {
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

function rewardBody(input: RewardInput) {
  return {
    name: input.title,
    cost: input.cost,
    type: toApiRewardType(input.scope),
  };
}

export async function listRewards(groupId: number): Promise<Reward[]> {
  const rows = await request<ApiReward[]>(routes.rewards(groupId, CURRENT_USER.id));
  return rows.map(toReward);
}

export async function createReward(groupId: number, input: RewardInput): Promise<Reward> {
  const cleaned = cleanReward(input);
  const row = await request<ApiReward>("/rewards", {
    method: "POST",
    body: JSON.stringify({
      user_id: CURRENT_USER.id,
      group_id: groupId,
      ...rewardBody(cleaned),
    }),
  });
  return toReward(row);
}

export async function updateReward(_groupId: number, rewardId: number, input: RewardInput): Promise<Reward> {
  const cleaned = cleanReward(input);
  const row = await request<ApiReward>(routes.reward(rewardId, CURRENT_USER.id), {
    method: "PATCH",
    body: JSON.stringify(rewardBody(cleaned)),
  });
  return toReward(row);
}

export async function deleteReward(_groupId: number, rewardId: number): Promise<void> {
  await request<void>(routes.reward(rewardId, CURRENT_USER.id), { method: "DELETE" });
}

export async function redeemReward(_groupId: number, rewardId: number): Promise<Member> {
  const row = await request<ApiMember>(routes.redeem(rewardId, CURRENT_USER.id), { method: "POST" });
  return toMember(row);
}
