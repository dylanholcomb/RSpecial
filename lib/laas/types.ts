// =============================================================================
// LaaS API — v1 TYPES
// -----------------------------------------------------------------------------
// Versioned, partner-facing contract for the Listening-as-a-Service API.
//
// Consumers (today and planned):
//   • The LQ Platform web app's MeetingPrepClient
//   • The LQ Chrome extension (Calendar prep button, in-meeting overlay)
//   • ADP integration (Phase 2)
//   • Other future partners
//
// Versioning rule: never break v1 once a partner is consuming it. Add v2 if
// the contract has to change incompatibly. New fields on responses are fine
// (additive); rename or restructure is not.
//
// Design principles for v1:
//   1. Subject identity is a first-class object — type discriminator + ID.
//      Today only "employee" subjects exist; "external" arrives with LQ Field.
//   2. Confidence + provenance are first-class on every response. Today
//      employee-sourced briefings always carry confidence=100, but the field
//      is present so clients render it uniformly across both product lines.
//   3. Private context lives under its own `private` key so the API spec
//      itself signals to consumers "this is not persisted on our side."
//   4. Errors are structured with a stable code + human message + optional
//      details. Codes never change once shipped.
// =============================================================================

import type { Briefing } from "@/lib/lq-engine";
import type { ProfileProvenance } from "@/lib/data/types";

// -----------------------------------------------------------------------------
// REQUEST
// -----------------------------------------------------------------------------

/** Subject of the briefing — who the manager is meeting with. */
export type LaasSubjectRequest =
  | { type: "employee"; employeeId: string }
  /**
   * Ad-hoc subject. Used when the manager wants to prep for someone who
   * hasn't taken ECHO and isn't in the roster — e.g., "I have a client
   * meeting tomorrow and based on past conversations I think they're
   * Analytical + Conceptual." The manager asserts the profile directly
   * by supplying a catalog code.
   *
   * Per Allison feedback #8 (2026-05-22): the SME explicitly asked for this
   * "give me prescriptive advice without an actual profile result" path.
   * Confidence on the response is 100 (manager-asserted) but provenance is
   * "partner_supplied" to distinguish from ECHO-assessed employees.
   */
  | {
      type: "adhoc";
      /** Display name, e.g. "Riley Chen". */
      name: string;
      /** Optional role / title, e.g. "VP Engineering at AcmeCorp". */
      role?: string;
      /** Catalog profile code, e.g. "AL-CL" (The Designer) or "CL" (The Idea-Generator). */
      profileCode: string;
      /** Optional backstory the manager wants to share with the LLM. */
      backstory?: string;
      /** Optional seeded "recent context" — separate from per-meeting additions. */
      recentContext?: string;
    }
  // Reserved for LQ Field (Phase 3). External subjects haven't taken ECHO;
  // their profile is inferred from observed behavior.
  | { type: "external"; externalSubjectId: string };

/** Meeting context — purpose + the manager's typed-in notes. */
export interface LaasMeetingContext {
  /**
   * One of the five allowed purposes:
   *   "1:1 check-in" | "feedback" | "coaching" | "planning" | "difficult conversation"
   */
  purpose: string;
  topOfMind?: string;
  desiredOutcome?: string;
  /**
   * Optional dated updates the manager wants this briefing to factor in for
   * this conversation only. Never persisted; audit-flagged via a boolean.
   * Free text — the manager is encouraged to include dates inline.
   */
  recentContextAdditions?: string;
}

/**
 * The MANAGER's own listening profile, used to personalize Sense (self-check)
 * and Adjust (modulation) prompts.
 *
 * Phase 1 (today): the web app surfaces a small "Your listening profile"
 * picker that persists in localStorage and is sent on every prep request.
 * Sources are advisory only — `source: "manual_echo"` is the only realistic
 * value at this stage.
 *
 * Phase 2+ (post-IAP): when an authenticated user has a `profile` populated
 * on their UserDoc, the prep route will use that and ignore any value sent in
 * the request body. The field stays in the schema so the Chrome extension
 * and partner integrations can override when they have richer context.
 */
export interface LaasManagerProfile {
  /**
   * Catalog code, e.g. "CL-RV-AL", "CV", or "FLEXER". The prep route looks
   * this up against the 41-profile catalog; unknown codes are silently
   * ignored (briefing falls back to generic Sense/Adjust framing).
   */
  code: string;
}

/**
 * Private content the manager wants to inform this briefing only. Never
 * persisted; audit-flagged via a boolean only. The shape lives under its
 * own key as a design signal to consumers.
 */
export interface LaasPrivateContext {
  context?: string;
}

/** Full request body for POST /api/laas/v1/prep. */
export interface LaasPrepRequest {
  subject: LaasSubjectRequest;
  meeting: LaasMeetingContext;
  /**
   * Optional. The manager's own listening profile, used to personalize the
   * SCAN framing. When absent, Sense/Adjust prompts use generic language.
   */
  manager?: LaasManagerProfile;
  private?: LaasPrivateContext;
}

// -----------------------------------------------------------------------------
// RESPONSE
// -----------------------------------------------------------------------------

/** Subject metadata returned with every briefing — for client-side rendering. */
export interface LaasSubjectResponse {
  /** Identifier the client originally supplied, echoed back. For adhoc, the supplied name. */
  id: string;
  type: LaasSubjectRequest["type"];
  /** How the subject's profile was obtained. */
  provenance: ProfileProvenance;
  /** 0–100. 100 for assessed; lower for inferred (LQ Field). 100 for adhoc (manager-asserted). */
  confidence: number;
  /**
   * Whether the profile is confident enough to display to the user. False
   * for inferred profiles below the 60% threshold (LQ Field policy). True
   * for all assessed and ad-hoc profiles.
   */
  displaySafe: boolean;
}

/** Provider + execution metadata for the briefing generation. */
export interface LaasGeneratedMeta {
  by: string;                          // e.g. "vertex-gemini" | "anthropic" | "demo-fallback"
  mode: "live" | "demo-fallback";
  at: string;                          // ISO 8601 UTC
  elapsedMs: number;
}

/** API-level metadata — what the response says about itself. */
export interface LaasResponseMeta {
  apiVersion: "v1";
  /** True if the original request included non-empty private context. Flag only. */
  privateContextUsed: boolean;
}

/** Full response body for POST /api/laas/v1/prep on success. */
export interface LaasPrepResponse {
  briefing: Briefing;
  subject: LaasSubjectResponse;
  generated: LaasGeneratedMeta;
  meta: LaasResponseMeta;
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

/**
 * Stable error codes. Once published, NEVER change the meaning of a code —
 * add a new code if the semantic differs. Strings, not enums, for cross-
 * language stability.
 */
export type LaasErrorCode =
  | "invalid_request"          // malformed JSON or missing required fields
  | "invalid_purpose"          // purpose not in the allowed list
  | "invalid_subject"          // subject.type unknown or fields missing
  | "subject_not_found"        // employeeId / externalSubjectId not in database
  | "subject_below_confidence" // LQ Field: inferred profile is below the 60% display threshold
  | "unauthorized"             // no auth identity (IAP off, no JWT)
  | "forbidden"                // auth identity lacks required permission
  | "rate_limited"             // future use
  | "internal_error";          // catch-all for unexpected failures

export interface LaasErrorResponse {
  error: LaasErrorCode;
  message: string;
  /** Optional structured detail — e.g., { confidence: 42, threshold: 60 } for subject_below_confidence. */
  details?: Record<string, unknown>;
}
