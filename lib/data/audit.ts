// =============================================================================
// AUDIT LOG
// -----------------------------------------------------------------------------
// Append-only audit trail for tenant-scoped data access. Every read/write of
// employee or briefing data should call logAuditEvent() so we can answer the
// "who saw what, when" question — required for SOC 2 Type II readiness and
// for the 7-year retention commitment in the SOW.
//
// Retention model:
//   • Firestore keeps documents indefinitely (no TTL on the audit collection).
//   • A weekly Cloud Storage export gives us a cold archive that survives
//     accidental Firestore-side mutation. The export job is configured at
//     the project level, not in app code.
//
// This helper is BEST-EFFORT. If the audit write fails, we log the failure
// and let the request continue — never block a manager's briefing because
// the audit collection is having a bad minute. Failures show up in Cloud
// Logging with the prefix "[audit]" so they're searchable.
// =============================================================================

import { Timestamp } from "@google-cloud/firestore";
import { getFirestore, colls, SEED_ORG_ID } from "./firestore";
import type { AuditEventDoc } from "./types";

/** Fields the caller supplies. Everything else (id, timestamp, organizationId) is filled in. */
export interface AuditEventInput {
  actorId: string;
  actorEmail: string;
  action: AuditEventDoc["action"];
  targetCollection: string;
  targetDocId: string;
  outcome: AuditEventDoc["outcome"];
  metadata?: Record<string, unknown>;
  /** Optional org override; defaults to SEED_ORG_ID. */
  organizationId?: string;
}

/**
 * Write an audit event. Returns void — caller does not await the result for
 * correctness (failures don't propagate). Awaiting is fine if you want to
 * surface storage failures in tests.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const orgId = input.organizationId || SEED_ORG_ID;
  try {
    const db = getFirestore();
    const ref = db.collection(colls.audit(orgId)).doc();
    const event: AuditEventDoc = {
      id: ref.id,
      organizationId: orgId,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      timestamp: Timestamp.now(),
      action: input.action,
      targetCollection: input.targetCollection,
      targetDocId: input.targetDocId,
      outcome: input.outcome,
      metadata: input.metadata,
    };
    await ref.set(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Intentionally do not re-throw — audit failures must not break the
    // request. Surface to Cloud Logging for review.
    console.error("[audit] failed to write event:", message, {
      action: input.action,
      target: `${input.targetCollection}/${input.targetDocId}`,
      outcome: input.outcome,
    });
  }
}
