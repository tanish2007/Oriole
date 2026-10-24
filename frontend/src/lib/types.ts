export type Status = "available" | "in_progress" | "completed";

export type Member = {
  id: number;
  name: string;
  /** Spendable balance. Completing a chore adds to it. Redeeming a reward subtracts. */
  points: number;
};

export type Chore = {
  id: number;
  groupId: number;
  title: string;
  detail: string;
  points: number;
  due: string;
  assigneeId: number | null;
  status: Status;
};

export type CreateChoreInput = {
  groupId: number;
  title: string;
  detail: string;
  points: number;
  due: string;
};

export type RewardScope = "Group" | "Personal";

export type Reward = {
  id: number;
  title: string;
  cost: number;
  scope: RewardScope;
};

export type RewardInput = {
  title: string;
  cost: number;
  scope: RewardScope;
};

export type Group = {
  id: number;
  name: string;
  memberCount: number;
};

export type LeaderboardPeriod = "week" | "month";

/** Earned points for one period. Redeeming a reward does not change this. */
export type LeaderboardEntry = {
  id: number;
  name: string;
  points: number;
};
