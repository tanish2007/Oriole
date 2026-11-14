function envNumber(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) ? value : fallback;
}

const ENV_USER_ID = envNumber(process.env.NEXT_PUBLIC_USER_ID, 1);

/** The person who signed in with Google, remembered by the /auth/callback page. Null when signed out. */
function signedInUser(): { id: number; name: string; email: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("choreshareUser");
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: unknown; name?: unknown; email?: unknown };
    if (typeof user.id !== "number" || !Number.isInteger(user.id) || user.id < 1) return null;
    return { id: user.id, name: String(user.name ?? ""), email: String(user.email ?? "") };
  } catch {
    return null;
  }
}

/** The user from the env. The server always renders this one, since it can't see the browser's sign-in. */
export const DEFAULT_USER = {
  id: ENV_USER_ID,
  name: process.env.NEXT_PUBLIC_USER_NAME || "Jennifer Ye",
  email: "jennifer.ye@umass.edu",
};

export const CURRENT_USER = signedInUser() ?? DEFAULT_USER;

export function householdPath(groupId: number, page = "") {
  return `/groups/${groupId}${page}`;
}

// Per user, so different accounts in one browser don't overwrite each other's default.
const DEFAULT_GROUP_KEY = `activeGroupId:${CURRENT_USER.id}`;
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
