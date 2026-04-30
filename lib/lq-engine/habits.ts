// =============================================================================
// LQ ENGINE — HABIT METADATA
// -----------------------------------------------------------------------------
// Static descriptions of the four ECHO listening habits, sourced from the
// publicly-documented LQ framework. This file is INSIDE the engine boundary —
// the LLM never sees the raw record, only specific framings selected by the
// recommender.
// =============================================================================

import type { HabitCode, HabitMeta } from "./types";

export const HABITS: Record<HabitCode, HabitMeta> = {
  CV: {
    code: "CV",
    name: "Connective",
    tagline: "Listens for people, relationships, and group impact.",
    orientation: "relational",
    primaryFocus: "People, relationships, trust, and collective impact.",
    strengths: [
      "Empathy and rapport-building",
      "Reading emotional subtext in a room",
      "Translating ideas into 'what this means for the team'",
    ],
    weaknesses: [
      "Can overlook hard facts or numbers",
      "Tends to accept information at face value from trusted sources",
      "May sacrifice accuracy to preserve harmony",
    ],
    receptionPreference:
      "Stories of human impact, relational context, collaborative language.",
    tuneOutTrigger:
      "Information delivered without a human component; cold or clinical framing.",
    frustration:
      "Decisions that ignore the interests of the people who will be affected.",
    tacticalPhrasing: [
      "Who else should be involved in this?",
      "How will this land for the team?",
      "Let's make sure everyone affected has had a say.",
    ],
    themeKey: "connective",
  },

  RV: {
    code: "RV",
    name: "Reflective",
    tagline: "Listens for personal relevance and historical context.",
    orientation: "relational",
    primaryFocus: "Personal relevance, historical context, and self-knowledge.",
    strengths: [
      "Connecting new information to deep personal experience",
      "Internal vetting before committing to a position",
      "Bringing useful precedent into the room",
    ],
    weaknesses: [
      "Can miss what's relevant for others",
      "Tendency to stay introspective rather than contribute",
      "May withhold expertise if rushed",
    ],
    receptionPreference:
      "Material that connects to their expertise; time and space to process silently.",
    tuneOutTrigger:
      "Topics that feel irrelevant to their goals or expertise; speakers who feel under-credentialed.",
    frustration:
      "Being probed for an answer too quickly; no room to think.",
    tacticalPhrasing: [
      "Take a day to think about how this fits your experience.",
      "I'd value your perspective once you've had time to sit with this.",
      "What have you seen work in situations like this before?",
    ],
    themeKey: "reflective",
  },

  AL: {
    code: "AL",
    name: "Analytical",
    tagline: "Listens for facts, logic, and provable accuracy.",
    orientation: "content",
    primaryFocus: "Issues, facts, data, and logic.",
    strengths: [
      "Discerning accuracy and credibility",
      "Critiquing information for sound decision-making",
      "Cutting through anecdote to the underlying claim",
    ],
    weaknesses: [
      "Can miss emotional subtext entirely",
      "Tends to discard subjective input as 'fluff'",
      "Shuts off when the logic chain breaks",
    ],
    receptionPreference:
      "Evidence-based results, detailed data, objective delivery, clear reasoning.",
    tuneOutTrigger:
      "Unsubstantiated opinions, hand-waving, lack of substance.",
    frustration:
      "Decisions made on feelings alone; being asked to ignore the data.",
    tacticalPhrasing: [
      "What evidence do we have for this result?",
      "Here is what the data shows…",
      "Let me walk you through the reasoning.",
    ],
    themeKey: "analytical",
  },

  CL: {
    code: "CL",
    name: "Conceptual",
    tagline: "Listens for patterns, possibilities, and the big picture.",
    orientation: "content",
    primaryFocus: "Ideas, concepts, possibilities, and the broad view.",
    strengths: [
      "Spotting patterns across disconnected information",
      "Generating new ideas and 'what if' scenarios",
      "Thinking forward to where this is heading",
    ],
    weaknesses: [
      "Can miss the granular details that make ideas executable",
      "Lower focus on present operations",
      "May lose interest before implementation",
    ],
    receptionPreference:
      "New ideas, 'what if' scenarios, visual models, pattern-based summaries.",
    tuneOutTrigger:
      "Rigid frameworks, excessive granular detail, repetitiveness.",
    frustration:
      "Being stuck in 'what is' rather than 'what could be'; slow implementation.",
    tacticalPhrasing: [
      "What patterns are we seeing that point to the future?",
      "If we zoom out, what's the bigger arc here?",
      "What would this look like three years from now?",
    ],
    themeKey: "conceptual",
  },
};

export const HABIT_CODES: HabitCode[] = ["CV", "RV", "AL", "CL"];

/** Display label used throughout the UI. */
export function habitLabel(code: HabitCode): string {
  return HABITS[code].name;
}
