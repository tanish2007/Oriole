"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CURRENT_USER } from "@/lib/chores";
import { type Modal, useApp } from "@/components/app-context";

const NAV: { label: string; href: string; icon: string; menu?: boolean }[] = [
  { label: "Groups", href: "/groups", icon: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.7 0-8 1.3-8 4v2h10v-2c0-1.2.5-2.2 1.3-3-.9-.6-2.2-1-3.3-1Zm8 0c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z", menu: true },
  { label: "Chores", href: "/", icon: "M9 12l2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z", menu: true },
  { label: "Calendar", href: "/calendar", icon: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" },
  { label: "Leaderboard", href: "/leaderboard", icon: "M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3" },
];

type SubAction = Modal | "invite" | number;

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Sidebar() {
  const { groups, group, switchGroup, setModal, inviteMember } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>("Chores");

  const submenus: Record<string, { label: string; action: SubAction; current?: boolean }[]> = {
    Groups: [
      ...groups.map((item) => ({ label: item.name, action: item.id, current: item.id === group?.id })),
      { label: "Invite member", action: "invite" },
    ],
    Chores: [
      { label: "Add chore", action: "add-chore" },
      { label: "Remove chore", action: "remove-chore" },
      { label: "Update rewards", action: "update-rewards" },
    ],
  };

  const runSubmenu = (action: SubAction) => {
    setOpen(false);
    if (typeof action === "number") {
      switchGroup(action);
      router.push("/");
    } else if (action === "invite") inviteMember();
    else setModal(action);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={false}
          aria-controls="sidebar"
          className="fixed left-3 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-[#d9d0e6] bg-white/80 text-lg md:hidden"
        >
          ☰
        </button>
      )}
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-[#1e2d54]/40 md:hidden" />}

      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col overflow-y-auto bg-[#1e2d54] p-3 text-[#dfe3f0] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-52 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex items-center gap-1 rounded-xl border border-white/10 ${pathname === "/profile" ? "bg-white/10" : "bg-white/5"}`}>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            aria-label="Open profile"
            aria-current={pathname === "/profile" ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-3 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#cdbfe0]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#cdbfe0] text-sm font-semibold text-[#1e2d54]">{CURRENT_USER.name[0]}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold text-white">{CURRENT_USER.name}</span>
              <span className="block truncate text-xs text-[#b8c0da]">{CURRENT_USER.email}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            aria-expanded={true}
            aria-controls="sidebar"
            className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg text-white hover:bg-white/10 md:hidden"
          >
            ×
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const sub = submenus[item.label];
            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => {
                    if (item.menu) setOpenMenu(openMenu === item.label ? null : item.label);
                    else setOpen(false);
                  }}
                  aria-current={active ? "page" : undefined}
                  aria-expanded={item.menu ? openMenu === item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#cdbfe0] ${
                    active ? "bg-white/10 text-white" : "hover:bg-white/5"
                  }`}
                >
                  <Icon d={item.icon} />
                  {item.label}
                  {item.menu && <Icon d="M6 9l6 6 6-6" className={`ml-auto h-4 w-4 transition-transform ${openMenu === item.label ? "rotate-180" : ""}`} />}
                </Link>

                {sub && openMenu === item.label && (
                  <ul className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-white/20 pl-3">
                    {sub.map((s) => (
                      <li key={s.label}>
                        <button
                          type="button"
                          onClick={() => runSubmenu(s.action)}
                          aria-current={s.current ? "true" : undefined}
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#cdbfe0] ${
                            s.current ? "font-semibold text-white" : "text-white/85"
                          }`}
                        >
                          {s.label}
                        </button>
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
    </>
  );
}
