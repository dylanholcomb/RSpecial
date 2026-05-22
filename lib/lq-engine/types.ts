// =============================================================================
// LQ ENGINE — TYPES
// -----------------------------------------------------------------------------
// Public shape of the LQ engine's inputs and outputs. This file is the
// contract between the engine and the rest of the app.
//
// IP boundary — see SOW §11. The engine is the only place that holds
// LQ-specific logic. UI / API route / LLM layer consume only the structured
// EngineOutput.
// =============================================================================

/** The four ECHO listening habits, identified by canonical 2-letter codes. */
export type HabitCode = "CV" | "RV" | "AL" | "CL";

export type HabitOrientation = "content" | "relational";

export interface HabitMeta {
  code: HabitCode;
  name: string;
  tagline: string;
  orientation: HabitOrientation;
  primaryFocus: string;
  strengths: string[];
  weaknesses: string[];
  receptionPreference: string;
  tuneOutTrigger: string;
  frustration: string;
  tacticalPhrasing: string[];
  themeKey: "connective" | "reflective" | "analytical" | "conceptual";
}

export interface HabitScores {
  CV: number;
  RV: number;
  AL: number;
  CL: number;
}

export interface HabitRank {
  code: HabitCode;
  score: number;
  role: "primary" | "secondary" | "tertiary" | "shadow";
}

/**
 * Lightweight archetype shape — retained for backward compatibility with
 * the UI which displays `archetype.name`. The richer FullProfile (below)
 * is the source of truth used by the prompt builder.
 */
export interface Archetype {
  code: string;
  name: string;
  focus: string;
  risk: string;
  prepTip: string;
}

/**
 * One of the four "How this profile interacts with [listening type]" blocks
 * from the proprietary 41-profile catalog. Free-text guidance, treated as
 * natural-language input to the LLM (not parsed into bullet structures).
 */
export interface ProfileInteraction {
  atBest: string;
  challenges: string;
  suggestions: string;
}

/**
 * Dominance type — how many habits this profile relies on, per the
 * official 41-profile taxonomy:
 *
 *   single      — one habit (4 profiles, e.g. The Connector)
 *   dual        — two habits in balance (12 profiles, e.g. The Empathizer)
 *   triple      — three habits in interplay (24 profiles, e.g. The Inventor)
 *   non_dominant — all four habits, no preference (1 profile, The Flexer)
 *
 * Critical for UI + prompt language:
 *   - dual is "balance both lanes, can stall when choosing"
 *   - triple is "habits in interplay, mutual muting of fullest expression" —
 *     NOT "either/or" or "balance two lanes" (SME correction, 2026-05-22)
 *   - non_dominant has no shadow habit
 */
export type DominanceType = "single" | "dual" | "triple" | "non_dominant";

/**
 * A full entry from the proprietary 41-profile catalog. Loaded from
 * profiles-41.json. This is the rich data the prompt builder includes
 * when calling Vertex AI Gemini.
 *
 * v0.6 (2026-05-22): re-parsed from the canonical PDF delivered by LQ.
 * Now includes structured strengths / possibleChallenges / shortDescription
 * (third-person) and dominanceType. Drives the SME-correct tile copy and
 * gives the prompt builder cleanly separated source material.
 */
export interface FullProfile {
  /** Habit-chain code (e.g., "CV-RV-AL"), or "FLEXER" for the balanced profile. */
  code: string;
  /** Display name (e.g., "The Resolver"). */
  name: string;
  /** Highest-preference habit, or null for The Flexer. */
  primaryHabit: HabitCode | null;
  /** Ordered habit chain — primary, secondary, tertiary. */
  habitChain: HabitCode[];
  /** Single / dual / triple / non_dominant — derived from habitChain length. */
  dominanceType: DominanceType;
  /** Canonical second-person intro paragraph as written in the PDF. */
  intro: string;
  /**
   * Third-person canonical intro suitable for tile copy.
   * Replaces the legacy "Listens like the Inventor" template per SME feedback —
   * "Inventors listen for everything that can be informative...".
   */
  shortDescription: string;
  /** Canonical Strengths section. */
  strengths: string;
  /** Canonical Possible challenges section — this is the source of truth for "shadow" framing. */
  possibleChallenges: string;
  /** Five actionable insights for someone with this profile. */
  insights: string[];
  /** How this profile interacts with each of the four listening types. */
  interactions: {
    CV: ProfileInteraction;
    RV: ProfileInteraction;
    AL: ProfileInteraction;
    CL: ProfileInteraction;
  };
}

/** Structured engine output sent to the LLM prompt builder. */
export interface EngineOutput {
  subjectId: string;
  hierarchy: HabitRank[];
  /**
   * @deprecated since v0.6 — prefer `dominanceType`. Retained for any older
   * consumer still reading it (the API still emits it).
   */
  dualDominant: boolean;
  /**
   * Dominance type per the official taxonomy. Drives both UI rendering
   * (how many habits to show on the tile) and prompt language (interplay
   * for triple vs. either-or for dual).
   */
  dominanceType: DominanceType;
  /**
   * Lightweight archetype shape — derived from the full profile. Retained
   * for backward compatibility with the UI which displays archetype.name.
   */
  archetype: Archetype | null;
  /**
   * The matched full profile from the proprietary 41-profile catalog.
   * This is the rich data the prompt builder uses. NEW in v0.3.
   */
  profile: FullProfile | null;
  primaryHabit: HabitMeta;
  secondaryHabit: HabitMeta | null;
  tertiaryHabit: HabitMeta | null;
  shadowHabit: HabitMeta;
  framings: {
    snapshot: string;
    receptionGuide: string;
    shadowWarning: string;
    conflictRisks: string[];
  };
}

export type MeetingPurpose =
  | "1:1 check-in"
  | "feedback"
  | "coaching"
  | "planning"
  | "difficult conversation";

export interface MeetingContext {
  purpose: MeetingPurpose;
  topOfMind: string;
  desiredOutcome: string;
  /**
   * Optional dated updates the manager wants the briefing to factor in for
   * THIS conversation only — e.g., "Last Tuesday they presented to the exec
   * team and got pushback on slide 7," or "Since March they've been leading
   * the new SLA workstream."
   *
   * PERSISTENCE: same promise as privateContext. The API route MUST strip
   * this field from MeetingContext before persisting BriefingDoc, and the
   * audit log only records the FACT that recent-context additions were used
   * (recentContextAdditionsUsed: boolean), never the content.
   *
   * Format: free text. Manager is encouraged (via the field's helper copy)
   * to include dates so the LLM can weight recency. No structured schema —
   * we let the LLM read natural-language dates.
   */
  recentContextAdditions?: string;
  /**
   * Optional private context supplied by the manager for this single briefing.
   *
   * SENSITIVITY: this field carries information the manager would not want
   * stored in any system of record — health, family, fertility, financial
   * stress, personal life events. Two invariants enforce that promise:
   *
   *   1. The API route MUST strip privateContext from MeetingContext before
   *      persisting BriefingDoc.meetingContext to Firestore.
   *   2. The audit log records only the FACT that private context was used
   *      (privateContextUsed: boolean), never the content.
   *
   * The prompt builder receives this content; Vertex AI processes it under
   * the enterprise no-training contract and does not retain it.
   */
  privateContext?: string;
}

export interface Briefing {
  subjectName: string;
  subjectRole: string;
  archetypeName: string | null;
  hierarchyDisplay: string;
  sense: string;
  connect: string;
  adjust: string;
  navigate: string;
  pitfallsToAvoid: string[];
  suggestedOpening: string;
  tailoredPhrases: string[];
  questionsToAsk: string[];
  whatToListenFor: string[];
  closingMove: string;
  generatedBy: "live" | "demo-fallback";
}
