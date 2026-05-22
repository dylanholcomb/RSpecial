// Tiny 4-bar sparkline of the listening-habit scores. One bar per habit, in
// canonical CV → RV → AL → CL order, each colored by its habit theme. Bar
// heights are normalized to the max score in the set so visual contrast
// reads even when the absolute scores are bunched.
//
// Added per Allison SME feedback (2026-05-22): tile should hint at the
// underlying score distribution, not just the named habits. Stays small and
// monochrome-ish so the habit chips remain the dominant visual element.

import type { HabitCode, HabitScores } from "@/lib/lq-engine";

const BAR_ORDER: HabitCode[] = ["CV", "RV", "AL", "CL"];

const BAR_COLOR: Record<HabitCode, string> = {
  CV: "fill-habit-connective",
  RV: "fill-habit-reflective",
  AL: "fill-habit-analytical",
  CL: "fill-habit-conceptual",
};

interface Props {
  scores: HabitScores;
  className?: string;
  ariaLabel?: string;
}

export function ScoreBars({ scores, className, ariaLabel }: Props) {
  // Normalize bar heights against the local max for visible contrast even
  // when scores are bunched in a narrow range (typical for Flexer-like).
  const max = Math.max(scores.CV, scores.RV, scores.AL, scores.CL, 1);
  const barWidth = 5;
  const gap = 3;
  const height = 18;
  const minBar = 3; // minimum visible bar height even for very low scores

  return (
    <svg
      width={BAR_ORDER.length * barWidth + (BAR_ORDER.length - 1) * gap}
      height={height}
      viewBox={`0 0 ${BAR_ORDER.length * barWidth + (BAR_ORDER.length - 1) * gap} ${height}`}
      className={className}
      role="img"
      aria-label={
        ariaLabel ??
        `Listening scores — CV ${scores.CV}, RV ${scores.RV}, AL ${scores.AL}, CL ${scores.CL}`
      }
    >
      {BAR_ORDER.map((code, i) => {
        const v = scores[code];
        const h = Math.max(minBar, Math.round((v / max) * height));
        const x = i * (barWidth + gap);
        const y = height - h;
        return (
          <rect
            key={code}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={1}
            className={BAR_COLOR[code]}
          />
        );
      })}
    </svg>
  );
}
