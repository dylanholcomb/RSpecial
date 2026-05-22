// =============================================================================
// /api/laas/v1/prep — LaaS API v1
// -----------------------------------------------------------------------------
// Generate a briefing for a manager preparing to meet with a subject.
//
// This is the versioned, partner-facing API surface. The web app's
// MeetingPrepClient calls it. The Chrome extension will call it. ADP and
// other partners will call it. The contract here is the one we promise to
// maintain — never break v1.
//
// Same engine, same prompt builder, same persistence + audit hooks as the
// (now-deprecated) /api/briefing route. The differences live entirely at
// the request/response boundary:
//   • Subject is a discriminated union (employee | external) — LQ Field-ready
//   • Confidence + provenance returned on every response
//   • Private context lives under its own `private` key
//   • Errors are structured with stable codes
// =============================================================================

import { NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import {
  analyzeProfile,
  findProfile,
  synthesizeScoresForProfile,
  type Briefing,
  type FullProfile,
  type HabitScores,
  type MeetingContext,
  type MeetingPurpose,
} from "@/lib/lq-engine";
import { getEmployeeById, type Employee } from "@/lib/data/employees-repo";
import type { ProfileProvenance } from "@/lib/data/types";
import { getFirestore, colls, SEED_ORG_ID } from "@/lib/data/firestore";
import { logAuditEvent } from "@/lib/data/audit";
import { getProvider } from "@/lib/llm/provider";
import { requirePermission, type AuthorizedUser } from "@/lib/auth/middleware";
import { corsHeadersFor, preflight } from "@/lib/laas/cors";
import type { BriefingDoc } from "@/lib/data/types";
import type {
  LaasPrepRequest,
  LaasPrepResponse,
  LaasErrorResponse,
  LaasErrorCode,
} from "@/lib/laas/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS preflight — the Chrome extension calls this endpoint from a
// chrome-extension:// origin, so the browser sends an OPTIONS first.
export const OPTIONS = preflight;

// LQ Field confidence policy (locked May 16, 2026).
// Defined here as constants so they're referenceable in tests and visible
// at the API boundary. See PROJECT-FACTS.md for the policy rationale.
const CONFIDENCE_DISPLAY_THRESHOLD = 60;

const ALLOWED_PURPOSES: MeetingPurpose[] = [
  "1:1 check-in",
  "feedback",
  "coaching",
  "planning",
  "difficult conversation",
];

function laasError(
  req: Request,
  code: LaasErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): NextResponse {
  const body: LaasErrorResponse = { error: code, message, ...(details ? { details } : {}) };
  return NextResponse.json(body, { status, headers: corsHeadersFor(req) });
}

function ipFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

function actorOf(user: AuthorizedUser, ip: string) {
  return { actorId: user.userId, actorEmail: user.email, ip };
}

function asString(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/** Slugify an ad-hoc subject name into a stable id for audit/logging. */
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "subject";
}

export async function POST(req: Request) {
  const requestStartedAt = Date.now();

  // --- Authorize -------------------------------------------------------------
  const authz = await requirePermission(req, "briefings:write");
  if ("error" in authz) {
    // Translate the middleware's generic response into LaaS error shape.
    const errBody = await authz.error.clone().json().catch(() => ({}));
    const reason = (errBody as { reason?: string }).reason || "";
    if (reason === "iap_required_but_missing") {
      return laasError(req, "unauthorized", "Authentication required.", 401);
    }
    return laasError(
      req,
      "forbidden",
      "You do not have permission to generate briefings.",
      403,
      { reason },
    );
  }
  const user = authz.user;
  const ip = ipFromRequest(req);
  const actor = actorOf(user, ip);

  // --- Parse + validate ------------------------------------------------------
  let body: LaasPrepRequest;
  try {
    body = (await req.json()) as LaasPrepRequest;
  } catch {
    return laasError(req, "invalid_request", "Request body must be valid JSON.", 400);
  }

  // Subject validation. `employee` and `adhoc` are supported today; `external`
  // is accepted by the type system but rejected here until LQ Field ships.
  if (!body.subject || typeof body.subject !== "object") {
    return laasError(req, "invalid_subject", "Missing 'subject' object.", 400);
  }
  if (body.subject.type === "external") {
    return laasError(
      req,
      "invalid_subject",
      "External subjects are not yet supported. LQ Field arrives in Phase 3.",
      400,
      { received: body.subject.type },
    );
  }
  if (body.subject.type !== "employee" && body.subject.type !== "adhoc") {
    return laasError(
      req,
      "invalid_subject",
      "subject.type must be 'employee' or 'adhoc' (or 'external' once LQ Field is live).",
      400,
    );
  }

  // Meeting validation.
  if (!body.meeting || typeof body.meeting !== "object") {
    return laasError(req, "invalid_request", "Missing 'meeting' object.", 400);
  }
  const purpose = asString(body.meeting.purpose, 100) as MeetingPurpose;
  if (!ALLOWED_PURPOSES.includes(purpose)) {
    return laasError(
      req,
      "invalid_purpose",
      `Purpose must be one of: ${ALLOWED_PURPOSES.join(", ")}.`,
      400,
      { received: purpose },
    );
  }
  const topOfMind = asString(body.meeting.topOfMind, 1000);
  const desiredOutcome = asString(body.meeting.desiredOutcome, 1000);

  // Private context — sensitive. Never persisted. Audit-flagged only.
  const privateContextRaw = asString(body.private?.context, 2000);
  const privateContext = privateContextRaw.trim() ? privateContextRaw : undefined;
  const privateContextUsed = privateContext !== undefined;

  // Recent context additions — manager's dated notes for this conversation.
  // Same persistence promise as privateContext: stripped before write, audit
  // flagged via boolean only.
  const recentContextAdditionsRaw = asString(body.meeting.recentContextAdditions, 2000);
  const recentContextAdditions = recentContextAdditionsRaw.trim()
    ? recentContextAdditionsRaw
    : undefined;
  const recentContextAdditionsUsed = recentContextAdditions !== undefined;

  // Manager profile — Phase 1 sourcing path is the request body. Once IAP
  // is on we'll prefer the user's UserDoc.profile and treat the body field
  // as an override. Unknown codes are silently ignored (briefing falls back
  // to generic Sense/Adjust framing).
  const managerProfileCode = asString(body.manager?.code, 32);
  let managerProfile: FullProfile | undefined = undefined;
  if (managerProfileCode) {
    const found = findProfile(managerProfileCode);
    if (found) managerProfile = found;
  }
  const managerProfileUsed = managerProfile !== undefined;

  // --- Subject resolution ----------------------------------------------------
  // Branch on subject.type. Both branches end with: `employee` (the in-memory
  // subject), `subjectProvenance`, `subjectConfidence`, `subjectDisplaySafe`,
  // and `subjectIdForResponse`.
  let employee: Pick<Employee, "id" | "name" | "role" | "backstory" | "recentContext" | "scores">;
  let subjectProvenance: ProfileProvenance;
  let subjectConfidence: number;
  let subjectIdForResponse: string;
  let adhocProfileCode: string | undefined;

  if (body.subject.type === "adhoc") {
    const adhocName = asString(body.subject.name, 200).trim();
    const adhocProfileCodeRaw = asString(body.subject.profileCode, 32).trim();
    if (!adhocName) {
      return laasError(req, "invalid_subject", "subject.name is required for ad-hoc subjects.", 400);
    }
    if (!adhocProfileCodeRaw) {
      return laasError(req, "invalid_subject", "subject.profileCode is required for ad-hoc subjects.", 400);
    }
    const adhocProfile = findProfile(adhocProfileCodeRaw);
    if (!adhocProfile) {
      return laasError(
        req,
        "invalid_subject",
        "subject.profileCode does not match any entry in the 41-profile catalog.",
        400,
        { received: adhocProfileCodeRaw },
      );
    }
    const adhocRole = asString(body.subject.role, 200).trim() || "External subject";
    const adhocBackstory = asString(body.subject.backstory, 1000).trim()
      || `${adhocName} is an ad-hoc subject — no ECHO profile on file. The manager has asserted this profile based on prior conversations and observation.`;
    const adhocRecentContext = asString(body.subject.recentContext, 1000).trim()
      || "(no seeded recent context — see additions below if provided.)";

    employee = {
      id: `adhoc:${slugify(adhocName)}`,
      name: adhocName,
      role: adhocRole,
      backstory: adhocBackstory,
      recentContext: adhocRecentContext,
      scores: synthesizeScoresForProfile(adhocProfile),
    };
    subjectProvenance = "partner_supplied";
    subjectConfidence = 100;
    subjectIdForResponse = employee.id;
    adhocProfileCode = adhocProfile.code;

    void logAuditEvent({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: "read",
      targetCollection: "adhoc_subjects",
      targetDocId: employee.id,
      outcome: "success",
      metadata: {
        ip: actor.ip,
        api: "laas/v1/prep",
        adhocProfileCode,
        adhocProfileName: adhocProfile.name,
      },
    });
  } else {
    // type === "employee"
    const employeeId = asString(body.subject.employeeId, 200);
    if (!employeeId) {
      return laasError(
        req,
        "invalid_subject",
        "subject.employeeId is required when subject.type is 'employee'.",
        400,
      );
    }
    const found = await getEmployeeById(employeeId);
    if (!found) {
      void logAuditEvent({
        actorId: actor.actorId,
        actorEmail: actor.actorEmail,
        action: "read",
        targetCollection: "employees",
        targetDocId: employeeId,
        outcome: "error",
        metadata: { reason: "not_found", ip: actor.ip, api: "laas/v1/prep" },
      });
      return laasError(
        req,
        "subject_not_found",
        "No subject found for the provided employeeId.",
        404,
        { employeeId },
      );
    }
    employee = found;
    subjectProvenance = found.source;
    subjectConfidence = found.confidence ?? (subjectProvenance === "machine_inferred" ? 0 : 100);
    subjectIdForResponse = found.id;
  }

  const subjectDisplaySafe = subjectConfidence >= CONFIDENCE_DISPLAY_THRESHOLD;

  if (!subjectDisplaySafe) {
    return laasError(
      req,
      "subject_below_confidence",
      "Subject's inferred profile is below the confidence threshold for display.",
      422,
      {
        confidence: subjectConfidence,
        threshold: CONFIDENCE_DISPLAY_THRESHOLD,
      },
    );
  }

  void logAuditEvent({
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
    action: "read",
    targetCollection: body.subject.type === "adhoc" ? "adhoc_subjects" : "employees",
    targetDocId: employee.id,
    outcome: "success",
    metadata: {
      ip: actor.ip,
      purpose,
      subjectType: body.subject.type,
      adhocProfileCode,
      privateContextUsed,
      recentContextAdditionsUsed,
      managerProfileUsed,
      managerProfileCode: managerProfile?.code,
      api: "laas/v1/prep",
    },
  });

  const meetingContext: MeetingContext = {
    purpose,
    topOfMind,
    desiredOutcome,
    recentContextAdditions,
    privateContext,
  };

  // --- Run engine + generate briefing ---------------------------------------
  const engineOutput = analyzeProfile(employee.id, employee.scores);
  const provider = getProvider();

  let briefing: Briefing;
  let providerName: string;
  let generatedBy: BriefingDoc["generatedBy"] = "live";
  let providerError: string | undefined;

  try {
    briefing = await provider.generate({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        backstory: employee.backstory,
        recentContext: employee.recentContext,
      },
      engine: engineOutput,
      meetingContext,
      managerProfile,
    });
    providerName = provider.name;
  } catch (err) {
    providerError = err instanceof Error ? err.message : "Unknown LLM error";
    console.error("[laas/prep] live provider failed, falling back:", providerError);

    const { createDemoFallbackProvider } = await import("@/lib/llm/demo-fallback");
    const fallback = createDemoFallbackProvider();
    briefing = await fallback.generate({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        backstory: employee.backstory,
        recentContext: employee.recentContext,
      },
      engine: engineOutput,
      meetingContext,
    });
    providerName = "demo-fallback";
    generatedBy = "demo-fallback";
  }

  const generatedAt = new Date();
  const elapsedMs = Date.now() - requestStartedAt;

  // --- Persist briefing + audit (best-effort, never blocks response) --------
  // Ad-hoc briefings are NOT persisted as BriefingDocs: they're transient by
  // design (no canonical subject record to link to, no recurring HR-style
  // value in keeping them). Audit row records that the briefing happened.
  if (body.subject.type === "employee") {
    void persistBriefing({
      employee,
      meetingContext: stripPrivateContext(meetingContext),
      privateContextUsed,
      briefing,
      generatedBy,
      providerName,
      actor,
    });
  }

  // --- Respond ---------------------------------------------------------------
  const response: LaasPrepResponse = {
    briefing,
    subject: {
      id: subjectIdForResponse,
      type: body.subject.type,
      provenance: subjectProvenance,
      confidence: subjectConfidence,
      displaySafe: subjectDisplaySafe,
    },
    generated: {
      by: providerName,
      mode: generatedBy,
      at: generatedAt.toISOString(),
      elapsedMs,
    },
    meta: {
      apiVersion: "v1",
      privateContextUsed,
    },
  };

  return NextResponse.json(response, { headers: corsHeadersFor(req) });
}

// =============================================================================
// PRIVATE HELPERS
// =============================================================================

interface PersistArgs {
  employee: { id: string; name: string };
  meetingContext: MeetingContext;
  privateContextUsed: boolean;
  briefing: Briefing;
  generatedBy: BriefingDoc["generatedBy"];
  providerName: string;
  actor: { actorId: string; actorEmail: string; ip: string };
}

function stripPrivateContext(mc: MeetingContext): MeetingContext {
  return {
    purpose: mc.purpose,
    topOfMind: mc.topOfMind,
    desiredOutcome: mc.desiredOutcome,
    // privateContext AND recentContextAdditions are intentionally omitted.
    // Both carry manager-supplied content the platform promises NOT to
    // persist. DO NOT add either field back here.
  };
}

async function persistBriefing(args: PersistArgs): Promise<void> {
  const {
    employee,
    meetingContext,
    privateContextUsed,
    briefing,
    generatedBy,
    providerName,
    actor,
  } = args;
  try {
    const db = getFirestore();
    const ref = db.collection(colls.briefings(SEED_ORG_ID)).doc();
    const doc: BriefingDoc = {
      id: ref.id,
      organizationId: SEED_ORG_ID,
      employeeId: employee.id,
      meetingContext,
      briefing: briefing as unknown as Record<string, unknown>,
      generatedBy,
      providerName,
      generatedAt: Timestamp.now(),
    };
    await ref.set(doc);

    await logAuditEvent({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: "write",
      targetCollection: "briefings",
      targetDocId: ref.id,
      outcome: "success",
      metadata: {
        ip: actor.ip,
        employeeId: employee.id,
        purpose: meetingContext.purpose,
        generatedBy,
        providerName,
        privateContextUsed,
        api: "laas/v1/prep",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[laas/prep] persistence failed:", message);
    void logAuditEvent({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: "write",
      targetCollection: "briefings",
      targetDocId: "unknown",
      outcome: "error",
      metadata: {
        ip: actor.ip,
        employeeId: employee.id,
        purpose: meetingContext.purpose,
        error: message,
        privateContextUsed,
        api: "laas/v1/prep",
      },
    });
  }
}
