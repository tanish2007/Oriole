"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Fraunces, Outfit } from "next/font/google";
import { listGroups, type Group } from "@/lib/groups";
import { CURRENT_USER, householdPath, pickDefaultGroup } from "@/lib/session";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const NotifyContext = createContext<((message: string) => void) | null>(null);

export function useNotify() {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error("useNotify must be used inside AppShell");
  return notify;
}

type GroupsState = {
  groups: Group[];
  ready: boolean;
  refreshGroups: () => Promise<Group[]>;
};

const GroupsContext = createContext<GroupsState | null>(null);

/** Every household the signed-in user belongs to. */
export function useGroups() {
  const state = useContext(GroupsContext);
  if (!state) throw new Error("useGroups must be used inside AppShell");
  return state;
}

const ActiveGroupContext = createContext<Group | null>(null);

/** Set by the /groups/[groupId] layout for the household in the URL. */
export function ActiveGroupProvider({ group, children }: { group: Group; children: ReactNode }) {
  return <ActiveGroupContext.Provider value={group}>{children}</ActiveGroupContext.Provider>;
}

/** The household in the URL. Only available on /groups/[groupId] pages. */
export function useGroup() {
  const group = useContext(ActiveGroupContext);
  if (!group) throw new Error("useGroup must be used inside a /groups/[groupId] page");
  return group;
}

type SubItem = { label: string; href?: string };

type NavItem = {
  label: string;
  icon: string;
  href?: string;
  sub?: SubItem[];
};

const ICONS = {
  groups: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-1.2.5-2.2 1.3-3-.9-.6-2.2-1-3.3-1Zm8 0c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z",
  chores: "M9 12l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
  calendar: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  leaderboard: "M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3",
};

/** "" on a household's chores page, "/rewards" etc. on its other pages, null outside a household. */
function householdPage(pathname: string) {
  const match = pathname.match(/^\/groups\/\d+(\/[a-z]+)?$/);
  return match ? (match[1] ?? "") : null;
}

/** Household links point at `groupId`: the one in the URL, or the default one elsewhere. */
function buildNav(groupId: number | null): NavItem[] {
  const home = groupId == null ? "/groups" : householdPath(groupId);
  return [
    {
      label: "Groups",
      href: "/groups",
      icon: ICONS.groups,
      sub: [
        ...(groupId == null ? [] : [{ label: "Invite member", href: householdPath(groupId, "/members") }]),
        { label: "Create group", href: "/groups?panel=create" },
        { label: "Join group", href: "/groups?panel=join" },
      ],
    },
    {
      label: "Chores",
      href: home,
      icon: ICONS.chores,
      sub:
        groupId == null
          ? undefined
          : [
              { label: "Add chore", href: `${home}?panel=add` },
              { label: "Remove chore", href: `${home}?panel=remove` },
              { label: "Update rewards", href: householdPath(groupId, "/rewards") },
            ],
    },
    {
      label: "Calendar",
      href: groupId == null ? "/groups" : householdPath(groupId, "/calendar"),
      icon: ICONS.calendar,
    },
    {
      label: "Leaderboard",
      href: groupId == null ? "/groups" : householdPath(groupId, "/leaderboard"),
      icon: ICONS.leaderboard,
    },
  ];
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function itemActive(label: string, pathname: string) {
  const page = householdPage(pathname);
  if (label === "Groups") return pathname === "/groups" || page === "/members";
  if (label === "Chores") return page === "" || page === "/rewards";
  if (label === "Calendar") return page === "/calendar";
  if (label === "Leaderboard") return page === "/leaderboard";
  return false;
}

function menuFor(pathname: string) {
  const page = householdPage(pathname);
  // "/" redirects to a household's chores page.
  if (pathname === "/" || page === "" || page === "/rewards") return "Chores";
  if (pathname === "/groups" || page === "/members") return "Groups";
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ groupId?: string }>();
  const [openMenu, setOpenMenu] = useState<string | null>(menuFor(pathname));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsReady, setGroupsReady] = useState(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listGroups()
      .then((next) => {
        if (!cancelled) setGroups(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) notify(error instanceof Error ? error.message : "Could not load groups");
      })
      .finally(() => {
        if (!cancelled) setGroupsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const refreshGroups = useCallback(async () => {
    const next = await listGroups();
    setGroups(next);
    return next;
  }, []);

  const urlGroupId = Number(params.groupId);
  const navGroupId = groups.some((group) => group.id === urlGroupId) ? urlGroupId : groupsReady ? pickDefaultGroup(groups) : null;
  const nav = buildNav(navGroupId);

  // Switching households keeps the current page, e.g. /groups/3/rewards to /groups/7/rewards.
  const switchGroup = (groupId: number) => {
    setMobileOpen(false);
    router.push(householdPath(groupId, householdPage(pathname) ?? ""));
  };

  return (
    <NotifyContext.Provider value={notify}>
      <GroupsContext.Provider value={{ groups, ready: groupsReady, refreshGroups }}>
      <div className={`${display.variable} ${sans.variable} flex min-h-screen font-[family-name:var(--font-sans)] text-[#1c2750]`}>
        {!mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={false}
            aria-controls="sidebar"
            className="fixed left-4 top-4 z-40 grid h-12 w-12 place-items-center rounded-xl border border-[#d9d0e6] bg-white/80 text-xl md:hidden"
          >
            ☰
          </button>
        )}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-[#1e2d54]/40 md:hidden" />
        )}

        <aside
          id="sidebar"
          className={`fixed inset-y-0 left-0 z-30 flex w-80 shrink-0 flex-col bg-[#1e2d54] p-4 text-[#dfe3f0] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-72 md:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className={`flex items-center gap-1 rounded-xl border border-white/10 ${pathname === "/profile" ? "bg-white/10" : "bg-white/5"}`}>
            <Link
              href="/profile"
              aria-label="Open profile"
              aria-current={pathname === "/profile" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3.5 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cdbfe0]"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#cdbfe0] text-base font-semibold text-[#1e2d54]">{CURRENT_USER.name.charAt(0)}</div>
              <div className="min-w-0 flex-1 leading-snug">
                <p className="truncate text-base font-semibold text-white">{CURRENT_USER.name}</p>
                <p className="break-all text-sm text-[#b8c0da]">{CURRENT_USER.email}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              aria-expanded={true}
              aria-controls="sidebar"
              className="mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl text-white hover:bg-white/10 md:hidden"
            >
              ×
            </button>
          </div>

          {navGroupId != null && (
            <div className="mt-4">
              <label htmlFor="group-switcher" className="mb-1.5 block px-1 text-sm font-medium text-[#b8c0da]">
                Group
              </label>
              <select
                id="group-switcher"
                value={navGroupId}
                onChange={(event) => switchGroup(Number(event.target.value))}
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-base font-semibold text-white outline-none transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cdbfe0]"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id} className="bg-white text-[#1c2750]">
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav className="mt-6 flex flex-col gap-1.5" aria-label="Main">
            {nav.map((item) => {
              const active = itemActive(item.label, pathname);
              const className = `flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cdbfe0] ${
                active ? "bg-white/10 text-white" : "hover:bg-white/5"
              }`;
              const contents = (
                <>
                  <Icon d={item.icon} />
                  {item.label}
                  {item.sub && (
                    <svg
                      viewBox="0 0 24 24"
                      className={`ml-auto h-5 w-5 shrink-0 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </>
              );

              return (
                <div key={item.label}>
                  {item.sub ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (item.href && pathname !== item.href) {
                          setOpenMenu(item.label);
                          setMobileOpen(false);
                          router.push(item.href);
                          return;
                        }
                        setOpenMenu(openMenu === item.label ? null : item.label);
                      }}
                      aria-current={item.href && pathname === item.href ? "page" : undefined}
                      aria-expanded={openMenu === item.label}
                      className={className}
                    >
                      {contents}
                    </button>
                  ) : item.href ? (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={className}
                    >
                      {contents}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        notify(`${item.label} (coming soon)`);
                        setMobileOpen(false);
                      }}
                      className={className}
                    >
                      {contents}
                    </button>
                  )}

                  {item.sub && openMenu === item.label && (
                    <ul className="ml-6 mt-1.5 flex flex-col gap-1 border-l border-white/20 pl-3">
                      {item.sub.map((sub) => (
                        <li key={sub.label}>
                          {sub.href ? (
                            <Link
                              href={sub.href}
                              aria-current={pathname === sub.href ? "page" : undefined}
                              onClick={() => setMobileOpen(false)}
                              className={`block w-full rounded-lg px-3 py-2.5 text-left text-base hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cdbfe0] ${
                                pathname === sub.href ? "bg-white/10 text-white" : "text-white/85"
                              }`}
                            >
                              {sub.label}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                notify(`${sub.label} (coming soon)`);
                                setMobileOpen(false);
                              }}
                              className="w-full rounded-lg px-3 py-2.5 text-left text-base text-white/85 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#cdbfe0]"
                            >
                              {sub.label}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center gap-3 p-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/10">
              <span className="h-4 w-4 rounded-[4px] border-2 border-white/80" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">ChoreShare</span>
          </div>
        </aside>

        <main className="flex-1 bg-gradient-to-br from-[#e6dbe9] via-[#f1e4e8] to-[#e4d8e8] p-5 pt-16 sm:p-8 sm:pt-16 md:pt-8">
          <Suspense fallback={<p className="text-[#6b6590]">Loading…</p>}>{children}</Suspense>
        </main>

        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1c2750] px-5 py-3 text-base font-medium text-white shadow-lg transition-all duration-200 ${
            toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {toast}
        </div>
      </div>
      </GroupsContext.Provider>
    </NotifyContext.Provider>
  );
}
