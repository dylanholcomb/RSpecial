// Small colored chip representing one listening habit. Used in roster cards
// and profile snapshots.

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

interface HabitChipProps {
  code: HabitCode;
  role?: "primary" | "secondary" | "tertiary" | "shadow";
  size?: "sm" | "md";
}

export function HabitChip({ code, role, size = "md" }: HabitChipProps) {
  const habit = HABITS[code];
  const isShadow = role === "shadow";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full ring-1 font-medium",
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
