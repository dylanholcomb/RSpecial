// =============================================================================
// /api/admin/users/seed
// -----------------------------------------------------------------------------
// Idempotent endpoint for provisioning UserDoc records ahead of IAP turn-on.
//
// Why pre-seed: when IAP is enabled and a user logs in for the first time,
// the middleware looks up their UserDoc by external ID, then falls back to
// looking up by email. Pre-seeding by email lets us assign roles to people
// before they've ever hit the app — the moment they log in, the middleware
// auto-binds their email-seeded record to the IAP external ID and they're
// in.
//
// Guarded by SEED_SECRET (same gate as /api/admin/seed for employees).
//
// Request body:
//   {
//     "users": [
//       { "email": "dylan@mosaic-data.com", "displayName": "Dylan Holcomb", "role": "org_admin" },
//       { "email": "katie@lq-listeningintelligence.com", "displayName": "Katie McCleary", "role": "org_admin" },
//       ...
//     ]
//   }
//
// Response: { success, created, updated, skipped, errors }
//
// All writes are audited (collection: "users", action: "write").
// =============================================================================

import { NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore, colls, SEED_ORG_ID } from "@/lib/data/firestore";
import { logAuditEvent } from "@/lib/data/audit";
import type { UserDoc, UserRole } from "@/lib/data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ROLES: UserRole[] = ["manager", "hr_admin", "org_admin", "auditor"];

interface SeedUserInput {
  email?: unknown;
  displayName?: unknown;
  role?: unknown;
  externalId?: unknown;
}

function asString(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function POST(req: Request) {
  const expected = process.env.SEED_SECRET || "";
  const provided = req.headers.get("x-seed-secret") || "";
  const actorIp = (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() || "unknown";

  if (!expected) {
    return NextResponse.json(
      { error: "SEED_SECRET env var not configured on the server" },
      { status: 500 },
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { users?: SeedUserInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inputs = Array.isArray(body.users) ? body.users : [];
  if (inputs.length === 0) {
    return NextResponse.json(
      { error: "Body must include a non-empty 'users' array" },
      { status: 400 },
    );
  }

  const db = getFirestore();
  const created: string[] = [];
  const updated: string[] = [];
  const errors: Array<{ email: string; reason: string }> = [];

  for (const input of inputs) {
    const email = asString(input.email, 200).toLowerCase().trim();
    const displayName = asString(input.displayName, 200).trim();
    const role = asString(input.role, 50) as UserRole;
    const externalId = asString(input.externalId, 200).trim();

    if (!email || !displayName) {
      errors.push({ email: email || "(missing)", reason: "email and displayName required" });
      continue;
    }
    if (!VALID_ROLES.includes(role)) {
      errors.push({ email, reason: `invalid role "${role}" — must be one of ${VALID_ROLES.join(", ")}` });
      continue;
    }

    // Doc ID strategy: prefer externalId if provided (binds to a known IAP
    // identity). Otherwise, use a deterministic email-keyed slug so the
    // record is stable across re-runs and findable by email.
    const docId = externalId || `email:${email}`;
    const ref = db.doc(`${colls.users(SEED_ORG_ID)}/${docId}`);
    const now = Timestamp.now();
    const existing = await ref.get();

    const doc: UserDoc = {
      id: docId,
      organizationId: SEED_ORG_ID,
      email,
      displayName,
      role,
      createdAt: existing.exists ? (existing.data() as UserDoc).createdAt : now,
      updatedAt: now,
    };

    await ref.set(doc, { merge: true });
    (existing.exists ? updated : created).push(email);

    void logAuditEvent({
      actorId: "user-seed-endpoint",
      actorEmail: "system",
      action: "write",
      targetCollection: "users",
      targetDocId: docId,
      outcome: "success",
      metadata: {
        ip: actorIp,
        email,
        role,
        mode: existing.exists ? "update" : "create",
      },
    });
  }

  return NextResponse.json({
    success: true,
    orgId: SEED_ORG_ID,
    created: created.length,
    updated: updated.length,
    errors,
    timestamp: new Date().toISOString(),
  });
}
