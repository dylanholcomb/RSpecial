// =============================================================================
// LaaS API — CORS HELPER
// -----------------------------------------------------------------------------
// The LaaS API is consumed by browser clients running on different origins
// than the LQ Platform web app:
//
//   • The LQ Chrome extension (chrome-extension://EXTENSION_ID)
//   • Future partner web apps (e.g. ADP's HR portal)
//
// This helper handles the CORS preflight (OPTIONS) and adds the response
// headers required for browsers to permit those cross-origin reads.
//
// Allowlist policy (Phase 1):
//   • Any chrome-extension://* origin — permissive for demo install + dev
//     reloads. Tighten to the specific extension ID once published.
//   • The LQ Platform's own origin (same-origin requests don't need CORS,
//     but listing it lets us treat all consumers uniformly).
//
// Phase 2 should narrow this to a known list of consumer origins and add
// an env-var override for staging / dev.
// =============================================================================

const ALLOWED_HEADERS = "Content-Type, Authorization, x-laas-client";
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const MAX_AGE_SECONDS = 3600;

/**
 * Decide what to return as the Access-Control-Allow-Origin value. Browsers
 * require an EXACT origin echo when credentials are allowed, not a wildcard,
 * so we reflect the request origin when it matches our allowlist.
 */
function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  // Permit any chrome-extension origin during the Phase 1 spike. Production
  // tightening should pin the specific extension ID.
  if (origin.startsWith("chrome-extension://")) return origin;
  // Permit the LQ Platform's own origin (Cloud Run service URL pattern).
  if (origin.endsWith(".run.app")) return origin;
  if (origin.startsWith("http://localhost") || origin.startsWith("https://localhost")) return origin;
  return null;
}

/**
 * Build the CORS headers for a given request. Returns an empty object when
 * the origin is not allowed — the browser will then block the response,
 * which is the correct outcome.
 */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = resolveAllowedOrigin(origin);
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": String(MAX_AGE_SECONDS),
    "Vary": "Origin",
  };
}

/**
 * Standard handler for the CORS preflight OPTIONS request. Routes export
 * this as their OPTIONS handler:
 *
 *   export const OPTIONS = preflight;
 */
export function preflight(req: Request): Response {
  const headers = corsHeadersFor(req);
  // 204 No Content with the CORS headers — standard preflight response.
  return new Response(null, { status: 204, headers });
}
