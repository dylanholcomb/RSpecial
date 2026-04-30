// =============================================================================
// LQ ENGINE — CONFLICT PATTERNS
// -----------------------------------------------------------------------------
// LQ documents specific conflict pairings that show up between habits. The
// engine surfaces a relevant subset based on the *manager's* habit (assumed
// from session, defaultable) and the subject's habit, so the briefing can
// pre-warn the manager about the friction shape they're walking into.
// =============================================================================

import type { HabitCode } from "./types";

interface ConflictPattern {
  pair: [HabitCode, HabitCode];
  description: string;
}

export const CONFLICT_PATTERNS: ConflictPattern[] = [
  {
    pair: ["AL", "CV"],
    description:
      "The Analytical filter focuses on data accuracy and can miss the emotional landmines in the room. The Connective listener may read this as coldness and quietly soften the facts to preserve harmony — which then frustrates the Analytical side, who feels logic is being abandoned.",
  },
  {
    pair: ["RV", "CL"],
    description:
      "The Reflective filter draws on what has worked before; the Conceptual filter wants to discard old frameworks for what could be. Reflective listeners may withhold their expertise if they feel things are moving too fast and there's no space for deliberation.",
  },
  {
    pair: ["AL", "CL"],
    description:
      "The Analytical filter wants what's provably true now; the Conceptual filter wants to explore what's possible later. Analytical reads Conceptual as unsubstantiated; Conceptual reads Analytical as stuck in the present.",
  },
  {
    pair: ["CV", "RV"],
    description:
      "Both relational, but pointed differently. Connective wants to bring others into the conversation; Reflective wants quiet to process internally. Connective can feel shut out; Reflective can feel pushed.",
  },
];

/** Return conflict patterns relevant to a given habit (either side of the pair). */
export function conflictPatternsFor(habit: HabitCode): ConflictPattern[] {
  return CONFLICT_PATTERNS.filter(p => p.pair.includes(habit));
}
