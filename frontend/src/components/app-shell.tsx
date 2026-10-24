"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fraunces, Outfit } from "next/font/google";
import { CURRENT_USER } from "@/lib/session";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

const NotifyContext = createContext<((message: string) => void) | null>(null);

export function useNotify() {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error("useNotify must be used inside AppShell");
  return notify;
}

type SubItem = { label: string; href?: string };

type NavItem = {
  label: string;
  icon: string;
  href?: string;
  sub?: SubItem[];
};

const NAV: NavItem[] = [
  {
    label: "Groups",
    icon: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-1.2.5-2.2 1.3-3-.9-.6-2.2-1-3.3-1Zm8 0c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z",
    sub: [{ label: "Maple House" }, { label: "Study Squad" }, { label: "Invite member" }],
  },
  {
    label: "Chores",
    href: "/",
    icon: "M9 12l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z",
    sub: [
      { label: "Add chore", href: "/?panel=add" },
      { label: "Remove chore", href: "/?panel=remove" },
      { label: "Update rewards", href: "/rewards" },
    ],
  },
  {
    label: "Calendar",
    icon: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: "M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function itemActive(label: string, pathname: string) {
  if (label === "Chores") return pathname === "/" || pathname.startsWith("/rewards");
  if (label === "Leaderboard") return pathname.startsWith("/leaderboard");
  return false;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(
    pathname === "/" || pathname.startsWith("/rewards") ? "Chores" : null,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

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

  return (
    <NotifyContext.Provider value={notify}>
      <div className={`${display.variable} ${sans.variable} flex min-h-screen font-[family-name:var(--font-sans)] text-[#1c2750]`}>
        {!mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={false}
            aria-controls="sidebar"
            className="fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-[#d9d0e6] bg-white/80 text-lg md:hidden"
          >
            ☰
          </button>
        )}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-20 bg-[#1e2d54]/40 md:hidden" />
        )}

        <aside
          id="sidebar"
          className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col bg-[#1e2d54] p-3 text-[#dfe3f0] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-52 md:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#cdbfe0] text-sm font-semibold text-[#1e2d54]">A</div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-white">{CURRENT_USER.name}</p>
              <p className="truncate text-xs text-[#b8c0da]">{CURRENT_USER.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              aria-expanded={true}
              aria-controls="sidebar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg text-white hover:bg-white/10 md:hidden"
            >
              ×
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
            {NAV.map((item) => {
              const active = itemActive(item.label, pathname);
              const className = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#cdbfe0] ${
                active ? "bg-white/10 text-white" : "hover:bg-white/5"
              }`;
              const contents = (
                <>
                  <Icon d={item.icon} />
                  {item.label}
                  {item.sub && (
                    <svg
                      viewBox="0 0 24 24"
                      className={`ml-auto h-4 w-4 shrink-0 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`}
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
                    <ul className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-white/20 pl-3">
                      {item.sub.map((sub) => (
                        <li key={sub.label}>
                          {sub.href ? (
                            <Link
                              href={sub.href}
                              aria-current={pathname === sub.href ? "page" : undefined}
                              onClick={() => setMobileOpen(false)}
                              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#cdbfe0] ${
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
                              className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-white/85 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#cdbfe0]"
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

          <div className="mt-auto flex items-center gap-2.5 p-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
              <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-white/80" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">ChoreShare</span>
          </div>
        </aside>

        <main className="flex-1 bg-gradient-to-br from-[#e6dbe9] via-[#f1e4e8] to-[#e4d8e8] p-5 pt-16 sm:p-8 sm:pt-16 md:pt-8">
          <Suspense fallback={<p className="text-[#6b6590]">Loading…</p>}>{children}</Suspense>
        </main>

        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1c2750] px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 ${
            toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {toast}
        </div>
      </div>
    </NotifyContext.Provider>
  );
}
