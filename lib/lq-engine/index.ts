// =============================================================================
// LQ ENGINE — PUBLIC API
// -----------------------------------------------------------------------------
// Single entry point the rest of the app uses. Consumers import
// `analyzeProfile` (and the types) from "@/lib/lq-engine" and never reach
// into internal files.
//
// v0.3 (2026-05-12): now backed by the proprietary 41-profile catalog
// delivered by LQ. The EngineOutput includes the full looked-up profile,
// which the prompt builder uses to give Gemini rich per-interaction guidance.
// =============================================================================

import { HABITS, HABIT_CODES } from "./habits";
import { findArchetype, toArchetype, findProfileWithFallback } from "./archetypes";
import { conflictPatternsFor } from "./conflict";
import { findProfile, makeProfileCode } from "./profiles-41";
import type {
  DominanceType,
  EngineOutput,
  FullProfile,
  HabitCode,
  HabitRank,
  HabitScores,
} from "./types";

export type {
  Archetype,
  Briefing,
  DominanceType,
  EngineOutput,
  FullProfile,
  HabitCode,
  HabitMeta,
  HabitRank,
  HabitScores,
  MeetingContext,
  MeetingPurpose,
  ProfileInteraction,
} from "./types";

export { HABITS, HABIT_CODES, habitLabel } from "./habits";
export { PROFILES_41, findProfile, findProfileWithFallback } from "./profiles-41";

// =============================================================================
// Score-gap → dominance-type inference
// -----------------------------------------------------------------------------
// Per Allison SME guidance (2026-05-22): dominance type is derived from the
// SHAPE of the score distribution, not from "always take top three." The
// rules (locked thresholds for v0.6):
//
//   - Non-dominant (Flexer): all four scores within FLEXER_SPREAD points
//     of each other — no habit stands out, person flexes across all four.
//   - Single-dominant: gap between #1 and #2 is at least SINGLE_GAP. The
//     top habit clearly drives.
//   - Dual-dominant: top two are close (< SINGLE_GAP) AND the gap from
//     #2 to #3 is at least DUAL_GAP. Two habits in balance, then a drop.
//   - Triple-dominant: top three are close (each consecutive gap < DUAL_GAP)
//     AND the gap from #3 to #4 is at least TRIPLE_GAP. Three habits in
//     interplay, with one clear shadow.
//
// Thresholds chosen to keep the existing seeded triples (Priya, Marcus, etc.)
// classifying as triples while making clean single / dual / Flexer detection
// possible. See seed data in data/employees.ts for canonical examples.
// =============================================================================
const SINGLE_GAP = 15;       // #1 must lead #2 by this much to be single
const DUAL_GAP   = 15;       // #2 must lead #3 by this much to be dual
const TRIPLE_GAP = 15;       // #3 must lead #4 by this much to be triple
const FLEXER_SPREAD = 10;    // max-min < this => Flexer
const SHADOW_THRESHOLD = 35; // score below which the lowest habit is "shadow"

function rankHabits(scores: HabitScores, dominance: DominanceType): HabitRank[] {
  const sorted = HABIT_CODES
    .map(code => ({ code, score: scores[code] }))
    .sort((a, b) => b.score - a.score);

  // The Flexer has no shadow — all four habits are in active rotation.
  // For everyone else, the lowest-scoring habit is the shadow when it's
  // below SHADOW_THRESHOLD.
  const shadowCode = sorted[sorted.length - 1].code;
  const labels: Array<HabitRank["role"]> = ["primary", "secondary", "tertiary"];

  return sorted.map((entry, idx) => {
    if (dominance === "non_dominant") {
      // Flexer: no shadow at all. Roles cycle primary/secondary/tertiary/tertiary
      // — they're all roughly equivalent.
      return {
        code: entry.code,
        score: entry.score,
        role: (labels[idx] ?? "tertiary") as HabitRank["role"],
      };
    }
    return {
      code: entry.code,
      score: entry.score,
      role: entry.code === shadowCode && entry.score < SHADOW_THRESHOLD
        ? "shadow"
        : (labels[idx] ?? "shadow"),
    };
  });
}

/**
 * Infer dominance type from the raw score distribution. Runs BEFORE catalog
 * lookup so the right-length code (1 / 2 / 3 / FLEXER) can be built.
 */
function inferDominanceType(scores: HabitScores): DominanceType {
  const vals = [scores.CV, scores.RV, scores.AL, scores.CL].sort((a, b) => b - a);
  const spread = vals[0] - vals[3];
  if (spread < FLEXER_SPREAD) return "non_dominant";

  const gap12 = vals[0] - vals[1];
  const gap23 = vals[1] - vals[2];
  const gap34 = vals[2] - vals[3];

  if (gap12 >= SINGLE_GAP) return "single";
  if (gap23 >= DUAL_GAP) return "dual";
  if (gap34 >= TRIPLE_GAP) return "triple";
  // Falls here when no clear gap anywhere — treat as triple (3 close, then
  // shadow), but with all gaps small we let the catalog matcher pick the
  // closest triple by primary chain.
  return "triple";
}

/**
 * Build the right-length catalog code for the inferred dominance type.
 *
 *   single       → "CV"
 *   dual         → "CV-RV"
 *   triple       → "CV-RV-AL"
 *   non_dominant → "FLEXER"
 */
function profileCodeFor(
  hierarchy: HabitRank[],
  dominance: DominanceType,
): string {
  if (dominance === "non_dominant") return "FLEXER";
  const count = dominance === "single" ? 1 : dominance === "dual" ? 2 : 3;
  return hierarchy.slice(0, count).map(h => h.code).join("-");
}

/**
 * Number of habits to render on the roster tile / employee header. Drives
 * the SME-correct display: single profiles show 1 habit, dual show 2,
 * triple show 3, non-dominant (Flexer) shows all four.
 */
export function visibleHabitCount(dominance: DominanceType): number {
  switch (dominance) {
    case "single": return 1;
    case "dual": return 2;
    case "triple": return 3;
    case "non_dominant": return 4;
  }
}

/**
 * Whether this dominance type has a meaningful "shadow" habit to surface.
 * The Flexer has no shadow (no single under-used filter — they cycle
 * through all four).
 */
export function hasShadow(dominance: DominanceType): boolean {
  return dominance !== "non_dominant";
}

export function analyzeProfile(
  subjectId: string,
  scores: HabitScores,
): EngineOutput {
  // Per Allison SME guidance: infer dominance from score gaps FIRST so the
  // hierarchy assigns shadow-role correctly (Flexer has no shadow), and so
  // the catalog lookup builds the right-length code (not always a triple).
  const inferredDominance = inferDominanceType(scores);
  const hierarchy = rankHabits(scores, inferredDominance);
  const code = profileCodeFor(hierarchy, inferredDominance);
  const profile = findProfile(code) ?? findProfileWithFallback(code);
  const archetype = profile ? toArchetype(profile) : null;
  // The matched profile's own dominanceType is the authoritative answer
  // (the catalog knows whether a given habit-chain is officially classified
  // single / dual / triple). Fall back to the inferred value when off-catalog.
  const dominanceType: DominanceType = profile?.dominanceType ?? inferredDominance;

  const primary = hierarchy[0];
  const secondary = hierarchy[1] ?? null;
  const tertiary = hierarchy[2] ?? null;
  const shadow = hierarchy[hierarchy.length - 1];

  const primaryHabit = HABITS[primary.code];
  const shadowHabit = HABITS[shadow.code];

  const framings = {
    snapshot: buildSnapshot(hierarchy, dominanceType, profile),
    receptionGuide: `Lead with ${primaryHabit.receptionPreference.toLowerCase()} `
      + `Avoid ${primaryHabit.tuneOutTrigger.toLowerCase()}`,
    // Per Allison SME feedback (2026-05-22): shadow is BOTH a content blind
    // spot AND a tune-out trigger. Listeners get frustrated / impatient when
    // a conversation lives in their shadow lane.
    shadowWarning: hasShadow(dominanceType)
      ? `${shadowHabit.name} is this person${"’"}s under-used filter. They are likely to discount `
        + `${shadowHabit.primaryFocus.toLowerCase()} unless you make a deliberate move to surface it. `
        + `They are also more likely to tune out, get impatient, or become frustrated when the `
        + `conversation lives in this lane — ${shadowHabit.frustration.toLowerCase()}`
      : `No single shadow habit — this profile draws on all four listening habits roughly equally.`,
    conflictRisks: conflictPatternsFor(primary.code).map(p => p.description),
  };

  return {
    subjectId,
    hierarchy,
    dualDominant: dominanceType === "dual",
    dominanceType,
    archetype,
    profile,
    primaryHabit,
    secondaryHabit: secondary ? HABITS[secondary.code] : null,
    tertiaryHabit: tertiary ? HABITS[tertiary.code] : null,
    shadowHabit,
    framings,
  };
}

/**
 * Build the tile-level snapshot string. Per Allison SME feedback (2026-05-22):
 *
 *   - Prefer the canonical third-person short description from the catalog
 *     (e.g., "Inventors listen for everything that can be informative...").
 *   - NO arrows between habits — arrows imply hierarchy. Habits in a multi-
 *     dominant profile interplay; they do not waterfall.
 *   - Dual is the only profile shape where "balance two lanes" applies. Triple
 *     is about interplay and mutual muting, not popcorn between two.
 */
function buildSnapshot(
  hierarchy: HabitRank[],
  dominance: DominanceType,
  profile: FullProfile | null,
): string {
  // The canonical short description IS the snapshot when we have a profile.
  if (profile?.shortDescription) {
    return profile.shortDescription;
  }

  // Fallback for off-catalog scores: build a description from scratch using
  // the right dominance-aware language. No arrows.
  const dominant = hierarchy.filter(h => h.role !== "shadow");
  const names = dominant.map(h => HABITS[h.code].name);
  const shadow = hierarchy.find(h => h.role === "shadow");
  const shadowName = shadow ? HABITS[shadow.code].name : null;

  let intro: string;
  switch (dominance) {
    case "single":
      intro = `Leads with ${names[0]}.`;
      break;
    case "dual":
      intro = `Balances ${names[0]} and ${names[1]} — can stall when forced to choose between them.`;
      break;
    case "triple":
      intro = `Draws on ${names[0]}, ${names[1]}, and ${names[2]} in interplay — no single habit dominates; each tempers the others.`;
      break;
    case "non_dominant":
      intro = `Cycles through all four listening habits without a fixed preference.`;
      break;
  }

  const shadowNote = hasShadow(dominance) && shadowName
    ? ` Shadow habit: ${shadowName} — easy to miss without a deliberate prompt, and a likely tune-out point.`
    : "";

  return intro + shadowNote;
}

// Re-export for any consumer that still uses makeProfileCode
export { makeProfileCode };

/**
 * Synthesize canonical scores that will deterministically map to the given
 * catalog profile when fed back into analyzeProfile. Used by the ad-hoc
 * subject flow: the manager picks a profile by name; we materialize a score
 * set so the rest of the engine + prompt pipeline can run unchanged.
 *
 * The synthesized scores honor the v0.6 dominance thresholds:
 *   - single: top=85, others=42 (gap_12 = 43 ≥ SINGLE_GAP)
 *   - dual:   top=80, sec=76, others=42, 30 (gap_12 small, gap_23 ≥ DUAL_GAP)
 *   - triple: top=80, sec=74, tert=68, last=22 (gap_34 ≥ TRIPLE_GAP)
 *   - flexer: all four at 65 (spread = 0 < FLEXER_SPREAD)
 *
 * For dominance types with multiple ranked habits, the ordering matches the
 * profile's habitChain so analyzeProfile's lookup hits the exact catalog
 * entry. For The Flexer, all four habits get equal scores.
 */
export function synthesizeScoresForProfile(profile: FullProfile): HabitScores {
  const base: HabitScores = { CV: 0, RV: 0, AL: 0, CL: 0 };
  if (profile.dominanceType === "non_dominant") {
    return { CV: 65, RV: 65, AL: 65, CL: 65 };
  }

  const chainLevels: number[] =
    profile.dominanceType === "single" ? [85] :
    profile.dominanceType === "dual"   ? [80, 76] :
    /* triple */                         [80, 74, 68];

  // Off-chain habits get low scores in canonical order. Last one is always
  // the shadow (well under SHADOW_THRESHOLD when the chain is ≥2 long, or
  // under SINGLE_GAP from the primary when single-dominant).
  const offChain = (["CV", "RV", "AL", "CL"] as HabitCode[]).filter(
    h => !profile.habitChain.includes(h),
  );
  // Assign chain levels in habit-chain order
  profile.habitChain.forEach((h, i) => { base[h] = chainLevels[i]; });
  // Assign off-chain remainder
  if (profile.dominanceType === "single") {
    offChain.forEach((h, i) => { base[h] = 42 - i * 2; }); // 42, 40, 38
  } else if (profile.dominanceType === "dual") {
    base[offChain[0]] = 42;
    base[offChain[1]] = 30; // shadow
  } else {
    // triple — one off-chain habit, deeply shadow
    base[offChain[0]] = 22;
  }
  return base;
}
