// =============================================================================
// /api/admin/employees/upload
// -----------------------------------------------------------------------------
// Bulk-ingest real ECHO results from a CSV. Used during the pilot to load the
// LQ team's actual profile data into the stage Firestore (replacing the
// synthetic seed roster from data/employees.ts).
//
// Auth: same SEED_SECRET shared-secret pattern as /api/admin/seed. This
// endpoint is run by Mosaic ops via curl, not user-facing. Once IAP +
// org_admin RBAC are live, this should be folded under the auth middleware
// with an "employees:bulk-write" permission — for now the shared secret
// keeps it out of broader hands while it's exercised against real PII.
//
// CSV format (required headers, case-insensitive):
//
//   name, email, role, cv, rv, al, cl
//
// Optional headers (used if present, defaulted otherwise):
//
//   initials, backstory, recentcontext, assessmentdate
//
// Behavior:
//   - Validates every row before writing. Bad rows are rejected and reported
//     in the response; good rows are written.
//   - Idempotent upsert by derived employee id (slugified email local part,
//     falling back to slugified name). Re-running with the same email
//     updates the existing record without blowing away unrelated documents.
//   - Each row is run through the engine before write so the response can
//     show which catalog profile each person matched — useful for SME
//     spot-checking before committing data.
//   - Supports dry-run via the x-dry-run: true header — validates and runs
//     the engine match, returns the per-row report, writes nothing.
//   - Single audit row records the bulk event (count + dry-run flag, NOT
//     row content).
//
// Example invocation (dry-run):
//
//   curl -X POST \
//     -H "x-seed-secret: $STAGE_SEED_SECRET" \
//     -H "x-dry-run: true" \
//     --data-binary @lq-team-echo.csv \
//     https://STAGE_URL/api/admin/employees/upload
//
// Same call without x-dry-run actually writes.
// =============================================================================

import { NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore, colls, SEED_ORG_ID } from "@/lib/data/firestore";
import { logAuditEvent } from "@/lib/data/audit";
import { analyzeProfile, type HabitScores } from "@/lib/lq-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface RowResult {
  rowNumber: number;
  status: "accepted" | "rejected" | "dry-run-ok";
  employeeId?: string;
  email?: string;
  name?: string;
  matchedProfile?: string;
  dominanceType?: string;
  errors?: string[];
}

interface UploadResponse {
  success: boolean;
  dryRun: boolean;
  orgId: string;
  totals: { received: number; accepted: number; rejected: number };
  rows: RowResult[];
}

// -----------------------------------------------------------------------------
// CSV parsing — small, dependency-free, handles quoted strings + escaped
// double-quotes. Not a full RFC 4180 parser; sufficient for trusted admin
// uploads where the operator controls the file format.
// -----------------------------------------------------------------------------

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i += 2; continue; }
        if (ch === '"') { inQuotes = false; i++; continue; }
        current += ch; i++;
      } else {
        if (ch === ",") { fields.push(current); current = ""; i++; continue; }
        if (ch === '"' && current === "") { inQuotes = true; i++; continue; }
        current += ch; i++;
      }
    }
    fields.push(current);
    return fields;
  }

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function getCell(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name.toLowerCase());
  if (idx === -1) return "";
  return (row[idx] ?? "").trim();
}

function deriveEmployeeId(name: string, email: string): string {
  const emailLocal = (email.split("@")[0] || "").trim();
  const base = emailLocal || name;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "subject";
}

function deriveInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.map(p => p[0]).slice(0, 2).join("").toUpperCase();
  return letters || "??";
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  const expected = process.env.SEED_SECRET || "";
  const provided = req.headers.get("x-seed-secret") || "";
  const dryRun = req.headers.get("x-dry-run") === "true";
  const orgId = req.headers.get("x-org-id") || SEED_ORG_ID;
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

  // Read raw CSV body.
  let csvText: string;
  try {
    csvText = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read request body" }, { status: 400 });
  }
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV body" }, { status: 400 });
  }

  const { headers, rows } = parseCsv(csvText);

  // Validate required columns.
  const required = ["name", "email", "role", "cv", "rv", "al", "cl"];
  const missingCols = required.filter(r => !headers.includes(r));
  if (missingCols.length > 0) {
    return NextResponse.json(
      {
        error: "missing required CSV columns",
        missing: missingCols,
        foundColumns: headers,
        hint: "Required columns are: name, email, role, cv, rv, al, cl. Optional: initials, backstory, recentcontext, assessmentdate.",
      },
      { status: 400 },
    );
  }

  // Process rows.
  const results: RowResult[] = [];
  let acceptedCount = 0;
  let rejectedCount = 0;

  const db = getFirestore();
  const now = Timestamp.now();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // header is row 1
    const errors: string[] = [];

    const name = getCell(headers, row, "name");
    const email = getCell(headers, row, "email").toLowerCase();
    const role = getCell(headers, row, "role");

    if (!name) errors.push("name is required");
    if (!email) errors.push("email is required");
    if (!role) errors.push("role is required");
    if (email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
      errors.push(`email is not a valid format (got "${email}")`);
    }

    // Parse scores. All four required, all in 0–100.
    const scores: Partial<HabitScores> = {};
    for (const code of ["CV", "RV", "AL", "CL"] as const) {
      const raw = getCell(headers, row, code.toLowerCase());
      if (!raw) {
        errors.push(`${code} score is required`);
        continue;
      }
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        errors.push(`${code} score must be a number in 0–100 (got "${raw}")`);
      } else {
        scores[code] = n;
      }
    }

    if (errors.length > 0) {
      rejectedCount++;
      results.push({ rowNumber, status: "rejected", name: name || undefined, email: email || undefined, errors });
      continue;
    }

    // Run the engine so the response shows which catalog profile this row matched.
    const engine = analyzeProfile("preview", scores as HabitScores);
    const matchedProfile = engine.profile?.name ?? "(no catalog match)";
    const dominanceType = engine.dominanceType;

    const employeeId = deriveEmployeeId(name, email);
    const initials = getCell(headers, row, "initials") || deriveInitials(name);
    const backstory = getCell(headers, row, "backstory")
      || `${name} — ECHO profile loaded from CSV upload on ${now.toDate().toISOString().slice(0, 10)}.`;
    const recentContext = getCell(headers, row, "recentcontext")
      || "(no recent context on file — add via the meeting prep form's 'What's happened recently?' field.)";
    const assessmentDate = getCell(headers, row, "assessmentdate")
      || now.toDate().toISOString().slice(0, 10);

    if (dryRun) {
      acceptedCount++;
      results.push({
        rowNumber,
        status: "dry-run-ok",
        employeeId,
        email,
        name,
        matchedProfile,
        dominanceType,
      });
      continue;
    }

    // Upsert. merge: true means we don't blow away fields not in the CSV.
    try {
      await db.doc(`${colls.employees(orgId)}/${employeeId}`).set(
        {
          id: employeeId,
          organizationId: orgId,
          name,
          role,
          initials,
          backstory,
          recentContext,
          scores: scores as HabitScores,
          assessmentDate,
          source: "manual_echo",
          email,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      );
      acceptedCount++;
      results.push({
        rowNumber,
        status: "accepted",
        employeeId,
        email,
        name,
        matchedProfile,
        dominanceType,
      });
    } catch (err) {
      rejectedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        rowNumber,
        status: "rejected",
        employeeId,
        email,
        name,
        errors: [`firestore write failed: ${msg}`],
      });
    }
  }

  // Single audit event for the whole upload — never logs row content, only
  // the totals and the dry-run flag.
  void logAuditEvent({
    actorId: "echo-csv-upload",
    actorEmail: "system",
    action: "write",
    targetCollection: "employees",
    targetDocId: `bulk:${rows.length}`,
    outcome: rejectedCount === 0 ? "success" : "error",
    metadata: {
      ip: actorIp,
      orgId,
      dryRun,
      received: rows.length,
      accepted: acceptedCount,
      rejected: rejectedCount,
      api: "admin/employees/upload",
    },
  });

  const response: UploadResponse = {
    success: rejectedCount === 0,
    dryRun,
    orgId,
    totals: { received: rows.length, accepted: acceptedCount, rejected: rejectedCount },
    rows: results,
  };
  return NextResponse.json(response);
}
