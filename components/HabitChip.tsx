// Small colored chip representing one listening habit. Used in roster cards
// and profile snapshots.
//
// v0.6.5 (May 26, 2026): per Anne UX feedback, each chip surfaces a hover
// tooltip explaining the habit, the role (primary / secondary / tertiary /
// shadow), and a one-sentence definition. The visualization teaches itself.

import { HABITS, type HabitCode } from "@/lib/lq-engine";

const TEXT_COLOR: Record<HabitCode, string> = {
  CV: "text-habit-connective",
  RV: "text-habit-reflective",
  AL: "text-habit-analytical",
  CL: "text-habit-conceptual",
};

const BG_COLOR: Record<HabitCode, string> = {
  CV: "bg-habit-connective/10",
  RV: "bg-habit-reflective/10",
  AL: "bg-habit-analytical/10",
  CL: "bg-habit-conceptual/10",
};

const RING_COLOR: Record<HabitCode, string> = {
  CV: "ring-habit-connective/30",
  RV: "ring-habit-reflective/30",
  AL: "ring-habit-analytical/30",
  CL: "ring-habit-conceptual/30",
};

type ChipRole = "primary" | "secondary" | "tertiary" | "shadow";

const ROLE_LABEL: Record<ChipRole, string> = {
  primary: "Primary habit",
  secondary: "Secondary habit",
  tertiary: "Tertiary habit",
  shadow: "Shadow habit",
};

const ROLE_BLURB: Record<ChipRole, string> = {
  primary: "the listening lane that drives this person most.",
  secondary: "an active habit that supports the primary lane.",
  tertiary: "the third habit in an active rotation.",
  shadow: "the under-used filter — easy to miss, and a likely tune-out lane when the conversation lives here.",
};

interface HabitChipProps {
  code: HabitCode;
  role?: ChipRole;
  size?: "sm" | "md";
}

function tooltipFor(code: HabitCode, role?: ChipRole): string {
  const habit = HABITS[code];
  const roleLabel = role ? ROLE_LABEL[role] : "Listening habit";
  const blurb = role ? ROLE_BLURB[role] : "";
  return `${habit.name} (${code}) — ${roleLabel}. ${blurb}`.trim();
}

export function HabitChip({ code, role, size = "md" }: HabitChipProps) {
  const habit = HABITS[code];
  const isShadow = role === "shadow";

  return (
    <span
      title={tooltipFor(code, role)}
      className={[
        "inline-flex items-center gap-1.5 rounded-full ring-1 font-medium cursor-help",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        isShadow
          ? "bg-canvas-subtle text-ink-500 ring-ink-300/40"
          : `${BG_COLOR[code]} ${TEXT_COLOR[code]} ${RING_COLOR[code]}`,
      ].join(" ")}
    >
      {!isShadow && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "currentColor" }}
          aria-hidden
        />
      )}
      {isShadow && <span className="text-[10px] uppercase tracking-wide">shadow</span>}
      <span>{habit.name}</span>
    </span>
  );
}
