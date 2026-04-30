// =============================================================================
// LLM PROVIDER — DEMO FALLBACK
// -----------------------------------------------------------------------------
// Templated briefing generator that runs without any API key. It produces
// genuinely useful output by composing the rich engine output and meeting
// context into the briefing schema. Less nuanced than a real LLM but
// always available and grounded in the same LQ framework.
//
// The UI surfaces a small "Demo mode" badge on briefings produced here.
// =============================================================================

import type { Briefing } from "@/lib/lq-engine";
import type { BriefingInputs, LLMProvider } from "./types";
import { hierarchyDisplay } from "./shape";

export function createDemoFallbackProvider(): LLMProvider {
  return {
    name: "demo-fallback",
    available: true,
    async generate(inputs: BriefingInputs): Promise<Briefing> {
      return generateBriefingTemplated(inputs);
    },
  };
}

/** Strip trailing punctuation so an interpolated phrase reads cleanly mid-sentence. */
function clean(s: string): string {
  return s.trim().replace(/[.;,!?]+$/, "");
}

/** Lowercase the first character of a string. */
function lc(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** Pick "a" vs "an" for a following word. */
function article(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

function generateBriefingTemplated(inputs: BriefingInputs): Briefing {
  const { employee, engine, meetingContext } = inputs;
  const primary = engine.primaryHabit;
  const secondary = engine.secondaryHabit;
  const shadow = engine.shadowHabit;
  const purposeKey = meetingContext.purpose;
  const firstName = employee.name.split(" ")[0];

  const archetypeIntro = engine.archetype
    ? `${firstName} listens like ${engine.archetype.name} — ${lc(clean(engine.archetype.focus))}.`
    : `${firstName}'s primary listening filter is ${primary.name}.`;

  const sense =
    `${archetypeIntro} ${primary.name} listeners filter for ${lc(clean(primary.primaryFocus))}` +
    (secondary
      ? `, with ${article(secondary.name)} ${secondary.name.toLowerCase()} layer that adds ${lc(clean(secondary.primaryFocus))}.`
      : ".");

  const connect =
    `Open by validating their ${primary.name.toLowerCase()} filter — acknowledge ${lc(clean(primary.primaryFocus))} ` +
    `before getting to your agenda.` +
    (secondary
      ? ` Then nod to their ${secondary.name.toLowerCase()} side: ${lc(clean(secondary.receptionPreference))}.`
      : "");

  const adjust =
    `Match your delivery to how they receive: ${lc(clean(primary.receptionPreference))}. ` +
    `Avoid what makes them tune out — ${lc(clean(primary.tuneOutTrigger))}.`;

  const navigate =
    `Cover all four habits during the conversation, but make a deliberate move into their shadow lane. ` +
    `Their under-used filter is ${shadow.name} — ${lc(clean(shadow.primaryFocus))}. ` +
    `If you don't surface it explicitly, they will likely discount it.`;

  // Pitfalls — combine primary tune-outs with shadow blind spots.
  const pitfallsToAvoid: string[] = [
    `Do not lead with ${lc(clean(primary.tuneOutTrigger))}.`,
    `Avoid ${lc(clean(primary.frustration))}.`,
    `Don't assume they have already factored in ${lc(clean(shadow.primaryFocus))} — they likely haven't.`,
  ];
  if (secondary) {
    pitfallsToAvoid.push(
      `Don't override their ${secondary.name.toLowerCase()} input — ${lc(clean(secondary.frustration))}.`,
    );
  }
  if (purposeKey === "difficult conversation") {
    pitfallsToAvoid.push(
      `Don't soften the message to the point that it stops being clear — they'll leave unsure what you actually said.`,
    );
  }

  const suggestedOpening = openingByPurpose(purposeKey, primary.name, firstName);

  // Tailored phrases — pull directly from the habit metadata.
  const tailoredPhrases: string[] = [
    ...primary.tacticalPhrasing.slice(0, 2),
    ...(secondary?.tacticalPhrasing.slice(0, 2) ?? []),
  ];
  // Add a phrase that explicitly invites the shadow habit.
  tailoredPhrases.push(shadow.tacticalPhrasing[0]);

  // Questions to ask — pulled from primary + secondary, plus a shadow-prompt.
  const questionsToAsk: string[] = [
    `What's most on your mind heading into this conversation?`,
    primary.tacticalPhrasing[primary.tacticalPhrasing.length - 1],
  ];
  if (secondary) {
    questionsToAsk.push(secondary.tacticalPhrasing[secondary.tacticalPhrasing.length - 1]);
  }
  questionsToAsk.push(
    `Just so we don't miss it — ${shadowQuestionFor(shadow.code)}`,
  );
  if (meetingContext.desiredOutcome) {
    questionsToAsk.push(
      `What would have to be true for you to feel good about ${lc(clean(meetingContext.desiredOutcome))}?`,
    );
  }

  // What to listen for — adapt to primary + shadow signals.
  const whatToListenFor: string[] = [
    `${primary.name} signal: when they engage, expect them to bring up ${lc(clean(primary.primaryFocus))}.`,
    `Disengagement signal: if you've drifted into ${lc(clean(primary.tuneOutTrigger))}, watch for them to go quiet or change subject.`,
    `Shadow signal: if you raise ${lc(clean(shadow.primaryFocus))} and they reframe it back into ${primary.name.toLowerCase()} terms, that's the filter doing its job — surface it again.`,
  ];
  if (secondary) {
    whatToListenFor.push(
      `${secondary.name} signal: ${lc(clean(secondary.primaryFocus))} coming up unprompted means they're processing — give them space.`,
    );
  }

  const closingMove =
    `Close by recapping what you committed to in their language — ` +
    `${primary.name.toLowerCase()} terms — and confirm the one thing they want from you next.`;

  return {
    subjectName: employee.name,
    subjectRole: employee.role,
    archetypeName: engine.archetype?.name ?? null,
    hierarchyDisplay: hierarchyDisplay(engine),
    sense,
    connect,
    adjust,
    navigate,
    pitfallsToAvoid,
    suggestedOpening,
    tailoredPhrases,
    questionsToAsk,
    whatToListenFor,
    closingMove,
    generatedBy: "demo-fallback",
  };
}

function openingByPurpose(
  purpose: string,
  primaryHabitName: string,
  firstName: string,
): string {
  switch (purpose) {
    case "feedback":
      return `${firstName}, I want to share some specific feedback today, and I want to do it in a way that lands well for you — what's the most useful place to start?`;
    case "coaching":
      return `${firstName}, I've been thinking about where you could grow next. Before I share my read, what's your own sense of it?`;
    case "planning":
      return `${firstName}, I want to plan the next few weeks together. Where would you start?`;
    case "difficult conversation":
      return `${firstName}, there's something I want to bring into the open with you today. I want to get it right — can I share what I'm seeing first, and then hear your take?`;
    case "1:1 check-in":
    default:
      return `${firstName}, before I share what's on my list — what's most on your mind right now?`;
  }
}

function shadowQuestionFor(code: string): string {
  switch (code) {
    case "AL":
      return `what does the data look like on this?`;
    case "CL":
      return `where do you think this is heading three steps from now?`;
    case "CV":
      return `who else does this affect, and how are they likely to land?`;
    case "RV":
      return `does any of this connect to something you've seen play out before?`;
    default:
      return `what are we missing?`;
  }
}
