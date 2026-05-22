// =============================================================================
// /prep/adhoc — server wrapper for the ad-hoc subject flow.
// -----------------------------------------------------------------------------
// Server component reads the 41-profile catalog from the engine and hands a
// slim summary (code, name, dominanceType) to the client component. Keeps
// the engine internals off the wire.
// =============================================================================

import { PROFILES_41 } from "@/lib/lq-engine";
import AdhocPrepClient from "./AdhocPrepClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AdhocPrepPage() {
  const catalogSummary = PROFILES_41.map(p => ({
    code: p.code,
    name: p.name,
    dominanceType: p.dominanceType,
  }));
  return <AdhocPrepClient catalog={catalogSummary} />;
}
