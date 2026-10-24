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

export function householdPath(groupId: number, page = "") {
  return `/groups/${groupId}${page}`;
}

const DEFAULT_GROUP_KEY = "activeGroupId";
const ENV_GROUP_ID = envNumber(process.env.NEXT_PUBLIC_GROUP_ID, 0);

// remembers the last household viewed
export function saveDefaultGroup(groupId: number) {
  try {
    localStorage.setItem(DEFAULT_GROUP_KEY, String(groupId));
  } catch {
    // Storage can be blocked (private mode). The default then falls back below.
  }
}

/** The household "/" opens: last viewed, then NEXT_PUBLIC_GROUP_ID, then the first one. Null when there are none. */
export function pickDefaultGroup(groups: { id: number }[]): number | null {
  let saved = NaN;
  try {
    saved = Number(localStorage.getItem(DEFAULT_GROUP_KEY));
  } catch {
    // Same as above.
  }
  const group = groups.find((item) => item.id === saved) ?? groups.find((item) => item.id === ENV_GROUP_ID) ?? groups[0];
  return group?.id ?? null;
}
