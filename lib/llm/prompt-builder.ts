// =============================================================================
// PROMPT BUILDER
// -----------------------------------------------------------------------------
// Turns BriefingInputs into the system + user prompt sent to the LLM.
//
// IP boundary note: this file ONLY references engine OUTPUT (the framings,
// archetype, habit metadata). It never imports or references engine
// internals (scoring rules, raw scores, or the IP that will live in
// Mosaic's KB in phase 2).
// =============================================================================

import type { BriefingInputs } from "./types";

export const SYSTEM_PROMPT = `You are a senior leadership coach trained in the Listening Intelligence (LQ) framework, specifically the ECHO Listening Profile model with its four habits — Connective (CV), Reflective (RV), Analytical (AL), and Conceptual (CL) — and the SCAN methodology (Sense, Connect, Adjust, Navigate).

Your job is to prepare a manager for a 1:1 conversation with one of their direct reports. The manager will read this on their phone, often in the five minutes before the meeting starts. Be specific, concise, and immediately actionable.

You will receive structured framings produced by the LQ engine. You may quote or paraphrase them. Do NOT invent additional ECHO terminology beyond what is provided. Do NOT speculate about scoring; treat the engine output as ground truth.

Output format: a single JSON object — no prose before or after, no markdown fences. The object must conform exactly to this schema:

{
  "sense": string,            // 1–2 sentences. Name the listening pattern in plain language.
  "connect": string,          // 2–3 sentences. How to validate this person's listening filter at the start.
  "adjust": string,           // 2–3 sentences. How the manager should adjust their delivery to land.
  "navigate": string,         // 2–3 sentences. How to cover all four habits during the meeting, especially the shadow.
  "pitfallsToAvoid": string[], // 3–5 specific things NOT to do or say in this meeting.
  "suggestedOpening": string, // One sentence the manager could literally use as their first line.
  "tailoredPhrases": string[], // 4–6 specific phrases or sentence stems that will land well with this person.
  "questionsToAsk": string[],  // 3–5 questions designed to invite this person's best contribution.
  "whatToListenFor": string[], // 3–5 verbal or nonverbal cues that would tell the manager their message is landing or losing them.
  "closingMove": string       // One sentence describing how to close the meeting so this person leaves feeling heard.
}

Tone: direct, warm, professional. Address the manager in second person ("you"). No hedging, no filler, no preamble.`;

export function buildUserPrompt(inputs: BriefingInputs): string {
  const { employee, engine, meetingContext } = inputs;

  const hierarchyLine = engine.hierarchy
    .map(h => `${h.role}: ${h.code}`)
    .join(", ");

  const archetypeBlock = engine.archetype
    ? `Archetype: ${engine.archetype.name}\n  - Focus: ${engine.archetype.focus}\n  - Risk: ${engine.archetype.risk}\n  - Prep tip: ${engine.archetype.prepTip}`
    : "Archetype: none published for this exact combination.";

  const habitBlock = (
    label: string,
    h: typeof engine.primaryHabit | null,
  ): string => {
    if (!h) return `${label}: none.`;
    return `${label}: ${h.name} (${h.code})
  - Primary focus: ${h.primaryFocus}
  - Strengths: ${h.strengths.join("; ")}
  - Weaknesses: ${h.weaknesses.join("; ")}
  - Reception preference: ${h.receptionPreference}
  - Tune-out trigger: ${h.tuneOutTrigger}
  - Frustration: ${h.frustration}
  - Phrases that land: ${h.tacticalPhrasing.join(" / ")}`;
  };

  return `# Subject

Name: ${employee.name}
Role: ${employee.role}
Backstory: ${employee.backstory}
Recent context: ${employee.recentContext}

# LQ Engine Output

Hierarchy: ${hierarchyLine}
Dual-dominant: ${engine.dualDominant ? "yes" : "no"}
${archetypeBlock}

${habitBlock("Primary habit", engine.primaryHabit)}

${habitBlock("Secondary habit", engine.secondaryHabit)}

${habitBlock("Tertiary habit", engine.tertiaryHabit)}

${habitBlock("Shadow habit", engine.shadowHabit)}

Engine framings:
- Snapshot: ${engine.framings.snapshot}
- Reception guide: ${engine.framings.receptionGuide}
- Shadow warning: ${engine.framings.shadowWarning}
${engine.framings.conflictRisks.length > 0
    ? `- Likely conflict shapes:\n  - ${engine.framings.conflictRisks.join("\n  - ")}`
    : ""}

# Meeting Context (from the manager)

Purpose: ${meetingContext.purpose}
Top of mind: ${meetingContext.topOfMind || "(not specified)"}
Desired outcome: ${meetingContext.desiredOutcome || "(not specified)"}

# Task

Generate the briefing JSON object for this manager, for this person, for this meeting.`;
}
