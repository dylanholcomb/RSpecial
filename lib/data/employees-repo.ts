// =============================================================================
// EMPLOYEES REPOSITORY
// -----------------------------------------------------------------------------
// Firestore-backed read path for employee records. Replaces the synchronous
// in-memory lookups previously exported from data/employees.ts.
//
// Callers receive a normalized `Employee` shape — the same fields the UI and
// LLM prompt builder were already consuming. Firestore-specific fields
// (Timestamps, organizationId, source) are stripped at the repo boundary so
// nothing downstream depends on the storage layer.
//
// All reads are scoped to a single organization, enforced at the path level
// via `colls.employees(orgId)`. The seed org is the only tenant in Phase 1.
// =============================================================================

import { getFirestore, colls, SEED_ORG_ID } from "./firestore";
import type { EmployeeDoc, ProfileProvenance } from "./types";
import type { HabitScores } from "@/lib/lq-engine";

/**
 * App-facing employee shape. Mirrors what the homepage roster, the employee
 * detail page, and the briefing route consume. No Firestore Timestamp fields.
 */
export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  backstory: string;
  recentContext: string;
  scores: HabitScores;
  assessmentDate: string;
  source: ProfileProvenance;
  /**
   * 0–100. Only meaningful when source is "machine_inferred". For
   * "manual_echo" and "partner_supplied" subjects this is undefined; the
   * LaaS API treats undefined as 100 (full confidence in the assessment).
   */
  confidence?: number;
  /**
   * Work email. Optional; used by the Chrome extension's smart-fallback
   * identity match. Always lowercase.
   */
  email?: string;
}

function normalize(doc: EmployeeDoc): Employee {
  return {
    id: doc.id,
    name: doc.name,
    role: doc.role,
    initials: doc.initials,
    backstory: doc.backstory,
    recentContext: doc.recentContext,
    scores: doc.scores,
    assessmentDate: doc.assessmentDate,
    source: doc.source,
    confidence: doc.confidence,
    email: doc.email,
  };
}

/**
 * List all employees in the given organization. Returns them sorted by name
 * so the roster has a stable order regardless of Firestore document order.
 */
export async function listEmployees(
  orgId: string = SEED_ORG_ID,
): Promise<Employee[]> {
  const db = getFirestore();
  const snap = await db.collection(colls.employees(orgId)).get();
  const employees = snap.docs.map(d => normalize(d.data() as EmployeeDoc));
  employees.sort((a, b) => a.name.localeCompare(b.name));
  return employees;
}

/**
 * Fetch a single employee by ID. Returns null if not found — callers are
 * responsible for translating that to a 404 (or notFound() in a server
 * component).
 */
export async function getEmployeeById(
  employeeId: string,
  orgId: string = SEED_ORG_ID,
): Promise<Employee | null> {
  const db = getFirestore();
  const ref = db.doc(`${colls.employees(orgId)}/${employeeId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return normalize(snap.data() as EmployeeDoc);
}

/**
 * Look up a single employee by email (case-insensitive). Returns null if
 * not found. Used by the Chrome extension smart-fallback identity match:
 * a Google Calendar attendee's email is checked here first; if no hit,
 * the extension falls back to a manual picker.
 *
 * Email comparison is case-insensitive — emails are stored lowercase in
 * Firestore, so we lowercase the query too.
 */
export async function getEmployeeByEmail(
  email: string,
  orgId: string = SEED_ORG_ID,
): Promise<Employee | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getFirestore();
  const snap = await db
    .collection(colls.employees(orgId))
    .where("email", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return normalize(snap.docs[0].data() as EmployeeDoc);
}
