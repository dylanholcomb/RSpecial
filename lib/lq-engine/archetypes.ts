// =============================================================================
// LQ ENGINE — KNOWN ARCHETYPES
// -----------------------------------------------------------------------------
// LQ publishes 41 unique listening profiles, several of which are named
// archetypes (Resolver, Mover, Implementer, Developer, Pragmatist, Producer,
// etc.). This file holds the archetypes we have public reference data for.
// When a profile code doesn't match a known archetype, the engine constructs
// a description from habit metadata instead.
//
// In phase 2 this table is replaced by Mosaic's full 41-profile catalogue.
// =============================================================================

import type { Archetype } from "./types";

export const ARCHETYPES: Record<string, Archetype> = {
  "CV-RV-AL": {
    code: "CV-RV-AL",
    name: "The Resolver",
    focus: "Detail-heavy people solutions.",
    risk: "Over-deliberation; the conversation gets stuck in nuance.",
    prepTip: "Set strict decision-making criteria early so the depth lands on a decision, not in a loop.",
  },

  "CV-RV-CL": {
    code: "CV-RV-CL",
    name: "The Mover",
    focus: "Action-oriented big ideas, anchored in people impact.",
    risk: "Overlooking critical facts in the rush to act.",
    prepTip: "Explicitly review 'what is true' before moving to action, and name the constraint set.",
  },

  "CV-AL": {
    code: "CV-AL",
    name: "The Implementer",
    focus: "Clear paths with factual backing.",
    risk: "Disengages if there's no clear next step.",
    prepTip: "Bring a roadmap. Be ready to name owners and timing as soon as you've made the case.",
  },

  "CV-AL-RV": {
    code: "CV-AL-RV",
    name: "The Developer",
    focus: "Balanced people-and-data approach.",
    risk: "Impatience with slow processes.",
    prepTip: "Lead with actionable expert solutions; show you've already weighed the data.",
  },

  "CL-RV-AL": {
    code: "CL-RV-AL",
    name: "The Pragmatist",
    focus: "Critical, open-minded ideas tested against personal experience.",
    risk: "Can feel 'drilled' by rapid questioning.",
    prepTip: "Provide information in advance for internal reflection. Don't ambush with decisions in the room.",
  },

  "AL-RV": {
    code: "AL-RV",
    name: "The Auditor",
    focus: "Content over speaker identity; rigorous vetting against personal expertise.",
    risk: "Misses feelings and rapport entirely.",
    prepTip: "Start with the 'what' and the 'how'. Skip the small talk — they read it as noise.",
  },

  "AL-RV-CV": {
    code: "AL-RV-CV",
    name: "The Producer",
    focus: "Data-led delivery, validated by experience, then translated into team impact.",
    risk: "Tunes out abstract or 'blue sky' thinking.",
    prepTip: "Lead with objective data, acknowledge their track record, close with team-morale upside.",
  },
};

/** Look up an archetype by ranked profile code. Returns null if unknown. */
export function findArchetype(code: string): Archetype | null {
  return ARCHETYPES[code] ?? null;
}
