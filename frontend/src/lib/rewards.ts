/**
 * Reward client. Pages should only talk to these functions.
 * Paths and payload shapes are in routes.ts. Set NEXT_PUBLIC_API_URL to use them.
 */

import { liveApiEnabled, request } from "./http";
import { members, publicMember, publicReward, rewards, takeRewardId } from "./mock-store";
import { routes } from "./routes";
import { CURRENT_GROUP, CURRENT_USER } from "./session";
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

export async function listRewards(groupId: number): Promise<Reward[]> {
  if (liveApiEnabled()) return request<Reward[]>(routes.rewards(groupId));
  return rewards.filter((reward) => reward.groupId === groupId).map(publicReward);
}

export async function createReward(groupId: number, input: RewardInput): Promise<Reward> {
  const cleaned = cleanReward(input);
  if (liveApiEnabled()) {
    return request<Reward>(routes.rewards(groupId), {
      method: "POST",
      body: JSON.stringify(cleaned),
    });
  }
  if (groupId !== CURRENT_GROUP.id) throw new Error("Unknown group.");
  const reward = { id: takeRewardId(), groupId, ...cleaned };
  rewards.push(reward);
  return publicReward(reward);
}

export async function updateReward(groupId: number, rewardId: number, input: RewardInput): Promise<Reward> {
  const cleaned = cleanReward(input);
  if (liveApiEnabled()) {
    return request<Reward>(routes.reward(groupId, rewardId), {
      method: "PATCH",
      body: JSON.stringify(cleaned),
    });
  }
  const reward = rewards.find((item) => item.id === rewardId && item.groupId === groupId);
  if (!reward) throw new Error("Reward not found.");
  reward.title = cleaned.title;
  reward.cost = cleaned.cost;
  reward.scope = cleaned.scope;
  return publicReward(reward);
}

export async function deleteReward(groupId: number, rewardId: number): Promise<void> {
  if (liveApiEnabled()) {
    await request<void>(routes.reward(groupId, rewardId), { method: "DELETE" });
    return;
  }
  const index = rewards.findIndex((item) => item.id === rewardId && item.groupId === groupId);
  if (index < 0) throw new Error("Reward not found.");
  rewards.splice(index, 1);
}

export async function redeemReward(groupId: number, rewardId: number): Promise<Member> {
  if (liveApiEnabled()) {
    return request<Member>(routes.redeem(groupId, rewardId), { method: "POST" });
  }
  const reward = rewards.find((item) => item.id === rewardId && item.groupId === groupId);
  if (!reward) throw new Error("Reward not found.");
  const member = members.find((item) => item.id === CURRENT_USER.id);
  if (!member) throw new Error("Member not found.");
  if (member.points < reward.cost) throw new Error("Not enough points.");
  member.points -= reward.cost;
  return publicMember(member);
}
