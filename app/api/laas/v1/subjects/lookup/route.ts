// =============================================================================
// /api/laas/v1/subjects/lookup — LaaS API v1
// -----------------------------------------------------------------------------
// Look up a subject by identifier (email today; external-ID and other
// identifiers planned for LQ Field). Returns a small subject summary the
// caller can use to decide whether to offer a "prep" action.
//
// The Chrome extension calls this for every attendee on a Google Calendar
// event when the user opens the LQ side panel: matched attendees get the
// prep button; unmatched are shown as "not in LQ".
//
// This endpoint does NOT generate a briefing — that's /api/laas/v1/prep.
// Lookup is read-only and intentionally fast; it's called N times per
// calendar event (once per attendee).
//
// Identifier sources today:
//   • ?email=... — case-insensitive lookup against EmployeeDoc.email
//
// Future identifier sources (LQ Field):
//   • ?externalSubjectId=...
//   • ?linkedinUrl=...
// =============================================================================

import { NextResponse } from "next/server";
import { getEmployeeByEmail } from "@/lib/data/employees-repo";
import { requirePermission } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/data/audit";
import { corsHeadersFor, preflight } from "@/lib/laas/cors";
import type {
  LaasSubjectResponse,
  LaasErrorResponse,
  LaasErrorCode,
} from "@/lib/laas/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIDENCE_DISPLAY_THRESHOLD = 60;

export const OPTIONS = preflight;

function ipFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

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

export async function GET(req: Request) {
  // --- Authorize ---------------------------------------------------------
  const authz = await requirePermission(req, "employees:read");
  if ("error" in authz) {
    const errBody = await authz.error.clone().json().catch(() => ({}));
    const reason = (errBody as { reason?: string }).reason || "";
    if (reason === "iap_required_but_missing") {
      return laasError(req, "unauthorized", "Authentication required.", 401);
    }
    return laasError(
      req,
      "forbidden",
      "You do not have permission to look up subjects.",
      403,
      { reason },
    );
  }
  const user = authz.user;
  const ip = ipFromRequest(req);

  // --- Parse identifier --------------------------------------------------
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") || "").trim();

  if (!email) {
    return laasError(
      req,
      "invalid_request",
      "Provide an identifier — currently supported: ?email=...",
      400,
    );
  }

  // --- Lookup ------------------------------------------------------------
  const employee = await getEmployeeByEmail(email);

  void logAuditEvent({
    actorId: user.userId,
    actorEmail: user.email,
    action: "read",
    targetCollection: "employees",
    targetDocId: employee?.id || "(none)",
    outcome: employee ? "success" : "error",
    metadata: {
      ip,
      api: "laas/v1/subjects/lookup",
      lookupBy: "email",
      hit: !!employee,
    },
  });

  if (!employee) {
    return laasError(
      req,
      "subject_not_found",
      "No subject matches the supplied identifier.",
      404,
      { email },
    );
  }

  const provenance = employee.source;
  const confidence = employee.confidence ?? (provenance === "machine_inferred" ? 0 : 100);
  const displaySafe = confidence >= CONFIDENCE_DISPLAY_THRESHOLD;

  const subject: LaasSubjectResponse & {
    /** Lightweight render fields — convenience for the extension UI. */
    display: { name: string; role: string; initials: string };
  } = {
    id: employee.id,
    type: "employee",
    provenance,
    confidence,
    displaySafe,
    display: {
      name: employee.name,
      role: employee.role,
      initials: employee.initials,
    },
  };

  return NextResponse.json(
    { subject, meta: { apiVersion: "v1" } },
    { headers: corsHeadersFor(req) },
  );
}
