// =============================================================================
// AUTH MIDDLEWARE — requirePermission()
// -----------------------------------------------------------------------------
// Route-handler glue that resolves the current user from IAP, looks up their
// role from Firestore, and checks the requested permission. Returns either
// the AuthorizedUser (caller proceeds) or a NextResponse (caller returns
// immediately).
//
// Two modes:
//
//   unauthenticated (default) — IAP not on. resolveActor returns a stable
//                               phase1-anonymous identity with a synthetic
//                               "phase1" role that grants ALL permissions.
//                               Today's behavior, but with deterministic
//                               audit identity instead of literal "anonymous".
//
//   iap                       — IAP on. resolveActor refuses requests with
//                               no IAP headers (401). Refuses authenticated
//                               users with no UserDoc (403 unprovisioned).
//                               Refuses users whose role lacks the requested
//                               permission (403 insufficient_role).
//
// Routes call requirePermission() at the top of their handler, e.g.:
//
//   const authz = await requirePermission(req, "briefings:write");
//   if ("error" in authz) return authz.error;
//   const { user } = authz;   // user.email, user.role, user.userId
//
// The pattern composes cleanly: every protected route gets one line, no
// per-route auth logic.
// =============================================================================

import { NextResponse } from "next/server";
import { parseIapIdentity, getAuthMode, type IapIdentity } from "./iap";
import { hasPermission, type Permission } from "./roles";
import { getUserByExternalId, getUserByEmail, upsertUser } from "@/lib/data/users-repo";
import { SEED_ORG_ID } from "@/lib/data/firestore";
import type { UserRole } from "@/lib/data/types";

/** Resolved + authorized user, ready to be used in audit events and business logic. */
export interface AuthorizedUser {
  userId: string;
  externalId: string;
  email: string;
  displayName: string;
  role: UserRole;
  source: IapIdentity["source"];
}

type RequireResult =
  | { user: AuthorizedUser }
  | { error: NextResponse };

/**
 * Resolve the current actor from the request and verify they have the
 * required permission. Use at the top of every protected route handler.
 */
export async function requirePermission(
  req: Request,
  permission: Permission,
): Promise<RequireResult> {
  const identity = parseIapIdentity(req);
  if (!identity) {
    return {
      error: NextResponse.json(
        { error: "unauthorized", reason: "iap_required_but_missing" },
        { status: 401 },
      ),
    };
  }

  // -- Phase 1 permissive mode -------------------------------------------
  // When AUTH_MODE is "unauthenticated", we don't enforce roles. We still
  // produce a stable AuthorizedUser so audit events carry consistent
  // identity (rather than being attributed to "anonymous").
  if (getAuthMode() === "unauthenticated") {
    return {
      user: {
        userId: "phase1-anonymous",
        externalId: identity.externalId,
        email: identity.email,
        displayName: "Phase 1 Anonymous User",
        role: "manager",
        source: identity.source,
      },
    };
  }

  // -- IAP enforcement mode ----------------------------------------------
  // Look up the UserDoc by external ID first (fast path). If not found,
  // fall back to email (in case the user was pre-seeded before they logged
  // in for the first time). If found by email but not yet bound to an
  // external ID, bind them now.
  let userDoc = await getUserByExternalId(identity.externalId);

  if (!userDoc) {
    const byEmail = await getUserByEmail(identity.email);
    if (byEmail) {
      // Pre-seeded by email; bind to the IAP external ID now.
      await upsertUser({
        id: identity.externalId,
        organizationId: SEED_ORG_ID,
        email: byEmail.email,
        displayName: byEmail.displayName,
        role: byEmail.role,
        profile: byEmail.profile,
      });
      userDoc = {
        ...byEmail,
        id: identity.externalId,
      };
    }
  }

  if (!userDoc) {
    return {
      error: NextResponse.json(
        {
          error: "forbidden",
          reason: "no_user_record",
          message: "Your account has not been provisioned for this application. Contact an administrator.",
        },
        { status: 403 },
      ),
    };
  }

  if (!hasPermission(userDoc.role, permission)) {
    return {
      error: NextResponse.json(
        {
          error: "forbidden",
          reason: "insufficient_role",
          requiredPermission: permission,
          yourRole: userDoc.role,
        },
        { status: 403 },
      ),
    };
  }

  return {
    user: {
      userId: userDoc.id,
      externalId: identity.externalId,
      email: identity.email,
      displayName: userDoc.displayName,
      role: userDoc.role,
      source: identity.source,
    },
  };
}
