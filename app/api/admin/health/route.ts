// =============================================================================
// /api/admin/health
// -----------------------------------------------------------------------------
// Read-only diagnostic endpoint. Hits Firestore from the running Cloud Run
// service to verify end-to-end connectivity and document presence after the
// seed migration. Returns the seed organization's metadata plus a count of
// employee documents under it.
//
// Useful for: confirming Firestore is reachable, confirming the seed ran,
// and as a Cloud Run health probe target.
// =============================================================================

import { NextResponse } from "next/server";
import { getFirestore, colls, SEED_ORG_ID } from "@/lib/data/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getFirestore();

    const orgSnap = await db.doc(colls.org(SEED_ORG_ID)).get();
    if (!orgSnap.exists) {
      return NextResponse.json({
        ok: false,
        firestoreReachable: true,
        orgFound: false,
        message: "Seed organization document does not exist. Run /api/admin/seed first.",
      });
    }

    const employeesSnap = await db.collection(colls.employees(SEED_ORG_ID)).get();

    return NextResponse.json({
      ok: true,
      firestoreReachable: true,
      orgFound: true,
      orgId: SEED_ORG_ID,
      orgName: orgSnap.get("name"),
      employeeCount: employeesSnap.size,
      sampleEmployeeIds: employeesSnap.docs.slice(0, 5).map(d => d.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      {
        ok: false,
        firestoreReachable: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
