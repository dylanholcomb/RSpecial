// Home / Roster screen.
// Mobile-first list of employees with their LQ snapshots.

import Link from "next/link";
import { EMPLOYEES } from "@/data/employees";
import { analyzeProfile } from "@/lib/lq-engine";
import { Avatar } from "@/components/Avatar";
import { HabitChip } from "@/components/HabitChip";

export default function HomePage() {
  // Run the engine once per employee — server-side, internals never reach client.
  const cards = EMPLOYEES.map(emp => {
    const engine = analyzeProfile(emp.id, emp.scores);
    return { emp, engine };
  });

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

      <ul className="space-y-3">
        {cards.map(({ emp, engine }) => {
          const primary = engine.hierarchy[0];
          const secondary = engine.hierarchy[1];
          const shadow = engine.hierarchy.find(h => h.role === "shadow");

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

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <HabitChip code={primary.code} size="sm" />
                      {secondary && secondary.role !== "shadow" && (
                        <HabitChip code={secondary.code} size="sm" />
                      )}
                      {shadow && <HabitChip code={shadow.code} role="shadow" size="sm" />}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

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
