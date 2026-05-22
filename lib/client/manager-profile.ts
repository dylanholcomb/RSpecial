// =============================================================================
// Client-side manager-profile storage (Phase 1)
// -----------------------------------------------------------------------------
// The manager's own listening profile lives in localStorage in Phase 1.
// Once IAP is on, the backend will source this from UserDoc.profile instead
// (and ignore the client-supplied value), but the storage key + shape stays
// stable so the Chrome extension and any future override paths keep working.
// =============================================================================

export const MANAGER_PROFILE_STORAGE_KEY = "lq:manager-profile";

/** What we persist in localStorage about the manager's profile. */
export interface ManagerProfileChoice {
  /** Catalog code, e.g. "CL-RV-AL" or "CV" or "FLEXER". */
  code: string;
  /** Display name (e.g. "The Pragmatist") for UI render without a catalog roundtrip. */
  name: string;
}

/** Read the manager profile from localStorage. Returns null when unset / unavailable. */
export function readManagerProfile(): ManagerProfileChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MANAGER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManagerProfileChoice;
    return parsed?.code ? parsed : null;
  } catch {
    return null;
  }
}
