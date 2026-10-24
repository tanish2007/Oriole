import type { ReactNode } from "react";
import type { Member, Status } from "@/lib/chores";

export const STATUS_STYLE: Record<Status, { label: string; pill: string; dot: string }> = {
  available: { label: "Available", pill: "bg-[#ebe6f1] text-[#1c2750]", dot: "bg-[#1c2750]" },
  in_progress: { label: "In progress", pill: "bg-[#ebe6f1] text-[#9a7fb0]", dot: "bg-[#b79fca]" },
  completed: { label: "Completed", pill: "bg-[#dcefe3] text-[#2f6b4a]", dot: "bg-[#3f8a62]" },
};

export const panelClass = "rounded-3xl border border-white/70 bg-[#f4f0f8]/90 p-5 sm:p-6";
export const listItemClass = "rounded-2xl bg-[#ebe6f1]";
export const primaryButtonClass =
  "rounded-lg bg-[#1c2750] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b3a6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c2750] disabled:opacity-50";
export const secondaryButtonClass =
  "rounded-lg border border-[#d5cde3] px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/60";
export const inputClass =
  "w-full rounded-xl border border-[#d5cde3] bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-[#a59fbd] focus:border-[#9a7fb0] focus:ring-2 focus:ring-[#9a7fb0]/30";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDue(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day || month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${day}`;
}

export function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function assigneeName(assigneeId: number | null, members: Member[]) {
  if (assigneeId == null) return null;
  return members.find((member) => member.id === assigneeId)?.name ?? "Unknown";
}

export function Field({ id, label, optional, error, hint, children }: { id: string; label: string; optional?: boolean; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-[#6b6590]"> (optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm text-[#b3402f]">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-[#6b6590]">{hint}</p>}
    </div>
  );
}

export function ViewHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#9a7fb0]">{eyebrow}</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight">{title}</h1>
        <p className="mt-1 text-[#7c6f9c]">{subtitle}</p>
      </div>
      {children}
    </header>
  );
}

export function Tabs<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-xl bg-[#e9e3f1] p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={`rounded-lg px-4 py-1.5 text-[15px] font-medium transition-colors ${
            value === option ? "bg-white shadow-sm" : "text-[#6b6590] hover:text-[#1c2750]"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
