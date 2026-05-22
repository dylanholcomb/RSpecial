// Home / Roster screen.
// Mobile-first list of employees with their LQ snapshots.
//
// v0.5 — reads from Firestore (organizations/{orgId}/employees) instead of
// the bundled data/employees.ts module. The page is now a server component
// running on every request (force-dynamic), so roster changes in Firestore
// land on the next page load without redeploy.

import Link from "next/link";
import { listEmployees } from "@/lib/data/employees-repo";
import {
  PROFILES_41,
  analyzeProfile,
  hasShadow,
  visibleHabitCount,
} from "@/lib/lq-engine";
import { Avatar } from "@/components/Avatar";
import { HabitChip } from "@/components/HabitChip";
import { ScoreBars } from "@/components/ScoreBars";
import { ManagerProfileBanner } from "@/components/ManagerProfileBanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const employees = await listEmployees();

  // Run the engine once per employee — server-side, internals never reach client.
  const cards = employees.map(emp => {
    const engine = analyzeProfile(emp.id, emp.scores);
    return { emp, engine };
  });

  // Pass a slim catalog summary to the client picker — name/code/dominance only.
  // Avoid sending the full FullProfile (intro, strengths, interactions etc.)
  // across the wire; it's not needed for the picker UI.
  const catalogSummary = PROFILES_41.map(p => ({
    code: p.code,
    name: p.name,
    dominanceType: p.dominanceType,
  }));

  return (
    <main>
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
          Meeting Prep
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink-900">
          Who are you meeting with?
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Pick a person and I'll prepare you using their Listening Intelligence profile.
        </p>
      </header>

      <div className="mb-6">
        <ManagerProfileBanner catalog={catalogSummary} />
      </div>

      {cards.length === 0 ? (
        <EmptyRoster />
      ) : (
        <ul className="space-y-3">
          {cards.map(({ emp, engine }) => {
            const primary = engine.hierarchy[0];

            // Per Allison SME feedback (2026-05-22): tile shows ONE habit for
            // single-dominant, two for dual, three for triple, all four for
            // The Flexer. No arrows — habits in multi-dominant profiles
            // interplay; they do not waterfall.
            const visibleCount = visibleHabitCount(engine.dominanceType);
            const visibleHabits = engine.hierarchy
              .filter(h => h.role !== "shadow")
              .slice(0, visibleCount);
            const shadow = hasShadow(engine.dominanceType)
              ? engine.hierarchy.find(h => h.role === "shadow")
              : null;

            return (
              <li key={emp.id}>
                <Link
                  href={`/employee/${emp.id}`}
                  className="group block rounded-2xl bg-canvas-card p-4 ring-1 ring-ink-100 transition-all active:scale-[0.99] hover:ring-ink-300/60"
                >
                  <div className="flex items-start gap-3">
                    <Avatar initials={emp.initials} primary={primary.code} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="truncate font-semibold text-ink-900">{emp.name}</h2>
                        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-ink-300">
                          {engine.archetype?.name ?? "Custom"}
                        </span>
                      </div>
                      <p className="truncate text-xs text-ink-500">{emp.role}</p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {visibleHabits.map(h => (
                          <HabitChip key={h.code} code={h.code} size="sm" />
                        ))}
                        {shadow && (
                          <HabitChip code={shadow.code} role="shadow" size="sm" />
                        )}
                        <ScoreBars
                          scores={emp.scores}
                          className="ml-auto"
                          ariaLabel={`Score bars for ${emp.name}`}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Ad-hoc entry point — for when the subject isn't in the roster. */}
      <Link
        href="/prep/adhoc"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-ink-300 bg-canvas-base p-4 transition-colors hover:border-ink-500 hover:bg-canvas-subtle"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
            Outside the roster
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">
            Prep for someone without an ECHO profile
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
            Pick a profile from the catalog based on your read of how they listen.
          </p>
        </div>
        <span className="shrink-0 text-ink-300" aria-hidden>→</span>
      </Link>

      <footer className="mt-10 rounded-xl bg-canvas-subtle p-4 text-[11px] leading-relaxed text-ink-500">
        <p className="font-semibold uppercase tracking-wider text-ink-700">Phase 1 demo</p>
        <p className="mt-1">
          Roster and profiles are seeded with synthetic data based on the publicly-documented
          ECHO Listening Profile™ framework. Phase 2 will pull live profiles from Mosaic's
          internal LQ knowledge base.
        </p>
      </footer>
    </main>
  );
}

function EmptyRoster() {
  return (
    <div className="rounded-2xl bg-canvas-card p-6 ring-1 ring-ink-100">
      <p className="text-sm font-semibold text-ink-900">No employees yet.</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        The roster reads from Firestore. If you're an admin and this looks empty after
        a fresh deploy, run the seed endpoint (<code className="rounded bg-canvas-subtle px-1 py-0.5 font-mono text-[10px]">POST /api/admin/seed</code>) to
        populate the demo employees.
      </p>
    </div>
  );
}
