"use client";

// Client component that owns the meeting context form, the API call, and
// the rendering of the generated briefing.

import { useState } from "react";
import type { Briefing, MeetingPurpose } from "@/lib/lq-engine";

const PURPOSES: MeetingPurpose[] = [
  "1:1 check-in",
  "feedback",
  "coaching",
  "planning",
  "difficult conversation",
];

interface Props {
  employeeId: string;
  employeeFirstName: string;
}

export default function MeetingPrepClient({ employeeId, employeeFirstName }: Props) {
  const [purpose, setPurpose] = useState<MeetingPurpose>("1:1 check-in");
  const [topOfMind, setTopOfMind] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBriefing(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, purpose, topOfMind, desiredOutcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate briefing");
      }
      setBriefing(data.briefing as Briefing);
      setProvider(data.provider as string);
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
    return <BriefingView briefing={briefing} provider={provider} onReset={reset} />;
  }

  return (
    <section className="mt-6 rounded-2xl bg-canvas-card p-5 ring-1 ring-ink-100">
      <h2 className="font-display text-xl text-ink-900">Prep for the meeting</h2>
      <p className="mt-1 text-sm text-ink-500">
        Tell me what you want out of your conversation with {employeeFirstName}.
      </p>

      <form className="mt-5 space-y-5" onSubmit={generate}>
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
            What's top of mind?
          </label>
          <textarea
            id="topOfMind"
            value={topOfMind}
            onChange={e => setTopOfMind(e.target.value)}
            rows={3}
            placeholder="e.g. Q1 numbers came in below target on retention."
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
            placeholder="e.g. shared agreement on the next two experiments."
            className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="block w-full rounded-xl bg-ink-900 px-4 py-3.5 text-sm font-semibold text-canvas-base transition-colors active:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating briefing…" : "Generate briefing"}
        </button>
      </form>
    </section>
  );
}

function BriefingView({
  briefing,
  provider,
  onReset,
}: {
  briefing: Briefing;
  provider: string | null;
  onReset: () => void;
}) {
  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-2xl bg-ink-900 px-5 py-4 text-canvas-base">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-canvas-base/60">
          Briefing for
        </p>
        <h2 className="mt-0.5 font-display text-2xl">{briefing.subjectName}</h2>
        <p className="mt-0.5 text-sm text-canvas-base/70">{briefing.subjectRole}</p>
        <p className="mt-3 font-mono text-xs text-canvas-base/80">{briefing.hierarchyDisplay}</p>
        {provider === "demo-fallback" && (
          <p className="mt-3 inline-block rounded-full bg-canvas-base/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
            Demo mode — set ANTHROPIC_API_KEY for live generation
          </p>
        )}
      </div>

      <ScanCard label="Sense" body={briefing.sense} />
      <ScanCard label="Connect" body={briefing.connect} />
      <ScanCard label="Adjust" body={briefing.adjust} />
      <ScanCard label="Navigate" body={briefing.navigate} />

      <ListCard label="Pitfalls to avoid" items={briefing.pitfallsToAvoid} tone="warn" />

      <SingleLineCard label="Suggested opening" body={briefing.suggestedOpening} quote />

      <ListCard label="Tailored phrases" items={briefing.tailoredPhrases} quote />

      <ListCard label="Questions to ask" items={briefing.questionsToAsk} quote />

      <ListCard label="What to listen for" items={briefing.whatToListenFor} />

      <SingleLineCard label="Closing move" body={briefing.closingMove} />

      <button
        type="button"
        onClick={onReset}
        className="mt-2 block w-full rounded-xl bg-canvas-card px-4 py-3 text-sm font-medium text-ink-700 ring-1 ring-ink-100 transition-colors hover:ring-ink-300/60"
      >
        ← Start over
      </button>
    </section>
  );
}

function ScanCard({ label, body }: { label: string; body: string }) {
  return (
    <article className="rounded-2xl bg-canvas-card p-5 ring-1 ring-ink-100">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-300">SCAN</p>
      <p className="mt-1 font-display text-lg text-ink-900">{label}</p>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-700">{body}</p>
    </article>
  );
}

function ListCard({
  label,
  items,
  tone,
  quote,
}: {
  label: string;
  items: string[];
  tone?: "warn";
  quote?: boolean;
}) {
  return (
    <article
      className={[
        "rounded-2xl p-5 ring-1",
        tone === "warn"
          ? "bg-amber-50/70 ring-amber-200/60"
          : "bg-canvas-card ring-ink-100",
      ].join(" ")}
    >
      <p
        className={[
          "text-[10px] font-bold uppercase tracking-[0.22em]",
          tone === "warn" ? "text-amber-700" : "text-ink-300",
        ].join(" ")}
      >
        {label}
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className={[
              "text-sm leading-relaxed",
              tone === "warn" ? "text-amber-900" : "text-ink-700",
              quote ? "before:mr-2 before:font-display before:text-ink-300 before:content-['“'] after:font-display after:text-ink-300 after:content-['”']" : "",
            ].join(" ")}
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

function SingleLineCard({
  label,
  body,
  quote,
}: {
  label: string;
  body: string;
  quote?: boolean;
}) {
  return (
    <article className="rounded-2xl bg-canvas-card p-5 ring-1 ring-ink-100">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-300">{label}</p>
      <p
        className={[
          "mt-2.5 text-sm leading-relaxed text-ink-700",
          quote ? "before:mr-1 before:font-display before:text-ink-300 before:content-['“'] after:font-display after:text-ink-300 after:content-['”']" : "",
        ].join(" ")}
      >
        {body}
      </p>
    </article>
  );
}
