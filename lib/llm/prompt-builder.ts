// =============================================================================
// PROMPT BUILDER — v0.6 (post-PDF-ingest + dominance fix, 2026-05-22)
// -----------------------------------------------------------------------------
// Updates in v0.6 (Allison's second SME pass + the canonical PDF):
//
//   • Dominance-aware language. Single / dual / triple / non_dominant each
//     get distinct framing. Triple is "habits in interplay that mute each
//     other's fullest expression," NOT "balancing two lanes" — the prior
//     dual-only language was misapplied to 24 triple-dominant profiles.
//   • Canonical Strengths and Possible Challenges blocks are now passed in
//     verbatim from the PDF, alongside the third-person Short Description.
//   • Shadow framing is two-sided: missed content AND tune-out / impatience
//     trigger when the conversation lives in the shadow lane.
//   • All copy in the catalog is canonical PDF text — no synthesized prose.
//
// Carryover from v0.4 / v0.5 (Allison's first SME pass):
//
//   1. SCAN is a wheel, not a waterfall. Navigate sits at the center; the
//      others orbit it. We can't visualize a wheel inside a JSON briefing,
//      but the language must not imply a linear sequence.
//
//   2. SENSE is about the manager (the listener), not the subject. It is
//      self-awareness: what's important to me right now, what assumptions
//      am I making, what habits am I relying on, am I present?
//
//   3. CONNECT is about anticipating the subject — what's at stake for them,
//      what's important to them, what might be influencing their listening.
//
//   4. ADJUST is about the manager adjusting themselves — their attention,
//      intention, emotional state, the listening habits they're consciously
//      choosing in this moment.
//
//   5. NAVIGATE is about open inquiry, diversity of perspective, and the
//      humility to be shifted by what the other person brings. It is NOT
//      "cover all four habits including the shadow."
//
//   6. The shadow habit should NOT be surfaced reflexively. The default
//      should be to communicate in the subject's preferred lane. Only
//      "difficult conversation" purpose may benefit from explicit shadow-
//      surfacing, and even then with care.
//
//   7. Tools for listening matter as much as tools for speaking. The
//      whatToListenFor section should be substantive and prominent, not
//      a trailing afterthought.
//
//   8. The profile is a starting point for skill development, not a label.
//      The briefing should not reinforce the idea that someone "is" their
//      listening profile in any fixed sense.
//
// Audience assumption: managers using this tool have taken ECHO themselves
// and received some LQ training (familiar with SCAN, the four habits, etc.).
// We support people without that background through embedded coaching micro-
// copy in the UI, not by re-teaching the model in every briefing.
// =============================================================================

import type { BriefingInputs } from "./types";
import type { FullProfile, HabitMeta } from "@/lib/lq-engine";

export const SYSTEM_PROMPT = `You are a senior leadership coach trained in the Listening Intelligence (LQ™) framework. You understand the ECHO® Listening Profile assessment, the SCAN methodology, and the four listening habits (Connective, Reflective, Analytical, Conceptual). You speak the way a coach speaks to a practitioner who has done the training and is now refining the skill in real meetings.

Important framings you must respect:

— The subject's ECHO profile is a starting point for skill development, not a fixed label. A profile name like "The Inventor" is a quick descriptor of how someone is showing up in their listening, not who they are. Avoid language that pigeonholes.

— The SCAN model is a wheel, not a sequence. Sense, Connect, Adjust, and Navigate are practiced in real time, returning to each other throughout a conversation. Your output describes prep for entering the conversation, not a script to march through.

— Sense is self-awareness: it is about the MANAGER (the user reading this briefing), not the subject. Specifically, the manager checking in with themselves before and during the conversation — their assumptions, their mindset, the habits they are relying on, whether they are present.

— Connect is about the subject. What's at stake for this person? What's important to them right now? What might be influencing their listening today?

— Adjust is about the manager again — adjusting their own attention, intention, emotional state, and the listening habits they're consciously choosing in the moment.

— Navigate is about open inquiry — using open-ended questions to invite deeper thought, harness diversity of perspective, and remain genuinely open to having one's own view shifted.

— Communicate to the subject in their preferred listening lane. Do not engage their lowest-preference habit (their "shadow") unless the meeting purpose is "difficult conversation" and engaging it is necessary for the work. Speak the way that makes the message easiest for them to receive. The shadow lane is also where this person is most likely to tune out, lose patience, or get frustrated — when topics live there, the manager should be deliberate.

— Dominance type matters. Profiles fall into four shapes: single-dominant (one habit drives), dual-dominant (two habits in balance — and yes, can stall when forced to choose), triple-dominant (three habits in interplay; each tempers the fullest expression of the others — do NOT say "they balance two lanes" or frame it as "either/or"), or non-dominant (The Flexer, cycling through all four with no fixed preference). The subject material below names the dominance type — let it shape your language.

— Tools for listening matter as much as tools for speaking. The manager needs to know what to listen for — verbal cues, nonverbal cues, what is not said, what signals deeper processing versus shutting down. Treat "what to listen for" as prime real estate, not a trailing afterthought.

— The manager will read this on their phone, often in the five minutes before the meeting starts. Be specific, concise, immediately actionable. Address the manager in second person ("you"). No hedging, no filler, no preamble.

You will receive: (1) a structured profile entry from the proprietary LQ 41-profile catalog describing how this subject is currently showing up in their listening; (2) the four "working with each listening type" sub-sections from the catalog; (3) habit-level reference material; (4) the manager's typed meeting context including the purpose. Use this material to ground every recommendation. Do not invent ECHO terminology beyond what is provided.

Output format: a single JSON object — no prose before or after, no markdown fences. The object must conform exactly to this schema:

{
  "sense": string,            // 2-3 sentences. Self-check prompts for the manager. What should the manager be noticing about their own mindset, assumptions, habits, presence before this conversation? Universal in nature (apply to any meeting) but tightened by the specific context.
  "connect": string,          // 2-3 sentences. Anticipate what's at stake for the subject and what's likely influencing their listening today. Draw on the catalog content.
  "adjust": string,           // 2-3 sentences. How the manager should consciously adjust themselves — their attention, intention, the listening habits they are choosing in this moment — to land well with this subject.
  "navigate": string,         // 2-3 sentences. Open-ended inquiry moves the manager can use to invite the subject's deeper thinking, and a reminder to remain open to being shifted by what comes back.
  "pitfallsToAvoid": string[], // 4-6 specific things NOT to do or say. Default to advice that respects the subject's preferred listening lane. Surface shadow-lane pitfalls only when meeting purpose is "difficult conversation".
  "suggestedOpening": string, // One sentence the manager could literally use as their first line. Should respect the subject's preferred listening habit.
  "tailoredPhrases": string[], // 4-6 phrases that land well with this profile. Speak in their preferred lane.
  "questionsToAsk": string[],  // 4-6 open-ended questions designed to invite this person's best contribution.
  "whatToListenFor": string[], // 5-7 specific listening cues. Mix of verbal (what they emphasize, the language they choose, what they ask), nonverbal (pacing, pauses, energy shifts, body language hints), and absence-signals (what they don't say, where silence falls). This is the most important section.
  "closingMove": string       // One sentence describing how to close so the subject leaves feeling heard, with a clear sense of what comes next.
}`;

function habitBlock(label: string, h: HabitMeta | null): string {
  if (!h) return `${label}: none.`;
  return `${label}: ${h.name} (${h.code})
  - Primary focus: ${h.primaryFocus}
  - Strengths: ${h.strengths.join("; ")}
  - Weaknesses: ${h.weaknesses.join("; ")}
  - Reception preference: ${h.receptionPreference}
  - Tune-out trigger: ${h.tuneOutTrigger}
  - Frustration: ${h.frustration}
  - Phrases that land: ${h.tacticalPhrasing.join(" / ")}`;
}

function dominanceFraming(profile: FullProfile): string {
  switch (profile.dominanceType) {
    case "single":
      return `Dominance: single — ${profile.habitChain[0]} drives. The other three habits are present but secondary. Use language that reflects a clear primary lane.`;
    case "dual":
      return `Dominance: dual — ${profile.habitChain.join(" + ")} in balance. Use the "balances two lanes / can stall when forced to choose" framing — this is the one profile shape where that language is correct. Do NOT use it for any other dominance type.`;
    case "triple":
      return `Dominance: triple — ${profile.habitChain.join(" + ")} in interplay. Critical framing: when three habits combine in one profile, each habit MUTES the fullest expression of the others. Do NOT describe this as "either/or," "popcorn between two," or "balancing two lanes." Use language like "interplay," "tempering," "muted expression," "no single habit dominates." The shadow is the one habit NOT in the chain — that's where they're most likely to miss content AND lose patience.`;
    case "non_dominant":
      return `Dominance: non-dominant (The Flexer) — all four habits cycle. There is NO shadow lane for The Flexer; do not surface "shadow" guidance. They can tune out from sheer volume of information rather than from any one underweighted lane.`;
  }
}

function fullProfileBlock(profile: FullProfile): string {
  const insights = profile.insights.map((s, i) => `  ${i + 1}. ${s}`).join("\n");

  const interactionBlock = (label: string, code: keyof typeof profile.interactions) => {
    const i = profile.interactions[code];
    return `## Working with ${label} listeners
At your best: ${i.atBest}
Possible challenges: ${i.challenges}
Suggestions: ${i.suggestions}`;
  };

  return `# Proprietary LQ Profile (catalog entry — starting point, not a label)

Profile: ${profile.name}  (${profile.code})
Habit chain: ${profile.habitChain.join(", ") || "balanced / no single dominant"}
${dominanceFraming(profile)}

Short description (canonical, third person): ${profile.shortDescription}

Overall pattern (canonical, second person — for context, not for the briefing):
${profile.intro}

Strengths (canonical from LQ):
${profile.strengths}

Possible challenges (canonical from LQ — this is the authoritative source for how the subject can struggle, including in their shadow lane):
${profile.possibleChallenges}

Actionable insights from LQ for someone with this profile:
${insights}

${interactionBlock("Connective", "CV")}

${interactionBlock("Reflective", "RV")}

${interactionBlock("Analytical", "AL")}

${interactionBlock("Conceptual", "CL")}`;
}

/**
 * Render a private-context block when the manager supplied one. The block
 * frames the content for Gemini with three guardrails:
 *
 *   1. Treat as sensitive. The manager would not write this in a system of
 *      record; do not write it back in the briefing output literally.
 *   2. Use it to shape guidance subtly, not to be quoted. If the context
 *      describes a family stressor, recommend gentler pacing — do not write
 *      "they're going through a fertility struggle" in the briefing.
 *   3. Respect dates. The manager is asked to include rough timing in their
 *      notes; let recency inform how acute the situation likely is.
 *
 * If no private context is supplied, render an empty string.
 */
function privateContextBlock(privateContext: string | undefined): string {
  if (!privateContext || !privateContext.trim()) return "";
  return `
# Private Context for This Conversation (sensitive — manager-provided)

The manager has shared private context they would not put in an HR system. It is sent to you to inform this briefing only, and is never persisted on our side after this request returns. Treat the content with care:

  • Let the context shape your guidance — pacing, openings, what to listen for, what to avoid — in subtle, respectful ways.
  • Do NOT quote or paraphrase the sensitive specifics back in the briefing. The subject will never read this briefing, but the manager will, and they wrote it knowing you would handle it discreetly. The briefing should feel informed by this context without naming it.
  • Pay attention to any dates or timeframes the manager included; recency matters.

Private context (verbatim):
"""
${privateContext}
"""
`;
}

/**
 * Per-purpose guidance baked into the user prompt. Different meeting types
 * call for different SCAN emphases and different shadow-surfacing posture.
 */
function purposeGuidance(purpose: string): string {
  switch (purpose) {
    case "1:1 check-in":
      return `This is a regular check-in. Stay primarily in the subject's preferred listening lane. Sense prompts should help the manager arrive present and curious; this is a relationship-maintaining conversation. Do not push the subject into shadow territory.`;

    case "feedback":
      return `This is a feedback conversation. Speak in the subject's preferred lane so the feedback can actually be received. Sense prompts should help the manager check their assumptions about the situation. Do not surface shadow-habit pitfalls unless the feedback itself is about a pattern that touches the shadow lane.`;

    case "coaching":
      return `This is a coaching conversation, oriented to the subject's development. Connect deeply to what matters to them and what they're trying to grow into. Stay in their preferred lane for the message; the conversation IS the skill-building, not a corrective exercise. Lean into Navigate — open-ended inquiry that helps them see their own pattern.`;

    case "planning":
      return `This is a planning conversation. Lean into Navigate — diversity of perspective and open-ended questions help produce better plans. Speak in the subject's preferred lane. Sense prompts should help the manager separate their own pre-formed plan from what they're genuinely open to revising.`;

    case "difficult conversation":
      return `This is a difficult conversation. Here, deliberately raising shadow-lane considerations may be appropriate — for example, if the subject has been missing the people-impact angle, naming that explicitly helps. But do this with care: communicate the difficult content in the subject's preferred lane so it can be received, AND raise the shadow-lane consideration as something the subject might consider, not as an indictment. Sense prompts should help the manager check their own emotional state before entering.`;

    default:
      return `Stay primarily in the subject's preferred listening lane. Communicate in the way that makes the message easiest for them to receive.`;
  }
}

/**
 * Build the MANAGER-side block. When the manager has shared their own
 * listening profile, the prompt-builder pulls the catalog's pairwise
 * content for "manager.profile working with subject.primaryHabit" so the
 * LLM can ground Sense (self-check) and Adjust (modulation) in the
 * specific dynamics at play.
 *
 * Per Allison SME guidance: SCAN is BOTH parties. Sense uses the manager's
 * own profile (their assumptions, blind spots, default habits). Connect
 * uses the subject's. Adjust uses both. Navigate is universal.
 *
 * When the manager profile is absent (Phase 1 picker not set, or partner
 * call without it), this block tells the LLM to use generic Sense/Adjust
 * framing rather than fabricating manager content.
 */
function managerProfileBlock(
  managerProfile: FullProfile | undefined,
  subjectPrimaryHabit: HabitMeta,
): string {
  if (!managerProfile) {
    return `# Manager (you, the reader)

The manager has not shared their own ECHO listening profile for this briefing. Use generic Sense and Adjust framing — speak to universally useful self-checks (presence, assumptions, intention) rather than habit-specific ones. Do NOT invent a manager profile.`;
  }

  const pairwise = managerProfile.interactions[subjectPrimaryHabit.code];

  return `# Manager (you, the reader)

The manager has shared their own listening profile. Use this material to ground SENSE (their self-check) and ADJUST (how they modulate themselves to meet the subject). Do not surface this to the subject — it is the manager's own mirror.

Manager profile: ${managerProfile.name} (${managerProfile.code})
Dominance: ${managerProfile.dominanceType}

Short description (manager, third person): ${managerProfile.shortDescription}

Manager's strengths (from LQ):
${managerProfile.strengths}

Manager's possible challenges (from LQ — these are the BLIND SPOTS the manager should self-check for in Sense):
${managerProfile.possibleChallenges}

## Pairwise content — how a ${managerProfile.name} works with a ${subjectPrimaryHabit.name} listener (which is this subject's primary)
At their best: ${pairwise.atBest}
Possible challenges: ${pairwise.challenges}
Suggestions: ${pairwise.suggestions}

Use the pairwise "Possible challenges" to anchor Sense — what is the manager likely to do wrong with this specific subject? Use the pairwise "Suggestions" to anchor Adjust — what specific moves should the manager make? Use the manager's own "Possible challenges" to remind them of the broader patterns they bring into the room.`;
}

export function buildUserPrompt(inputs: BriefingInputs): string {
  const { employee, engine, meetingContext, managerProfile } = inputs;

  const hierarchyLine = engine.hierarchy
    .map(h => `${h.role}: ${h.code}`)
    .join(", ");

  const profileSection = engine.profile
    ? fullProfileBlock(engine.profile)
    : "# Proprietary LQ Profile\n(No exact match in the 41-profile catalog. Use the habit-level reference material below instead. Be honest that the profile-match is approximate.)";

  const recentAdditionsBlock = meetingContext.recentContextAdditions?.trim()
    ? `

Recent context additions (added by the manager TODAY for this conversation only; never persisted):
"""
${meetingContext.recentContextAdditions.trim()}
"""

When this block is present, treat it as the most recent and most relevant signal about the subject. The manager has been encouraged to include dates — let recency weight your guidance. The seeded "Recent context" above is older; these additions are now.`
    : "";

  return `# Subject

Name: ${employee.name}
Role: ${employee.role}
Backstory: ${employee.backstory}
Recent context (from the subject's record): ${employee.recentContext}${recentAdditionsBlock}

Reminder: this profile is how the subject is currently showing up in their listening. It is a starting point for skill development, not a fixed label. The briefing you write should respect that framing.

# LQ Engine Output

Hierarchy: ${hierarchyLine}
Dominance type: ${engine.dominanceType}

${profileSection}

${managerProfileBlock(managerProfile, engine.primaryHabit)}

# Habit Reference Material

${habitBlock("Primary habit", engine.primaryHabit)}

${habitBlock("Secondary habit", engine.secondaryHabit)}

${habitBlock("Tertiary habit", engine.tertiaryHabit)}

${habitBlock("Shadow habit (under-used — do NOT surface to subject unless meeting purpose specifically calls for it)", engine.shadowHabit)}

# Engine framings

- Snapshot: ${engine.framings.snapshot}
- Reception guide: ${engine.framings.receptionGuide}

# Meeting Context (from the manager)

Purpose: ${meetingContext.purpose}
Top of mind: ${meetingContext.topOfMind || "(not specified)"}
Desired outcome: ${meetingContext.desiredOutcome || "(not specified)"}

# Purpose-specific guidance

${purposeGuidance(meetingContext.purpose)}

# Task

Generate the briefing JSON object for the manager preparing to enter this conversation. Respect every framing in the system prompt. Make whatToListenFor the most substantive section — it is the prime real estate. Speak to the subject in their preferred lane; communicate in the way that lets them receive the message. The manager will read this in the five minutes before walking into the meeting; every line should be immediately actionable.`;
}
