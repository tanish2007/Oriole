function envNumber(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) ? value : fallback;
}

const ENV_USER_ID = envNumber(process.env.NEXT_PUBLIC_USER_ID, 1);
const USER_OVERRIDE_KEY = "demoUserId";

// Names for the demo's ?user= override, matching the in-memory demo data. Faked locally, never fetched.
const DEMO_USER_NAMES: Record<number, string> = {
  1: "Jennifer Ye",
  2: "Nathan Lam",
  3: "Tanish Gupta",
  4: "Will Hammond",
  5: "Shambhavi Upadhyay",
  6: "Aviral Poddar",
  7: "Nathan Cardin",
};

/**
 * Demo override: ?user=2 on any URL signs this tab in as user 2 until the tab closes.
 * sessionStorage is per tab, so two tabs can run as different users. ?user= with no value clears it.
 * Read once per page load; changing the URL in the address bar reloads the page anyway.
 */
function demoUserId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const param = new URLSearchParams(window.location.search).get("user");
    if (param === "") sessionStorage.removeItem(USER_OVERRIDE_KEY);
    else if (param !== null && Number.isInteger(Number(param)) && Number(param) > 0) sessionStorage.setItem(USER_OVERRIDE_KEY, param);
    const saved = Number(sessionStorage.getItem(USER_OVERRIDE_KEY));
    return Number.isInteger(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
}

const demoId = demoUserId();

/** The user from the env. The server always renders this one, since it can't see a tab's ?user=. */
export const DEFAULT_USER = {
  id: ENV_USER_ID,
  name: process.env.NEXT_PUBLIC_USER_NAME || "Jennifer Ye",
  email: "jennifer.ye@umass.edu",
};

/** For API calls. To show the user's name or email, use useCurrentUser() from app-shell instead. */
export const CURRENT_USER =
  demoId == null || demoId === ENV_USER_ID
    ? DEFAULT_USER
    : {
        id: demoId,
        name: DEMO_USER_NAMES[demoId] ?? `User ${demoId}`,
        email: `Demo account (?user=${demoId})`,
      };

export function householdPath(groupId: number, page = "") {
  return `/groups/${groupId}${page}`;
}

// Per user, so demo tabs signed in as different users don't overwrite each other's default.
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
