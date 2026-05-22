// =============================================================================
// IDENTITY-AWARE PROXY — REQUEST PARSER
// -----------------------------------------------------------------------------
// When Identity-Aware Proxy is enabled on Cloud Run, Google injects two
// headers on every authenticated request:
//
//   X-Goog-Authenticated-User-Email  →  accounts.google.com:user@domain.com
//   X-Goog-Authenticated-User-Id     →  accounts.google.com:123456789
//
// The "accounts.google.com:" prefix is part of the spec and must be stripped
// to get the actual values.
//
// Two operating modes, gated by the AUTH_MODE env var:
//
//   unauthenticated  (default)  — IAP not yet enabled. If headers absent,
//                                 returns a stable phase1-anonymous identity
//                                 so the app keeps working for the demo.
//
//   iap                         — IAP enabled. If headers absent, returns
//                                 null and the middleware refuses the
//                                 request. No silent fallback to anonymous.
//
// Flip the mode by setting AUTH_MODE=iap on the Cloud Run service the same
// day IAP is enabled. No code change required.
// =============================================================================

const IAP_PREFIX = "accounts.google.com:";

export type AuthMode = "unauthenticated" | "iap";

export function getAuthMode(): AuthMode {
  const raw = (process.env.AUTH_MODE || "unauthenticated").toLowerCase();
  return raw === "iap" ? "iap" : "unauthenticated";
}

export interface IapIdentity {
  /** Stable subject identifier from IAP. Always non-empty. */
  externalId: string;
  /** Authenticated email address from IAP. Always non-empty. */
  email: string;
  /** Where the identity came from. "iap" is real; "phase1-anonymous" is a placeholder. */
  source: "iap" | "phase1-anonymous";
}

/**
 * Parse IAP headers off the request. Returns null if IAP is required but
 * not present (caller should 401). Returns a phase1-anonymous placeholder
 * if IAP mode is "unauthenticated" and headers are absent.
 */
export function parseIapIdentity(req: Request): IapIdentity | null {
  const rawEmail = req.headers.get("x-goog-authenticated-user-email") || "";
  const rawId = req.headers.get("x-goog-authenticated-user-id") || "";

  if (rawEmail && rawId) {
    return {
      externalId: stripPrefix(rawId),
      email: stripPrefix(rawEmail),
      source: "iap",
    };
  }

  // No IAP headers. Depending on mode, fall back or refuse.
  if (getAuthMode() === "iap") {
    return null;
  }
  return {
    externalId: "phase1-anonymous",
    email: "anonymous@lq-platform",
    source: "phase1-anonymous",
  };
}

function stripPrefix(value: string): string {
  return value.startsWith(IAP_PREFIX) ? value.slice(IAP_PREFIX.length) : value;
}
