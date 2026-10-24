/**
 * Chore client. Pages should only talk to these functions.
 * Reward and leaderboard routes live in rewards.ts and leaderboard.ts.
 * Dates stay ISO (YYYY-MM-DD). The UI formats them for display.
 */

import { request } from "./http";
import { type ApiChore, type ApiMember, toChore, toMember } from "./map";
import { routes } from "./routes";
import { CURRENT_USER } from "./session";
import type { Chore, CreateChoreInput, Member } from "./types";

export type { Chore, CreateChoreInput, Member, Status } from "./types";
export { CURRENT_GROUP, CURRENT_USER } from "./session";

export async function listMembers(groupId: number): Promise<Member[]> {
  const rows = await request<ApiMember[]>(routes.members(groupId, CURRENT_USER.id));
  return rows.map(toMember);
}

export async function listChores(groupId: number): Promise<Chore[]> {
  const rows = await request<ApiChore[]>(routes.chores(groupId, CURRENT_USER.id));
  return rows.map(toChore);
}

export async function deleteChore(id: number): Promise<void> {
  await request<void>(routes.chore(id, CURRENT_USER.id), { method: "DELETE" });
}

export async function createChore(input: CreateChoreInput): Promise<Chore> {
  const title = input.title.trim();
  const detail = input.detail.trim();
  if (!title) throw new Error("Enter a chore title.");
  if (!Number.isInteger(input.points) || input.points < 1) {
    throw new Error("Enter whole points, 1 or more.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new Error("Pick a due date.");

  const row = await request<ApiChore>("/chores", {
    method: "POST",
    body: JSON.stringify({
      user_id: CURRENT_USER.id,
      group_id: input.groupId,
      title,
      description: detail,
      points: input.points,
      due: input.due,
    }),
  });
  return toChore(row);
}

export async function claimChore(id: number): Promise<Chore> {
  const row = await request<ApiChore>(routes.claimChore(id, CURRENT_USER.id), { method: "POST" });
  return toChore(row);
}

export async function completeChore(id: number): Promise<{ chore: Chore; points: number }> {
  const body = await request<{ chore: ApiChore; points: number }>(routes.completeChore(id, CURRENT_USER.id), {
    method: "POST",
  });
  return { chore: toChore(body.chore), points: body.points };
}
