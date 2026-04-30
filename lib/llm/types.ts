// =============================================================================
// LLM PROVIDER — TYPES
// -----------------------------------------------------------------------------
// Provider abstraction so phase 1 can call Anthropic's API and phase 2 can
// flip to Azure OpenAI inside Mosaic's tenant without touching the engine,
// the prompt builder, or the UI.
// =============================================================================

import type { Briefing, EngineOutput, MeetingContext } from "@/lib/lq-engine";
import type { Employee } from "@/data/employees";

/** Inputs to the briefing generator — everything except scoring internals. */
export interface BriefingInputs {
  employee: Pick<Employee, "id" | "name" | "role" | "backstory" | "recentContext">;
  /** The structured engine output. The LLM is allowed to see this. */
  engine: EngineOutput;
  /** What the manager typed into the meeting form. */
  meetingContext: MeetingContext;
}

export interface LLMProvider {
  /** Human-readable name, surfaced in the UI for debugging. */
  name: "anthropic" | "azure-openai" | "demo-fallback";
  /** Whether this provider is currently available (e.g. has an API key). */
  available: boolean;
  /** Generate a briefing. */
  generate(inputs: BriefingInputs): Promise<Briefing>;
}
