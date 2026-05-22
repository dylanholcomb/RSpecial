"use client";

// =============================================================================
// AdhocPrepClient — prep a briefing for someone outside the roster
// -----------------------------------------------------------------------------
// Per Allison SME feedback #8 (2026-05-22): managers should be able to ask
// for prescriptive advice without an actual ECHO result. This client lets
// the user assert the subject's profile directly (from the 41-profile
// catalog) and generate a briefing.
//
// Flow:
//   1. Subject form (name, role, profile, optional backstory, optional
//      recent context) + meeting form (purpose, top of mind, desired
//      outcome, recent context additions, private context).
//   2. POST to /api/laas/v1/prep with subject.type === "adhoc".
//   3. Render the briefing inline.
//
// Persistence: ad-hoc briefings are NOT persisted as BriefingDocs by the
// backend — they're transient by design. Only the audit row records the
// generation.
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import type { Briefing, MeetingPurpose } from "@/lib/lq-engine";
import { readManagerProfile } from "@/lib/client/manager-profile";

const PURPOSES: MeetingPurpose[] = [
  "1:1 check-in",
  "feedback",
  "coaching",
  "planning",
  "difficult conversation",
];

interface CatalogEntry {
  code: string;
  name: string;
  dominanceType: "single" | "dual" | "triple" | "non_dominant";
}

interface Props {
  catalog: CatalogEntry[];
}

const RECENT_CONTEXT_ADDITIONS_LIMIT = 2000;
const PRIVATE_CONTEXT_LIMIT = 1000;

export default function AdhocPrepClient({ catalog }: Props) {
  // -- subject state --
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [profileCode, setProfileCode] = useState("");
  const [backstory, setBackstory] = useState("");
  const [recentContext, setRecentContext] = useState("");

  // -- meeting state --
  const [purpose, setPurpose] = useState<MeetingPurpose>("1:1 check-in");
  const [topOfMind, setTopOfMind] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [recentContextAdditions, setRecentContextAdditions] = useState("");
  const [privateContext, setPrivateContext] = useState("");

  // -- flow state --
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && profileCode && !loading;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setBriefing(null);
    try {
      const manager = readManagerProfile();
      const res = await fetch("/api/laas/v1/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: {
            type: "adhoc",
            name: name.trim(),
            role: role.trim(),
            profileCode,
            backstory: backstory.trim(),
            recentContext: recentContext.trim(),
          },
          meeting: {
            purpose,
            topOfMind,
            desiredOutcome,
            recentContextAdditions: recentContextAdditions.trim(),
          },
          ...(manager ? { manager: { code: manager.code } } : {}),
          private: { context: privateContext.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to generate briefing");
      }
      setBriefing(data.briefing as Briefing);
      setProvider(data.generated?.by as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setBriefing(null);
    setProvider(null);
    setError(null);
  }

  if (briefing) {
    return <BriefingView briefing={briefing} provider={provider} purpose={purpose} subjectName={name} onReset={reset} />;
  }

  // Group catalog by dominance for the <select> optgroups
  const grouped: Record<string, CatalogEntry[]> = {
    single: [],
    dual: [],
    triple: [],
    non_dominant: [],
  };
  for (const e of catalog) grouped[e.dominanceType].push(e);

  return (
    <main>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>←</span> Roster
      </Link>

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">
          Ad-hoc subject
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink-900">
          Prep for someone outside the roster
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Use this when you don&apos;t have an ECHO result on file — for example, a client meeting where you have a strong hunch about how they listen.
        </p>
      </header>

      <form className="space-y-6" onSubmit={generate}>
        <section className="rounded-2xl bg-canvas-card p-5 ring-1 ring-ink-100">
          <h2 className="font-display text-lg text-ink-900">About the person</h2>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="adhoc-name" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Name <span className="text-red-700">*</span>
              </label>
              <input
                id="adhoc-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. Riley Chen"
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>

            <div>
              <label htmlFor="adhoc-role" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Role / title
              </label>
              <input
                id="adhoc-role"
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. VP Engineering at AcmeCorp"
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>

            <div>
              <label htmlFor="adhoc-profile" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                What&apos;s your read on their listening profile? <span className="text-red-700">*</span>
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                Pick the catalog entry that best matches how this person tends to listen, based on your prior interactions. Confidence will display as 100% because you&apos;re asserting it directly.
              </p>
              <select
                id="adhoc-profile"
                value={profileCode}
                onChange={e => setProfileCode(e.target.value)}
                required
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 focus:outline-none focus:ring-2 focus:ring-ink-900"
              >
                <option value="" disabled>— Choose a profile —</option>
                <optgroup label="Single-dominant (one habit drives)">
                  {grouped.single.map(e => (
                    <option key={e.code} value={e.code}>{e.name} ({e.code})</option>
                  ))}
                </optgroup>
                <optgroup label="Dual-dominant (two habits in balance)">
                  {grouped.dual.map(e => (
                    <option key={e.code} value={e.code}>{e.name} ({e.code})</option>
                  ))}
                </optgroup>
                <optgroup label="Triple-dominant (three habits in interplay)">
                  {grouped.triple.map(e => (
                    <option key={e.code} value={e.code}>{e.name} ({e.code})</option>
                  ))}
                </optgroup>
                <optgroup label="Non-dominant (Flexer)">
                  {grouped.non_dominant.map(e => (
                    <option key={e.code} value={e.code}>{e.name} ({e.code})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label htmlFor="adhoc-backstory" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Backstory
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                Optional. Anything about who they are or what they care about that should shape the prep.
              </p>
              <textarea
                id="adhoc-backstory"
                value={backstory}
                onChange={e => setBackstory(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="e.g. Twenty years in pharma; spent the last decade on the supply-chain side. Skeptical of vendors who pitch before listening."
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>

            <div>
              <label htmlFor="adhoc-recent" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Recent context about them
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                Optional. Their current situation — quarter pressure, recent reorg, project they own.
              </p>
              <textarea
                id="adhoc-recent"
                value={recentContext}
                onChange={e => setRecentContext(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="e.g. Just took over a stalled vendor evaluation. CFO has asked for a recommendation by end of month."
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-canvas-card p-5 ring-1 ring-ink-100">
          <h2 className="font-display text-lg text-ink-900">About the meeting</h2>

          <div className="mt-4 space-y-5">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Meeting purpose
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PURPOSES.map(p => {
                  const selected = purpose === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={[
                        "rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition-colors",
                        selected
                          ? "bg-ink-900 text-canvas-base ring-ink-900"
                          : "bg-canvas-base text-ink-700 ring-ink-100 hover:ring-ink-300/60",
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="topOfMind" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                What&apos;s top of mind?
              </label>
              <textarea
                id="topOfMind"
                value={topOfMind}
                onChange={e => setTopOfMind(e.target.value)}
                rows={3}
                placeholder="e.g. Need to align on scope before the steering committee on Friday."
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>

            <div>
              <label htmlFor="desiredOutcome" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                What would a good outcome look like?
              </label>
              <textarea
                id="desiredOutcome"
                value={desiredOutcome}
                onChange={e => setDesiredOutcome(e.target.value)}
                rows={2}
                placeholder="e.g. Walk out with their commitment to one of the two proposed paths."
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>

            <div>
              <label htmlFor="recentAdds" className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                What&apos;s happened recently?
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
                Optional. Updates since the meeting was scheduled — include dates where they matter. Used for this briefing only.
              </p>
              <textarea
                id="recentAdds"
                value={recentContextAdditions}
                onChange={e => setRecentContextAdditions(e.target.value.slice(0, RECENT_CONTEXT_ADDITIONS_LIMIT))}
                rows={3}
                maxLength={RECENT_CONTEXT_ADDITIONS_LIMIT}
                placeholder={`e.g. "Tuesday (5/20) — got pushback from finance on the SLA proposal."`}
                className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
              />
            </div>

            <div className="rounded-xl bg-teal-50/50 p-4 ring-1 ring-teal-200/50">
              <label htmlFor="privateContext" className="text-[11px] font-semibold uppercase tracking-wider text-teal-800">
                Anything personal worth flagging?
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-teal-900/75">
                Optional. Sent to the AI to inform this briefing, then discarded. Not stored.
              </p>
              <textarea
                id="privateContext"
                value={privateContext}
                onChange={e => setPrivateContext(e.target.value.slice(0, PRIVATE_CONTEXT_LIMIT))}
                rows={3}
                maxLength={PRIVATE_CONTEXT_LIMIT}
                placeholder={`e.g. "Their partner is in the middle of a big career transition — they've mentioned being distracted."`}
                className="mt-2 block w-full rounded-lg bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-teal-200/60 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="block w-full rounded-xl bg-ink-900 px-4 py-3.5 text-sm font-semibold text-canvas-base transition-colors active:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating briefing…" : "Generate briefing"}
        </button>
      </form>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Briefing view — compact inline render for ad-hoc briefings.
// Mirrors the structure of MeetingPrepClient's BriefingView but flattened
// (no per-section collapse / expand-all controls) to keep the ad-hoc file
// self-contained. Future refactor: extract a shared BriefingView component.
// -----------------------------------------------------------------------------

function BriefingView({
  briefing,
  provider,
  purpose,
  subjectName,
  onReset,
}: {
  briefing: Briefing;
  provider: string | null;
  purpose: MeetingPurpose;
  subjectName: string;
  onReset: () => void;
}) {
  return (
    <main className="space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <span aria-hidden>←</span> Roster
      </Link>

      <div className="rounded-2xl bg-ink-900 px-5 py-5 text-canvas-base">
        <span className="inline-block rounded-full bg-canvas-base px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-900">
          {purpose}
        </span>
        <h2 className="mt-3 font-display text-2xl leading-tight">{subjectName || briefing.subjectName}</h2>
        <p className="mt-0.5 text-sm text-canvas-base/70">{briefing.subjectRole}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          {briefing.archetypeName && (
            <span className="text-xs text-canvas-base/75">
              Listening like {briefing.archetypeName}
            </span>
          )}
          <span className="font-mono text-[10px] text-canvas-base/55">
            {briefing.hierarchyDisplay}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-canvas-base/55">
          Ad-hoc subject — profile asserted, not assessed.
          {provider === "demo-fallback" && " · Demo mode — Vertex AI live key not detected."}
        </p>
      </div>

      <Section label="SCAN · your self-check" body={briefing.sense} />
      <Section label="SCAN · anticipate them" body={briefing.connect} />
      <Section label="SCAN · adjust yourself" body={briefing.adjust} />
      <Section label="SCAN · center of the wheel" body={briefing.navigate} />
      <Section label="Suggested opening" body={`"${briefing.suggestedOpening}"`} />
      <SectionList label="What to listen for" tone="highlight" items={briefing.whatToListenFor} />
      <SectionList label="Pitfalls to avoid" tone="warn" items={briefing.pitfallsToAvoid} />
      <SectionList label="Tailored phrases" items={briefing.tailoredPhrases} quote />
      <SectionList label="Questions to ask" items={briefing.questionsToAsk} quote />
      <Section label="Closing move" body={briefing.closingMove} />

      <button
        type="button"
        onClick={onReset}
        className="mt-3 block w-full rounded-xl bg-canvas-card px-4 py-3 text-sm font-medium text-ink-700 ring-1 ring-ink-100 transition-colors hover:ring-ink-300/60"
      >
        ← Start over
      </button>
    </main>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <article className="rounded-2xl bg-canvas-card px-5 py-4 ring-1 ring-ink-100">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-300">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{body}</p>
    </article>
  );
}

function SectionList({
  label,
  items,
  tone,
  quote,
}: {
  label: string;
  items: string[];
  tone?: "warn" | "highlight";
  quote?: boolean;
}) {
  const container = [
    "rounded-2xl px-5 py-4 ring-1",
    tone === "warn" && "bg-amber-50/70 ring-amber-200/60",
    tone === "highlight" && "bg-teal-50/70 ring-teal-300/60",
    !tone && "bg-canvas-card ring-ink-100",
  ].filter(Boolean).join(" ");
  const labelClass = [
    "text-[10px] font-bold uppercase tracking-[0.22em]",
    tone === "warn" && "text-amber-700",
    tone === "highlight" && "text-teal-700",
    !tone && "text-ink-300",
  ].filter(Boolean).join(" ");
  const liClass = [
    "text-sm leading-relaxed",
    tone === "warn" && "text-amber-900",
    tone === "highlight" && "text-teal-900",
    !tone && "text-ink-700",
    quote && "before:mr-1 before:font-display before:text-ink-300 before:content-['“'] after:font-display after:text-ink-300 after:content-['”']",
  ].filter(Boolean).join(" ");

  return (
    <article className={container}>
      <p className={labelClass}>{label}</p>
      <ul className="mt-1.5 space-y-2">
        {items.map((it, i) => (
          <li key={i} className={liClass}>{it}</li>
        ))}
      </ul>
    </article>
  );
}
