import type { Group } from "./types";

function envNumber(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) ? value : fallback;
}

export const CURRENT_USER = {
  id: envNumber(process.env.NEXT_PUBLIC_USER_ID, 1),
  name: process.env.NEXT_PUBLIC_USER_NAME || "Jennifer Ye",
  email: "jennifer.ye@umass.edu",
};

export const CURRENT_GROUP: Group = {
  id: envNumber(process.env.NEXT_PUBLIC_GROUP_ID, 1),
  name: process.env.NEXT_PUBLIC_GROUP_NAME || "Team Oriole",
  memberCount: 0,
};
