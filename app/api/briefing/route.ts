// =============================================================================
// /api/briefing — DEPRECATED COMPATIBILITY SHIM
// -----------------------------------------------------------------------------
// This route used to host the briefing generation logic directly. As of
// May 16, 2026, the logic lives at /api/laas/v1/prep — the versioned,
// partner-facing LaaS API surface.
//
// This file remains as a thin shim that:
//   1. Translates the legacy request shape to the LaaS v1 request shape.
//   2. Forwards to the v1 endpoint via direct handler call (no HTTP round trip).
//   3. Translates the v1 response back to the legacy response shape clients
//      were consuming.
//   4. Emits a Deprecation + Sunset header (RFC 8594) so any future external
//      consumer sees they should migrate.
//
// Sunset date: 2026-08-01. Delete this file once all known consumers have
// migrated. As of today the only known consumer is the LQ Platform web app
// itself, which is being moved off this route in the same change.
// =============================================================================

import { NextResponse } from "next/server";
import { POST as laasPrep } from "@/app/api/laas/v1/prep/route";
import type { LaasPrepRequest, LaasPrepResponse, LaasErrorResponse } from "@/lib/laas/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sunset target — kept here as a single source of truth, surfaced in the
// response header and in startup logs (if we ever add a startup log).
const SUNSET_DATE_RFC1123 = "Sat, 01 Aug 2026 00:00:00 GMT";

interface LegacyBriefingRequest {
  employeeId?: unknown;
  purpose?: unknown;
  topOfMind?: unknown;
  desiredOutcome?: unknown;
  privateContext?: unknown;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  let legacy: LegacyBriefingRequest;
  try {
    legacy = (await req.json()) as LegacyBriefingRequest;
  } catch {
    return withDeprecationHeaders(
      NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    );
  }

  // Translate legacy → LaaS v1 request shape.
  const v1Body: LaasPrepRequest = {
    subject: {
      type: "employee",
      employeeId: asString(legacy.employeeId),
    },
    meeting: {
      purpose: asString(legacy.purpose),
      topOfMind: asString(legacy.topOfMind),
      desiredOutcome: asString(legacy.desiredOutcome),
    },
    private: {
      context: asString(legacy.privateContext),
    },
  };

  // Construct a forwarded Request — same headers (auth, IP, etc.), v1 body.
  // We re-use the original request's headers so auth/audit/IP carry through.
  const forwarded = new Request(new URL("/api/laas/v1/prep", req.url), {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(v1Body),
  });

  const v1Response = await laasPrep(forwarded);

  // If the v1 endpoint returned an error, translate the error shape back to
  // the legacy { error: string } shape so existing clients don't break.
  if (!v1Response.ok) {
    const errBody = (await v1Response.clone().json().catch(() => ({}))) as Partial<LaasErrorResponse>;
    return withDeprecationHeaders(
      NextResponse.json(
        { error: errBody.message || errBody.error || "Failed to generate briefing" },
        { status: v1Response.status },
      ),
    );
  }

  const v1Body2 = (await v1Response.json()) as LaasPrepResponse;
  return withDeprecationHeaders(
    NextResponse.json({
      briefing: v1Body2.briefing,
      provider: v1Body2.generated.by,
      ...(v1Body2.generated.mode === "demo-fallback"
        ? { providerError: "live provider unavailable, served via demo fallback" }
        : {}),
    }),
  );
}

/**
 * Attach RFC 8594 Deprecation + Sunset headers plus a Link header pointing
 * to the successor route. External tools (Postman, browser devtools, log
 * aggregators) surface these prominently.
 */
function withDeprecationHeaders(res: NextResponse): NextResponse {
  res.headers.set("Deprecation", "true");
  res.headers.set("Sunset", SUNSET_DATE_RFC1123);
  res.headers.set(
    "Link",
    `</api/laas/v1/prep>; rel="successor-version"; type="application/json"`,
  );
  return res;
}
