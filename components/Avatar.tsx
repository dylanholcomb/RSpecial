// Initials-only avatar — colored by the subject's primary listening habit.

import type { HabitCode } from "@/lib/lq-engine";

const RING: Record<HabitCode, string> = {
  CV: "ring-habit-connective/40 bg-habit-connective/15 text-habit-connective",
  RV: "ring-habit-reflective/40 bg-habit-reflective/15 text-habit-reflective",
  AL: "ring-habit-analytical/40 bg-habit-analytical/15 text-habit-analytical",
  CL: "ring-habit-conceptual/40 bg-habit-conceptual/15 text-habit-conceptual",
};

export function Avatar({
  initials,
  primary,
  size = "md",
}: {
  initials: string;
  primary: HabitCode;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "h-9 w-9 text-sm" : size === "lg" ? "h-16 w-16 text-xl" : "h-12 w-12 text-base";
  return (
    <div
      className={[
        "flex items-center justify-center rounded-full ring-2 font-semibold tracking-wide",
        sizeClass,
        RING[primary],
      ].join(" ")}
      aria-hidden
    >
      {initials}
    </div>
  );
}
