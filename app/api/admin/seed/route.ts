// =============================================================================
// /api/admin/seed
// -----------------------------------------------------------------------------
// One-shot migration that moves the bundled seed employees from
// data/employees.ts into Firestore documents.
//
// v0.2 — hardening (post-Phase 1 cutover):
//
//   • Guarded by SEED_SECRET as before. Caller must send "x-seed-secret"
//     header matching the env var. Without the secret, returns 401.
//
//   • DEFAULT BEHAVIOR IS NOW NON-DESTRUCTIVE. If the org document already
//     exists OR any employees are already present, the endpoint returns
//     409 Conflict with a `{ skipped: true, reason: ..., currentState: ... }`
//     body and writes NOTHING. This prevents accidental re-seed from
//     blowing away real data once we have live tenants.
//
//   • Explicit override via "x-seed-force: true" header. When set, the
//     endpoint behaves like the previous version — overwrites everything.
//     Use deliberately, e.g., for resetting a demo tenant.
//
//   • Every invocation (success, conflict, error, force-overwrite) writes
//     an AuditEventDoc to organizations/{orgId}/audit. The trail survives
//     even if someone forces an overwrite, so we can reconstruct what
//     happened.
//
// Idempotent: re-running without --force is a no-op. Re-running with
// --force performs deterministic overwrites (stable IDs).
// =============================================================================

import { NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore, colls, SEED_ORG_ID } from "@/lib/data/firestore";
import { logAuditEvent } from "@/lib/data/audit";
import { EMPLOYEES } from "@/data/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SeedSuccessBody {
  success: true;
  orgId: string;
  employeeCount: number;
  mode: "fresh" | "force_overwrite";
  timestamp: string;
}

interface SeedSkippedBody {
  success: false;
  skipped: true;
  reason: string;
  currentState: {
    orgExists: boolean;
    employeeCount: number;
  };
  hint: string;
}

export async function POST(req: Request) {
  const expected = process.env.SEED_SECRET || "";
  const provided = req.headers.get("x-seed-secret") || "";
  const force = req.headers.get("x-seed-force") === "true";
  const actorIp = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "unknown";

  if (!expected) {
    return NextResponse.json(
      { error: "SEED_SECRET env var not configured on the server" },
      { status: 500 },
    );
  }
  if (provided !== expected) {
    // Don't audit auth failures (they'd flood the collection with brute-force
    // attempts — better captured by Cloud Armor / WAF logs at the edge).
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 },
    );
  }

  try {
    const db = getFirestore();
    const now = Timestamp.now();

    // -----------------------------------------------------------------------
    // SAFETY CHECK: refuse to overwrite unless x-seed-force: true is set.
    // -----------------------------------------------------------------------
    const orgRef = db.doc(colls.org(SEED_ORG_ID));
    const orgSnap = await orgRef.get();
    const orgExists = orgSnap.exists;

    const employeesSnap = await db.collection(colls.employees(SEED_ORG_ID)).limit(1).get();
    const employeesAlreadyPresent = !employeesSnap.empty;

    if (!force && (orgExists || employeesAlreadyPresent)) {
      // Get an accurate count for the response — useful diagnostic.
      const fullSnap = await db.collection(colls.employees(SEED_ORG_ID)).get();

      await logAuditEvent({
        actorId: "seed-endpoint",
        actorEmail: "system",
        action: "write",
        targetCollection: "organizations",
        targetDocId: SEED_ORG_ID,
        outcome: "denied",
        metadata: {
          ip: actorIp,
          reason: "already_seeded_no_force",
          orgExists,
          employeeCount: fullSnap.size,
        },
      });

      const body: SeedSkippedBody = {
        success: false,
        skipped: true,
        reason: orgExists
          ? "Organization already exists. Refusing to overwrite without explicit force."
          : "Employees already exist. Refusing to overwrite without explicit force.",
        currentState: {
          orgExists,
          employeeCount: fullSnap.size,
        },
        hint: "If you really want to overwrite, re-run with header 'x-seed-force: true'.",
      };
      return NextResponse.json(body, { status: 409 });
    }

    const mode: SeedSuccessBody["mode"] = orgExists || employeesAlreadyPresent
      ? "force_overwrite"
      : "fresh";

    // -----------------------------------------------------------------------
    // 1. Write the organization document
    // -----------------------------------------------------------------------
    await orgRef.set({
      id: SEED_ORG_ID,
      name: "LQ Listening Intelligence",
      domain: "lq-listeningintelligence.com",
      settings: {
        primaryColor: "#185FA5",
        timezone: "America/Los_Angeles",
      },
      createdAt: now,
      updatedAt: now,
    });

    // -----------------------------------------------------------------------
    // 2. Write each seeded employee as a Firestore document
    //
    // Derive a stable demo email from the employee id (e.g., "devon-park"
    // → "devon.park@lq-listeningintelligence.com"). This gives the Chrome
    // extension smart-fallback identity match real values to look up
    // against, without requiring an edit to the bundled seed data file.
    // Real customer data will supply its own emails.
    // -----------------------------------------------------------------------
    let employeeCount = 0;
    for (const emp of EMPLOYEES) {
      const empAny = emp as unknown as { email?: string };
      const derivedEmail = `${emp.id.replace(/-/g, ".")}@lq-listeningintelligence.com`.toLowerCase();
      const email = (empAny.email || derivedEmail).toLowerCase();

      await db.doc(`${colls.employees(SEED_ORG_ID)}/${emp.id}`).set({
        id: emp.id,
        organizationId: SEED_ORG_ID,
        name: emp.name,
        role: emp.role,
        initials: emp.initials,
        backstory: emp.backstory,
        recentContext: emp.recentContext,
        scores: emp.scores,
        assessmentDate: emp.assessmentDate,
        source: "manual_echo",
        email,
        createdAt: now,
        updatedAt: now,
      });
      employeeCount++;
    }

    await logAuditEvent({
      actorId: "seed-endpoint",
      actorEmail: "system",
      action: "write",
      targetCollection: "organizations",
      targetDocId: SEED_ORG_ID,
      outcome: "success",
      metadata: {
        ip: actorIp,
        mode,
        employeeCount,
      },
    });

    const body: SeedSuccessBody = {
      success: true,
      orgId: SEED_ORG_ID,
      employeeCount,
      mode,
      timestamp: now.toDate().toISOString(),
    };
    return NextResponse.json(body);
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("[seed] FAILED:", e.message);
    console.error("[seed] STACK:", e.stack);

    void logAuditEvent({
      actorId: "seed-endpoint",
      actorEmail: "system",
      action: "write",
      targetCollection: "organizations",
      targetDocId: SEED_ORG_ID,
      outcome: "error",
      metadata: {
        ip: actorIp,
        error: e.message,
        errorType: e.constructor?.name || "Error",
      },
    });

    return NextResponse.json(
      {
        error: "seed failed",
        message: e.message || "no message",
        type: e.constructor?.name || "Error",
      },
      { status: 500 },
    );
  }
}
