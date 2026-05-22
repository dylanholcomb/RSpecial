// =============================================================================
// DATA LAYER — FIRESTORE DOCUMENT SCHEMAS
// -----------------------------------------------------------------------------
// TypeScript shapes for the documents stored in Firestore. These mirror the
// physical Firestore document structure exactly: every interface here
// represents one document type in one collection.
//
// Multi-tenant design: every collection (except the top-level "organizations"
// collection itself) is a sub-collection under organizations/{orgId}/. The
// org boundary is therefore literal in the data layout — security rules and
// queries can rely on path scoping for tenant isolation.
//
// Provenance: every score-bearing document carries a `source` field
// (manual_echo | partner_supplied | machine_inferred) per SOW §3.2. This is
// forward-compatibility scaffolding for Phase 3 transcript-based inference.
// =============================================================================

import type { Timestamp } from "@google-cloud/firestore";
import type { HabitScores } from "@/lib/lq-engine";

/** Source of a profile score. Required on any document carrying habit scores. */
export type ProfileProvenance =
  | "manual_echo"
  | "partner_supplied"
  | "machine_inferred";

/** Application-user role within an organization. */
export type UserRole = "manager" | "hr_admin" | "org_admin" | "auditor";

// -----------------------------------------------------------------------------
// organizations/{orgId}
// -----------------------------------------------------------------------------

export interface OrganizationDoc {
  /** Matches the Firestore document ID. */
  id: string;
  name: string;
  /** Optional email domain used for auto-provisioning users from a Workspace tenant. */
  domain?: string;
  settings?: {
    primaryColor?: string;
    timezone?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// organizations/{orgId}/users/{userId}
// -----------------------------------------------------------------------------

export interface UserDoc {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  role: UserRole;
  /** Optional — populated if this user has taken an ECHO assessment themselves. */
  profile?: {
    scores: HabitScores;
    assessmentDate: string;
    source: ProfileProvenance;
    confidence?: number; // 0–100, only meaningful for machine_inferred
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// organizations/{orgId}/employees/{employeeId}
// -----------------------------------------------------------------------------

export interface EmployeeDoc {
  id: string;
  organizationId: string;
  name: string;
  /** Job title. */
  role: string;
  initials: string;
  backstory: string;
  recentContext: string;
  scores: HabitScores;
  assessmentDate: string;
  source: ProfileProvenance;
  /** 0–100, only meaningful for machine_inferred. */
  confidence?: number;
  /**
   * Work email. Optional in the schema (legacy seed data may not have it),
   * but required for the Chrome extension's smart-fallback identity match
   * — when a calendar attendee's email comes in, we look up the employee
   * by this field. Always stored lowercase.
   */
  email?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// organizations/{orgId}/briefings/{briefingId}
// -----------------------------------------------------------------------------

export interface BriefingDoc {
  id: string;
  organizationId: string;
  employeeId: string;
  /** User who requested this briefing (the manager). */
  managerId?: string;
  meetingContext: {
    purpose: string;
    topOfMind: string;
    desiredOutcome: string;
  };
  /** The generated briefing JSON. Shape mirrors the Briefing type in lq-engine. */
  briefing: Record<string, unknown>;
  generatedBy: "live" | "demo-fallback";
  providerName: string;
  generatedAt: Timestamp;
}

// -----------------------------------------------------------------------------
// organizations/{orgId}/audit/{eventId}
// -----------------------------------------------------------------------------

export interface AuditEventDoc {
  id: string;
  organizationId: string;
  /** User performing the action (or "system" for automated processes). */
  actorId: string;
  actorEmail: string;
  timestamp: Timestamp;
  action: "read" | "write" | "delete";
  /** Collection name, e.g., "employees" or "briefings". */
  targetCollection: string;
  /** Document ID within that collection. */
  targetDocId: string;
  outcome: "success" | "denied" | "error";
  /** Optional structured context — e.g., the user's IP, request headers, etc. */
  metadata?: Record<string, unknown>;
}
