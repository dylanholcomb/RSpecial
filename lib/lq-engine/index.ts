// =============================================================================
// LQ ENGINE — PUBLIC API
// -----------------------------------------------------------------------------
// The single entry point the rest of the app uses. Consumers import
// `analyzeProfile` (and the types) from "@/lib/lq-engine" and never reach
// into internal files.
//
// Phase 2 swap plan:
//   - Replace the body of analyzeProfile() with a call into Mosaic's KB.
//   - Keep the EngineOutput shape identical so the LLM prompt builder, API
//     route, and UI continue to work without changes.
// =============================================================================

import { HABITS, HABIT_CODES } from "./habits";
import { findArchetype } from "./archetypes";
import { conflictPatternsFor } from "./conflict";
import type {
  EngineOutput,
  HabitCode,
  HabitRank,
  HabitScores,
} from "./types";

export type {
  Briefing,
  EngineOutput,
  HabitCode,
  HabitMeta,
  HabitRank,
  HabitScores,
  MeetingContext,
  MeetingPurpose,
} from "./types";

export { HABITS, HABIT_CODES, habitLabel } from "./habits";

/** A score gap below this threshold makes the top two habits "dual-dominant". */
const DUAL_DOMINANT_THRESHOLD = 8;

/** A score below this is treated as a meaningfully under-used (shadow) habit. */
const SHADOW_THRESHOLD = 35;

/**
 * Build a hierarchy of habit ranks from raw scores. The lowest-scoring habit
 * is tagged as the shadow. The remaining habits are sorted highest-to-lowest
 * and labeled primary / secondary / tertiary.
 */
function rankHabits(scores: HabitScores): HabitRank[] {
  const sorted = HABIT_CODES
    .map(code => ({ code, score: scores[code] }))
    .sort((a, b) => b.score - a.score);

  const shadowCode = sorted[sorted.length - 1].code;
  const labels: Array<HabitRank["role"]> = ["primary", "secondary", "tertiary"];

  return sorted.map((entry, idx) => ({
    code: entry.code,
    score: entry.score,
    role: entry.code === shadowCode && entry.score < SHADOW_THRESHOLD
      ? "shadow"
      : (labels[idx] ?? "shadow"),
  }));
}

/**
 * Compose a profile code from the ranked hierarchy, used for archetype
 * lookup. The shadow habit is excluded from the code (matching how LQ
 * publishes archetypes — by their dominant 2 or 3 habits).
 */
function profileCode(hierarchy: HabitRank[]): { full: string; short: string } {
  const dominant = hierarchy.filter(h => h.role !== "shadow");
  const all = dominant.map(h => h.code).join("-");
  const top2 = dominant.slice(0, 2).map(h => h.code).join("-");
  return { full: all, short: top2 };
}

/**
 * MAIN PUBLIC FUNCTION.
 *
 * Given a subject's habit scores, return the structured EngineOutput. This
 * is the only function the LLM prompt builder sees from this module.
 */
export function analyzeProfile(
  subjectId: string,
  scores: HabitScores,
): EngineOutput {
  const hierarchy = rankHabits(scores);
  const { full, short } = profileCode(hierarchy);

  // Try the most-specific archetype code first, then fall back to the 2-habit version.
  const archetype = findArchetype(full) ?? findArchetype(short);

  const primary = hierarchy[0];
  const secondary = hierarchy[1] ?? null;
  const tertiary = hierarchy[2] ?? null;
  const shadow = hierarchy[hierarchy.length - 1];

  const dualDominant =
    !!secondary && Math.abs(primary.score - secondary.score) < DUAL_DOMINANT_THRESHOLD;

  const primaryHabit = HABITS[primary.code];
  const shadowHabit = HABITS[shadow.code];

  // Build the engine-prepared framings. These are short, *behavioural*
  // sentences the LLM can quote or paraphrase. They never disclose scoring
  // logic or proprietary KB content.
  const framings = {
    snapshot: buildSnapshot(hierarchy, dualDominant, archetype?.name ?? null),
    receptionGuide: `Lead with ${primaryHabit.receptionPreference.toLowerCase()} `
      + `Avoid ${primaryHabit.tuneOutTrigger.toLowerCase()}`,
    shadowWarning:
      `${shadowHabit.name} is this person's under-used filter. They are likely to discount `
      + `${shadowHabit.primaryFocus.toLowerCase()} unless you make a deliberate move to surface it. `
      + `Their typical frustration in this lane: ${shadowHabit.frustration.toLowerCase()}`,
    conflictRisks: conflictPatternsFor(primary.code).map(p => p.description),
  };

  return {
    subjectId,
    hierarchy,
    dualDominant,
    archetype,
    primaryHabit,
    secondaryHabit: secondary ? HABITS[secondary.code] : null,
    tertiaryHabit: tertiary ? HABITS[tertiary.code] : null,
    shadowHabit,
    framings,
  };
}

function buildSnapshot(
  hierarchy: HabitRank[],
  dualDominant: boolean,
  archetypeName: string | null,
): string {
  const dominant = hierarchy.filter(h => h.role !== "shadow");
  const names = dominant.map(h => HABITS[h.code].name);
  const shadow = hierarchy.find(h => h.role === "shadow");
  const shadowName = shadow ? HABITS[shadow.code].name : null;

  const intro = archetypeName
    ? `Listens like ${archetypeName} (${names.join(" → ")}).`
    : `Lead listening pattern: ${names.join(" → ")}.`;

  const dominantNote = dualDominant
    ? ` Top two habits are close — they balance both lanes well, but can stall when forced to choose.`
    : "";

  const shadowNote = shadowName
    ? ` Shadow habit: ${shadowName} — easy to miss without a deliberate prompt.`
    : "";

  return intro + dominantNote + shadowNote;
}
