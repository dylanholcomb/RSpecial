// =============================================================================
// USERS REPOSITORY
// -----------------------------------------------------------------------------
// Firestore-backed read/write helpers for UserDoc records.
//
// User documents are scoped per-organization at organizations/{orgId}/users.
// The doc ID is the user's external IAP subject ID (a stable Google account
// identifier) — this lets us look up the user by IAP headers without
// scanning the collection.
//
// We also maintain an email index implicitly: queries can lookup by email
// when the external ID isn't known yet (e.g., the very first request from
// a newly-allowlisted user, where we want to bind their email to a UserDoc
// that was pre-seeded).
// =============================================================================

import { Timestamp } from "@google-cloud/firestore";
import { getFirestore, colls, SEED_ORG_ID } from "./firestore";
import type { UserDoc, UserRole } from "./types";

/**
 * Look up a user by their IAP external ID. Returns null if not found.
 * Fast path — single doc read, deterministic ID.
 */
export async function getUserByExternalId(
  externalId: string,
  orgId: string = SEED_ORG_ID,
): Promise<UserDoc | null> {
  const db = getFirestore();
  const ref = db.doc(`${colls.users(orgId)}/${externalId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() as UserDoc;
}

/**
 * Look up a user by email. Used when the IAP external ID isn't bound yet
 * (first-time login). Returns null if no user has been pre-seeded with
 * this email.
 */
export async function getUserByEmail(
  email: string,
  orgId: string = SEED_ORG_ID,
): Promise<UserDoc | null> {
  const db = getFirestore();
  const snap = await db
    .collection(colls.users(orgId))
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as UserDoc;
}

/**
 * Create or update a UserDoc. Used by the admin "seed users" endpoint and
 * by the auto-bind flow that links a fresh IAP login to a pre-seeded
 * email-keyed record.
 */
export async function upsertUser(
  user: Omit<UserDoc, "createdAt" | "updatedAt">,
  orgId: string = SEED_ORG_ID,
): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`${colls.users(orgId)}/${user.id}`);
  const now = Timestamp.now();
  const existing = await ref.get();
  if (existing.exists) {
    await ref.set(
      {
        ...user,
        email: user.email.toLowerCase(),
        updatedAt: now,
      },
      { merge: true },
    );
  } else {
    await ref.set({
      ...user,
      email: user.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    });
  }
}

/** Convenience shape used during initial seeding. */
export interface SeedUserSpec {
  externalId: string;
  email: string;
  displayName: string;
  role: UserRole;
}
