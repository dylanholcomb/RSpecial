// =============================================================================
// LQ ENGINE — ARCHETYPE LOOKUPS
// -----------------------------------------------------------------------------
// As of v0.3 (post-2026-05-12 KB delivery), this file is a thin compatibility
// layer over the real 41-profile catalog in profiles-41.ts.
//
// The previous version (v0.2) shipped a stub table of ~7 named archetypes
// drawn from public LQ research. That stub has been retired; all lookups
// now go to the proprietary catalog. The Archetype shape is preserved so
// the UI's archetype-name display continues to work without changes.
// =============================================================================

import { findProfile, findProfileWithFallback } from "./profiles-41";
import type { Archetype, FullProfile } from "./types";

/**
 * Look up an archetype by ranked profile code. Returns null if unknown
 * (which should be very rare — the catalog covers 40 of the 64 possible
 * 3-habit orderings plus single-habit and dual-habit primaries plus The
 * Flexer).
 *
 * Behaviour: strict match on the full code. For progressive fallback,
 * use the FullProfile path via findProfileWithFallback().
 */
export function findArchetype(code: string): Archetype | null {
  const profile = findProfile(code);
  if (!profile) return null;
  return toArchetype(profile);
}

/** Derive the lightweight Archetype view from a FullProfile. */
export function toArchetype(profile: FullProfile): Archetype {
  // Build a one-line focus from the first sentence of the intro paragraph.
  const focus = firstSentence(profile.intro) ?? profile.intro.slice(0, 160);

  // Build risk + prep tip from key actionable insights when available;
  // otherwise fall back to clipped intro text.
  const risk = profile.insights.length > 0
    ? "Watch for: " + clip(profile.insights[0], 200)
    : "See full profile for risk patterns.";

  const prepTip = profile.insights.length > 1
    ? clip(profile.insights[1], 200)
    : "See full profile for preparation guidance.";

  return {
    code: profile.code,
    name: profile.name,
    focus,
    risk,
    prepTip,
  };
}

function firstSentence(text: string): string | null {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : null;
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

// Re-exports so consumers that imported from archetypes.ts keep working.
export { findProfile, findProfileWithFallback } from "./profiles-41";
