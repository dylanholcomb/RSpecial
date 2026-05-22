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
// =============================================================================

import { Firestore } from "@google-cloud/firestore";

let _client: Firestore | null = null;

/** Returns a singleton Firestore client. Lazily initialized. */
export function getFirestore(): Firestore {
  if (!_client) {
    _client = new Firestore({
      projectId:
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.VERTEX_AI_PROJECT ||
        "lq-platform-foundation",
    });
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
