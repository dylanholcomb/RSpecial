// Employee profile + meeting context form + briefing display.
// Server component runs the engine, hands a serializable view to the client.
//
// v0.5 — reads the employee from Firestore. The engine still runs server-side
// so internals (habit hierarchy, frustration triggers, etc.) never reach the
// client bundle. Only the framings + employee summary cross the boundary.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmployeeById } from "@/lib/data/employees-repo";
import { analyzeProfile, hasShadow, visibleHabitCount } from "@/lib/lq-engine";
import { Avatar } from "@/components/Avatar";
import { HabitChip } from "@/components/HabitChip";
import { ScoreBars } from "@/components/ScoreBars";
import MeetingPrepClient from "./MeetingPrepClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function EmployeePage({ params }: PageProps) {
  const employee = await getEmployeeById(params.id);
  if (!employee) notFound();

  const engine = analyzeProfile(employee.id, employee.scores);
  const primary = engine.hierarchy[0];

  return (
    <main>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>←</span> Roster
      </Link>

      <section className="rounded-2xl bg-canvas-card p-5 ring-1 ring-ink-100">
        <div className="flex items-start gap-4">
          <Avatar initials={employee.initials} primary={primary.code} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl leading-tight text-ink-900">{employee.name}</h1>
            <p className="mt-0.5 text-sm text-ink-500">{employee.role}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">
            Listening profile
          </p>

          {/* Per Allison SME feedback (2026-05-22): show one habit chip for
              single-dominant, two for dual, three for triple, all four for
              The Flexer. NO arrows — habits in multi-dominant profiles
              interplay; they do not waterfall. */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {engine.archetype && (
              <span className="rounded-full bg-ink-900 px-2.5 py-1 text-xs font-semibold text-canvas-base">
                {engine.archetype.name}
              </span>
            )}
            {engine.hierarchy
              .filter(h => h.role !== "shadow")
              .slice(0, visibleHabitCount(engine.dominanceType))
              .map(h => (
                <HabitChip key={h.code} code={h.code} role={h.role} size="sm" />
              ))}
            {hasShadow(engine.dominanceType) &&
              engine.hierarchy.find(h => h.role === "shadow") && (
                <HabitChip
                  code={engine.hierarchy.find(h => h.role === "shadow")!.code}
                  role="shadow"
                  size="sm"
                />
              )}
            <ScoreBars
              scores={employee.scores}
              className="ml-auto"
              ariaLabel={`Listening scores — CV ${employee.scores.CV}, RV ${employee.scores.RV}, AL ${employee.scores.AL}, CL ${employee.scores.CL}`}
            />
          </div>

          {/* Snapshot string — now the canonical third-person short description
              from the 41-profile catalog when we have a match (e.g., "Inventors
              listen for everything that can be informative..."). */}
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            {engine.framings.snapshot}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <Snippet
            label="Receives best as"
            body={engine.primaryHabit.receptionPreference}
          />
          <Snippet
            label="Tunes out when"
            body={engine.primaryHabit.tuneOutTrigger}
          />
          {/* Per Allison SME feedback (2026-05-22): shadow is BOTH the
              missed-content lane AND the tune-out trigger. Only render when
              the dominance type has a shadow at all (Flexer has none). */}
          {hasShadow(engine.dominanceType) && (
            <Snippet
              label="Shadow lane — easy to miss, easy to lose them"
              // primaryFocus already ends with a period; strip it before
              // continuing the sentence so we don't render "...impact.. They".
              body={`${engine.shadowHabit.name} — ${engine.shadowHabit.primaryFocus.toLowerCase().replace(/\.$/, "")}. They are likely to tune out, get impatient, or become frustrated when the conversation lives here.`}
              tone="warn"
            />
          )}
        </div>

        <div className="mt-5 rounded-xl bg-canvas-subtle p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Recent context
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{employee.recentContext}</p>
        </div>
      </section>

      <MeetingPrepClient
        employeeId={employee.id}
        employeeFirstName={employee.name.split(" ")[0]}
      />
    </main>
  );
}

function Snippet({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: "warn";
}) {
  return (
    <div
      className={[
        "rounded-xl px-3.5 py-3",
        tone === "warn"
          ? "bg-amber-50 ring-1 ring-amber-200/70"
          : "bg-canvas-subtle",
      ].join(" ")}
    >
      <p
        className={[
          "text-[11px] font-semibold uppercase tracking-wider",
          tone === "warn" ? "text-amber-700" : "text-ink-500",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">{body}</p>
    </div>
  );
}
