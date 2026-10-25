import { CURRENT_USER } from "./session";
import type { Chore, Group, LeaderboardEntry, Member, Reward, RewardScope, Status } from "./types";

export type ApiGroup = {
  id: number;
  name: string;
  role: string;
  member_count: number;
};

export type ApiChore = {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  points: number;
  status: string;
  assignee_id?: number | null;
  due?: string | null;
};

export type ApiReward = {
  id: number;
  name: string;
  cost: number;
  type: string;
};

export type ApiMember = {
  id: number;
  name: string;
  points: number;
};

function toStatus(status: string): Status {
  if (status === "in_progress" || status === "completed") return status;
  return "available";
}

export function toChore(row: ApiChore): Chore {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    detail: row.description ?? "",
    points: row.points,
    due: row.due ? String(row.due).slice(0, 10) : "",
    assigneeId: row.assignee_id ?? null,
    status: toStatus(row.status),
  };
}

export function toApiRewardType(scope: RewardScope): "individual" | "group" {
  return scope === "Personal" ? "individual" : "group";
}

export function toReward(row: ApiReward): Reward {
  return {
    id: row.id,
    title: row.name,
    cost: row.cost,
    scope: row.type === "individual" ? "Personal" : "Group",
  };
}

export function toMember(row: ApiMember): Member {
  const unnamed = !row.name || row.name === `Member ${row.id}`;
  return {
    id: row.id,
    name: unnamed && row.id === CURRENT_USER.id ? CURRENT_USER.name : row.name,
    points: row.points,
  };
}

export function toEntry(row: ApiMember): LeaderboardEntry {
  const member = toMember(row);
  return { id: member.id, name: member.name, points: member.points };
}

export function toGroup(row: ApiGroup): Group {
  return {
    id: row.id,
    name: row.name,
    role: row.role === "owner" ? "owner" : "member",
    memberCount: row.member_count,
  };
}
