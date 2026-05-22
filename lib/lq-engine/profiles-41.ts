// =============================================================================
// LQ ENGINE — REAL 41 PROFILES CATALOG
// -----------------------------------------------------------------------------
// Typed re-export of the proprietary 41-profile knowledge base delivered by
// LQ on 2026-05-12. The underlying JSON file is the source of truth; this
// module provides the typed view and exposes lookup helpers.
//
// IP boundary: this file lives inside lib/lq-engine/, which is the system's
// IP perimeter. Contents are never exposed to external LLMs directly — they
// are passed only to Vertex AI Gemini under the enterprise no-training
// contract via the prompt-builder, and the briefing the LLM produces is
// shown only to authorized application users.
// =============================================================================

import rawData from "./profiles-41.json";
import type { FullProfile, HabitCode } from "./types";

export const PROFILES_41 = rawData as unknown as FullProfile[];

// Fast lookup by code (e.g., "CV-RV-AL" → "The Resolver").
const PROFILE_BY_CODE: Map<string, FullProfile> = new Map(
  PROFILES_41.map(p => [p.code, p]),
);

/**
 * Look up a full profile by its habit-chain code. Returns null when there is
 * no exact match — callers should fall back to a constructed description in
 * that case (see lib/lq-engine/index.ts buildSnapshot()).
 *
 * Lookup is strict: "CV-AL-RV" does NOT match "CV-AL". Use findProfileWithFallback
 * if you want progressive narrowing.
 */
export function findProfile(code: string): FullProfile | null {
  return PROFILE_BY_CODE.get(code) ?? null;
}

/**
 * Look up a profile, progressively narrowing the code if exact match fails.
 *   1. Try full code (e.g., "CV-RV-AL")
 *   2. Try first two habits (e.g., "CV-RV")
 *   3. Try just the primary habit (e.g., "CV")
 * Returns null only if no match is possible (which would be a data bug).
 */
export function findProfileWithFallback(code: string): FullProfile | null {
  const exact = findProfile(code);
  if (exact) return exact;
  const parts = code.split("-");
  if (parts.length >= 2) {
    const twoHabit = findProfile(parts.slice(0, 2).join("-"));
    if (twoHabit) return twoHabit;
  }
  if (parts.length >= 1) {
    const oneHabit = findProfile(parts[0]);
    if (oneHabit) return oneHabit;
  }
  return null;
}

/**
 * Build a profile code from an ordered list of habit codes.
 * Example: ["CV", "RV", "AL"] → "CV-RV-AL"
 */
export function makeProfileCode(habitChain: HabitCode[]): string {
  return habitChain.join("-");
}

/** All 41 profile names — exposed for UI surfaces that want to list them. */
export const ALL_PROFILE_NAMES: string[] = PROFILES_41.map(p => p.name);
