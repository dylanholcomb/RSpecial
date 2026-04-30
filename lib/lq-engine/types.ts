// =============================================================================
// LQ ENGINE — TYPES
// -----------------------------------------------------------------------------
// This file defines the public *shape* of the LQ engine's inputs and outputs.
// It is the contract between the engine and the rest of the app.
//
// IMPORTANT — IP boundary:
// The LQ engine is the only place that knows the *internals* of the LQ /
// ECHO methodology (scoring, archetype rules, recommendation logic). Phase 1
// uses a stub that mirrors the publicly-documented framework. Phase 2 swaps
// the stub for Mosaic's real KB inside the company's Azure tenant. The types
// in this file stay stable across that swap so the UI and LLM layer never
// need to change.
//
// What may NEVER cross this boundary into the LLM prompt:
//   - Raw assessment item responses
//   - Scoring weights or rule code
//   - Any verbatim Mosaic-proprietary KB text
// What DOES cross the boundary into the LLM prompt:
//   - The structured EngineOutput (profile + framed inputs for synthesis)
// =============================================================================

/** The four ECHO listening habits, identified by their canonical 2-letter codes. */
export type HabitCode = "CV" | "RV" | "AL" | "CL";

/**
 * Each habit is oriented either toward the *content* of a message or toward
 * its *relational* impact on people. This is part of the public LQ framework.
 */
export type HabitOrientation = "content" | "relational";

/** Static metadata describing one habit. Surfaced in UI + prompt context. */
export interface HabitMeta {
  code: HabitCode;
  /** Display name, e.g. "Connective". */
  name: string;
  /** One-line definition surfaced in UI. */
  tagline: string;
  /** Content vs relational orientation. */
  orientation: HabitOrientation;
  /** What this habit's filter naturally prioritizes. */
  primaryFocus: string;
  /** What people with this habit do well. */
  strengths: string[];
  /** Where this habit's filter creates blind spots. */
  weaknesses: string[];
  /** How a person with this habit prefers to receive information. */
  receptionPreference: string;
  /** What causes a person with this habit to disengage. */
  tuneOutTrigger: string;
  /** What this habit finds especially frustrating. */
  frustration: string;
  /** Tactical phrasing that lands well with this habit. */
  tacticalPhrasing: string[];
  /** Tailwind theme color key (matches tailwind.config.ts). */
  themeKey: "connective" | "reflective" | "analytical" | "conceptual";
}

/**
 * A normalized 0–100 preference score for each habit. Phase 1 uses authored
 * scores attached to seeded employees. Phase 2 will compute these from real
 * ECHO assessment data inside the engine.
 */
export interface HabitScores {
  CV: number;
  RV: number;
  AL: number;
  CL: number;
}

/** A single rank in the habit hierarchy. */
export interface HabitRank {
  code: HabitCode;
  score: number;
  /** Where this habit sits in the hierarchy for this person. */
  role: "primary" | "secondary" | "tertiary" | "shadow";
}

/**
 * Optional archetype mapping for known profile codes (e.g. "CV-RV-AL → Resolver").
 * Not every combination has a published archetype — when none is found the
 * engine falls back to a constructed description.
 */
export interface Archetype {
  code: string; // dash-joined ranked habits, e.g. "CV-RV-AL"
  name: string;
  focus: string;
  risk: string;
  prepTip: string;
}

/**
 * The structured output the engine returns for a person. This is what the
 * LLM prompt builder consumes — the LLM never sees raw scores or scoring
 * rules, only this synthesized view.
 */
export interface EngineOutput {
  subjectId: string;
  hierarchy: HabitRank[]; // ordered: primary, secondary, tertiary, shadow
  /** Whether the top two scores are close enough to be "dual-dominant". */
  dualDominant: boolean;
  /** Optional named archetype if a known code matches. */
  archetype: Archetype | null;
  /** Habit metadata included so the LLM has all attributes inline. */
  primaryHabit: HabitMeta;
  secondaryHabit: HabitMeta | null;
  tertiaryHabit: HabitMeta | null;
  shadowHabit: HabitMeta;
  /**
   * Engine-prepared, plain-English framings the LLM can quote or paraphrase.
   * These are the "safe" outputs — they describe behavior, not the IP itself.
   */
  framings: {
    snapshot: string;
    receptionGuide: string;
    shadowWarning: string;
    conflictRisks: string[];
  };
}

/** Meeting context provided by the manager via the form. */
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
}

/** The final, manager-facing briefing object the API returns. */
export interface Briefing {
  subjectName: string;
  subjectRole: string;
  archetypeName: string | null;
  hierarchyDisplay: string; // e.g. "Connective → Reflective → Analytical (shadow: Conceptual)"
  /** SCAN™-aligned sections — Sense, Connect, Adjust, Navigate */
  sense: string;
  connect: string;
  adjust: string;
  navigate: string;
  /** Action-oriented sections */
  pitfallsToAvoid: string[];
  suggestedOpening: string;
  tailoredPhrases: string[];
  questionsToAsk: string[];
  whatToListenFor: string[];
  closingMove: string;
  /** Whether this came from the live LLM or the templated fallback. */
  generatedBy: "live" | "demo-fallback";
}
