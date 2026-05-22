// =============================================================================
// RBAC — ROLES AND PERMISSIONS
// -----------------------------------------------------------------------------
// Four-role authorization matrix scaffold. Phase 1 ships without enforced
// auth (the app is currently unauthenticated for the MVP). This module
// defines the permission shape so we can wire enforcement to Cloud Run IAP
// or Firebase Auth in Phase 2 without rewriting consumers.
//
// Roles (per SOW §3.4):
//
//   manager       — can read their own org's employee profiles and generate
//                   briefings. Cannot view audit logs or change org settings.
//
//   hr_admin      — superset of manager. Can additionally create/update
//                   employees, upload ECHO results, and view audit logs
//                   filtered to their org.
//
//   org_admin     — full read/write within the org, including user
//                   provisioning, settings, and audit log access.
//
//   auditor       — read-only across employees, briefings, and audit. Cannot
//                   generate briefings, cannot mutate anything. Designed for
//                   internal compliance + customer-side audit reviewers.
//
// hasPermission() is the only consumer-facing API. Callers should never
// inspect the role string directly — that's a footgun when we add roles
// later (e.g., contractor, executive).
// =============================================================================

import type { UserRole } from "@/lib/data/types";

/** Discrete permission strings used throughout the app. */
export type Permission =
  | "employees:read"
  | "employees:write"
  | "briefings:read"
  | "briefings:write"
  | "audit:read"
  | "users:write"
  | "settings:write";

/** Role → permissions matrix. Add new permissions here, not at call sites. */
export const ROLE_PERMISSIONS: Record<UserRole, ReadonlyArray<Permission>> = {
  manager: [
    "employees:read",
    "briefings:read",
    "briefings:write",
  ],
  hr_admin: [
    "employees:read",
    "employees:write",
    "briefings:read",
    "briefings:write",
    "audit:read",
  ],
  org_admin: [
    "employees:read",
    "employees:write",
    "briefings:read",
    "briefings:write",
    "audit:read",
    "users:write",
    "settings:write",
  ],
  auditor: [
    "employees:read",
    "briefings:read",
    "audit:read",
  ],
};

/**
 * Returns true if the given role grants the given permission.
 *
 * Phase 2: wrap this with a server-side getCurrentUser() so route handlers
 * can do `if (!hasPermission(await requireRole(), "briefings:write")) ...`.
 */
export function hasPermission(role: UserRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

/** Human-readable role label for UI surfaces. */
export const ROLE_LABELS: Record<UserRole, string> = {
  manager: "Manager",
  hr_admin: "HR Admin",
  org_admin: "Organization Admin",
  auditor: "Read-Only Auditor",
};
