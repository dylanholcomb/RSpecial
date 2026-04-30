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
    return (
      <BriefingView
        briefing={briefing}
        provider={provider}
        purpose={purpose}
        onReset={reset}
      />
    );
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
  purpose,
  onReset,
}: {
  briefing: Briefing;
  provider: string | null;
  purpose: MeetingPurpose;
  onReset: () => void;
}) {
  // Track which sections are open. All collapsed by default — manager taps in
  // for the section they want during the 5 minutes before the meeting.
  const [openSection, setOpenSection] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenSection(prev => (prev === id ? null : id));
  }

  function expandAll() {
    setOpenSection("__all__");
  }

  function collapseAll() {
    setOpenSection(null);
  }

  const isOpen = (id: string) => openSection === id || openSection === "__all__";

  return (
    <section className="mt-6 space-y-3">
      {/* Header card — meeting purpose at the top, prominent. */}
      <div className="rounded-2xl bg-ink-900 px-5 py-5 text-canvas-base">
        <span className="inline-block rounded-full bg-canvas-base px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-900">
          {purpose}
        </span>
        <h2 className="mt-3 font-display text-2xl leading-tight">{briefing.subjectName}</h2>
        <p className="mt-0.5 text-sm text-canvas-base/70">{briefing.subjectRole}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {briefing.archetypeName && (
            <span className="text-sm font-semibold text-canvas-base/90">
              {briefing.archetypeName}
            </span>
          )}
          <span className="font-mono text-xs text-canvas-base/70">
            {briefing.hierarchyDisplay}
          </span>
        </div>
        {provider === "demo-fallback" && (
          <p className="mt-3 inline-block rounded-full bg-canvas-base/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
            Demo mode — set ANTHROPIC_API_KEY for live generation
          </p>
        )}
      </div>

      {/* Expand / collapse all toggle */}
      <div className="flex items-center justify-end gap-3 px-1 pt-1">
        <button
          type="button"
          onClick={expandAll}
          className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 transition-colors hover:text-ink-900"
        >
          Expand all
        </button>
        <span className="text-ink-300">·</span>
        <button
          type="button"
          onClick={collapseAll}
          className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 transition-colors hover:text-ink-900"
        >
          Collapse all
        </button>
      </div>

      {/* SCAN sections — each independently collapsible */}
      <Section
        id="sense"
        eyebrow="SCAN"
        label="Sense"
        open={isOpen("sense")}
        onToggle={() => toggle("sense")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.sense}</p>
      </Section>

      <Section
        id="connect"
        eyebrow="SCAN"
        label="Connect"
        open={isOpen("connect")}
        onToggle={() => toggle("connect")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.connect}</p>
      </Section>

      <Section
        id="adjust"
        eyebrow="SCAN"
        label="Adjust"
        open={isOpen("adjust")}
        onToggle={() => toggle("adjust")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.adjust}</p>
      </Section>

      <Section
        id="navigate"
        eyebrow="SCAN"
        label="Navigate"
        open={isOpen("navigate")}
        onToggle={() => toggle("navigate")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.navigate}</p>
      </Section>

      <Section
        id="opening"
        label="Suggested opening"
        open={isOpen("opening")}
        onToggle={() => toggle("opening")}
      >
        <p className="text-sm leading-relaxed text-ink-700 before:mr-1 before:font-display before:text-ink-300 before:content-['“'] after:font-display after:text-ink-300 after:content-['”']">
          {briefing.suggestedOpening}
        </p>
      </Section>

      <Section
        id="pitfalls"
        label="Pitfalls to avoid"
        open={isOpen("pitfalls")}
        onToggle={() => toggle("pitfalls")}
        tone="warn"
      >
        <ul className="space-y-2.5">
          {briefing.pitfallsToAvoid.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-amber-900">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="phrases"
        label="Tailored phrases"
        open={isOpen("phrases")}
        onToggle={() => toggle("phrases")}
      >
        <ul className="space-y-2.5">
          {briefing.tailoredPhrases.map((item, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed text-ink-700 before:mr-2 before:font-display before:text-ink-300 before:content-['“'] after:font-display after:text-ink-300 after:content-['”']"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="questions"
        label="Questions to ask"
        open={isOpen("questions")}
        onToggle={() => toggle("questions")}
      >
        <ul className="space-y-2.5">
          {briefing.questionsToAsk.map((item, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed text-ink-700 before:mr-2 before:font-display before:text-ink-300 before:content-['“'] after:font-display after:text-ink-300 after:content-['”']"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="listen"
        label="What to listen for"
        open={isOpen("listen")}
        onToggle={() => toggle("listen")}
      >
        <ul className="space-y-2.5">
          {briefing.whatToListenFor.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-ink-700">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="close"
        label="Closing move"
        open={isOpen("close")}
        onToggle={() => toggle("close")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.closingMove}</p>
      </Section>

      <button
        type="button"
        onClick={onReset}
        className="mt-3 block w-full rounded-xl bg-canvas-card px-4 py-3 text-sm font-medium text-ink-700 ring-1 ring-ink-100 transition-colors hover:ring-ink-300/60"
      >
        ← Start over
      </button>
    </section>
  );
}

/**
 * Collapsible section card. Header is always visible and tappable; body
 * shows when `open` is true. Optional `eyebrow` shows a small label above
 * the section name (e.g. "SCAN" for the four SCAN sections).
 */
function Section({
  id,
  eyebrow,
  label,
  open,
  onToggle,
  tone,
  children,
}: {
  id: string;
  eyebrow?: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  tone?: "warn";
  children: React.ReactNode;
}) {
  const containerClass = [
    "overflow-hidden rounded-2xl ring-1",
    tone === "warn"
      ? "bg-amber-50/70 ring-amber-200/60"
      : "bg-canvas-card ring-ink-100",
  ].join(" ");

  const eyebrowClass = [
    "text-[10px] font-bold uppercase tracking-[0.22em]",
    tone === "warn" ? "text-amber-700" : "text-ink-300",
  ].join(" ");

  const labelClass = [
    "font-display text-base leading-tight",
    tone === "warn" ? "text-amber-900" : "text-ink-900",
  ].join(" ");

  const chevronClass = [
    "shrink-0 transition-transform duration-200",
    open ? "rotate-180" : "rotate-0",
    tone === "warn" ? "text-amber-700" : "text-ink-300",
  ].join(" ");

  return (
    <article id={id} className={containerClass}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left active:bg-black/5"
      >
        <div className="min-w-0">
          {eyebrow && <p className={eyebrowClass}>{eyebrow}</p>}
          <p className={labelClass}>{label}</p>
        </div>
        <svg
          className={chevronClass}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </article>
  );
}
