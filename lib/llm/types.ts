// =============================================================================
// LLM PROVIDER — TYPES
// -----------------------------------------------------------------------------
// Provider abstraction so the application can run against multiple LLM
// backends without code changes anywhere else. The factory in provider.ts
// chooses one based on environment configuration.
//
// Production target on GCP: vertex-gemini (Vertex AI Gemini under the
// enterprise no-training contract).
// =============================================================================

import type { Briefing, EngineOutput, FullProfile, MeetingContext } from "@/lib/lq-engine";
import type { Employee } from "@/data/employees";

/** Inputs to the briefing generator — everything except scoring internals. */
export interface BriefingInputs {
  employee: Pick<Employee, "id" | "name" | "role" | "backstory" | "recentContext">;
  /** The structured engine output. The LLM is allowed to see this. */
  engine: EngineOutput;
  /** What the manager typed into the meeting form. */
  meetingContext: MeetingContext;
  /**
   * The MANAGER's own listening profile, when known. Powers the pairwise
   * SCAN framing — Sense prompts ground in the manager's own habits and
   * blind spots, and Adjust prompts use the manager-with-subject pairwise
   * content from the catalog. Absent when the manager hasn't set their
   * profile (Phase 1 picker) or when the request comes from a context that
   * doesn't know the user yet (e.g., unauthenticated partner calls).
   */
  managerProfile?: FullProfile;
}

export interface LLMProvider {
  /** Human-readable name, surfaced in the UI for debugging. */
  name: "anthropic" | "azure-openai" | "vertex-gemini" | "demo-fallback";
  /** Whether this provider is currently available (e.g. has an API key). */
  available: boolean;
  /** Generate a briefing. */
  generate(inputs: BriefingInputs): Promise<Briefing>;
}
