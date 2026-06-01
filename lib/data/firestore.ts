// =============================================================================
// DATA LAYER — FIRESTORE CLIENT
// -----------------------------------------------------------------------------
// Single-client lazy initializer for the Firestore SDK, plus collection-path
// helpers so callers never hand-build path strings (which is how multi-tenant
// data leaks happen).
//
// On Cloud Run, authentication uses Application Default Credentials — the
// service account running the container must have roles/datastore.user.
// Locally, ADC falls back to whatever account is signed in via `gcloud auth
// application-default login`.
//
// PROJECT RESOLUTION (v0.6.6, May 28, 2026):
// The client's project ID is resolved from environment variables in this
// order: GOOGLE_CLOUD_PROJECT, GCP_PROJECT, VERTEX_AI_PROJECT. If NONE of
// these are set, we throw on first use rather than silently falling back to
// a hard-coded project — the old behavior (default to "lq-platform-foundation")
// caused a stage deployment to read+write against dev's Firestore using
// stage's service account, which produced a misleading PERMISSION_DENIED
// because stage's SA had no rights on dev. Failing fast is loud and clear.
// =============================================================================

import { Firestore } from "@google-cloud/firestore";

let _client: Firestore | null = null;

function resolveProjectId(): string {
  const candidates = [
    process.env.GOOGLE_CLOUD_PROJECT,
    process.env.GCP_PROJECT,
    process.env.VERTEX_AI_PROJECT,
  ];
  for (const v of candidates) {
    if (v && v.trim()) return v.trim();
  }
  throw new Error(
    "Firestore client: no project ID configured. Set one of " +
    "GOOGLE_CLOUD_PROJECT, GCP_PROJECT, or VERTEX_AI_PROJECT on the runtime. " +
    "Cloud Run does not auto-populate GOOGLE_CLOUD_PROJECT; set it explicitly " +
    "to the project containing the Firestore database for this environment.",
  );
}

/** Returns a singleton Firestore client. Lazily initialized. */
export function getFirestore(): Firestore {
  if (!_client) {
    _client = new Firestore({ projectId: resolveProjectId() });
  }
  return _client;
}

/**
 * Collection-path helpers. Use these instead of hand-built strings — they
 * encode the multi-tenant boundary and make tenant-isolation auditable from
 * a single file.
 */
export const colls = {
  /** Top-level: organizations/ */
  organizations: () => "organizations",

  /** organizations/{orgId} */
  org: (orgId: string) => `organizations/${orgId}`,

  /** organizations/{orgId}/users */
  users: (orgId: string) => `organizations/${orgId}/users`,

  /** organizations/{orgId}/employees */
  employees: (orgId: string) => `organizations/${orgId}/employees`,

  /** organizations/{orgId}/briefings */
  briefings: (orgId: string) => `organizations/${orgId}/briefings`,

  /** organizations/{orgId}/audit */
  audit: (orgId: string) => `organizations/${orgId}/audit`,
} as const;

/** The single seed organization for Phase 1. Multi-tenant from day one but
 *  populated for one tenant initially. */
export const SEED_ORG_ID = "lq";
