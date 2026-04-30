// =============================================================================
// LLM RESPONSE SHAPE HELPERS
// -----------------------------------------------------------------------------
// Both providers return a JSON object matching the briefing schema. This
// file extracts and validates that JSON, and provides shared formatting
// helpers used by every provider.
// =============================================================================

import type { Briefing, EngineOutput } from "@/lib/lq-engine";

/** Briefing fields populated by the LLM (everything except identity + flags). */
export type BriefingShape = Pick<
  Briefing,
  | "sense"
  | "connect"
  | "adjust"
  | "navigate"
  | "pitfallsToAvoid"
  | "suggestedOpening"
  | "tailoredPhrases"
  | "questionsToAsk"
  | "whatToListenFor"
  | "closingMove"
>;

/** Strip markdown fences and pull the first {...} block out of a string. */
function extractJsonObject(raw: string): string {
  // Remove ```json ... ``` fences if present.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const trimmed = candidate.trim();

  // If the response is already a clean JSON object, return as-is.
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  // Otherwise, find the outermost { ... } pair.
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response did not contain a JSON object.");
  }
  return trimmed.slice(start, end + 1);
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string") {
    throw new Error(`Briefing field "${field}" was not a string.`);
  }
  return v;
}

function asStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v) || !v.every(x => typeof x === "string")) {
    throw new Error(`Briefing field "${field}" was not a string array.`);
  }
  return v as string[];
}

/** Parse raw LLM text output into the validated BriefingShape. */
export function briefingFromJson(raw: string): BriefingShape {
  const json = extractJsonObject(raw);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`LLM JSON parse failed: ${(e as Error).message}`);
  }

  return {
    sense: asString(parsed.sense, "sense"),
    connect: asString(parsed.connect, "connect"),
    adjust: asString(parsed.adjust, "adjust"),
    navigate: asString(parsed.navigate, "navigate"),
    pitfallsToAvoid: asStringArray(parsed.pitfallsToAvoid, "pitfallsToAvoid"),
    suggestedOpening: asString(parsed.suggestedOpening, "suggestedOpening"),
    tailoredPhrases: asStringArray(parsed.tailoredPhrases, "tailoredPhrases"),
    questionsToAsk: asStringArray(parsed.questionsToAsk, "questionsToAsk"),
    whatToListenFor: asStringArray(parsed.whatToListenFor, "whatToListenFor"),
    closingMove: asString(parsed.closingMove, "closingMove"),
  };
}

/** Render a hierarchy line for the briefing header. */
export function hierarchyDisplay(engine: EngineOutput): string {
  const dominant = engine.hierarchy.filter(h => h.role !== "shadow");
  const dominantNames = dominant.map(h => h.code).join(" → ");
  const shadow = engine.hierarchy.find(h => h.role === "shadow");
  return shadow
    ? `${dominantNames}  (shadow: ${shadow.code})`
    : dominantNames;
}
