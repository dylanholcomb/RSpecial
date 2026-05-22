"use client";

// =============================================================================
// MeetingPrepClient — v0.5 (private session context, 2026-05-16)
// -----------------------------------------------------------------------------
// New in v0.5: a fourth form field — "Anything personal worth flagging?" —
// that lets the manager add sensitive context (fertility, illness, family
// stress, divorce, etc.) which informs the AI's briefing but is NEVER
// persisted. The promise is:
//
//   • The field content is sent to Vertex AI to inform this single briefing.
//   • It is then discarded — never written to the employee's record, never
//     written to the briefing document, never written to the audit log.
//   • The audit log records only the FACT that private context was used
//     (privateContextUsed: true), not the content.
//   • Vertex AI operates under an enterprise no-training contract.
//
// Visual treatment: the field has a slightly tonal-shifted background (soft
// teal tint) to feel like a "safe space" without being alarming. A small
// privacy badge with a lock glyph sits below the field. Field is optional
// and starts collapsed-feeling (no required indicator).
//
// Carryover from v0.4 (Allison's SME corrections):
//
//   1. SCAN cycle banner above the four SCAN cards (wheel, not checklist).
//   2. "What to listen for" promoted to prime real estate (teal-highlighted,
//      open by default).
//   3. Header de-emphasizes archetype as identity ("snapshot, not label").
//   4. Multi-section open state.
//   5. Navigate card has "Center of the wheel" sublabel.
// =============================================================================

import { useState } from "react";
import type { Briefing, MeetingPurpose } from "@/lib/lq-engine";
import { readManagerProfile } from "@/lib/client/manager-profile";

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

// Character ceiling for the private-context field. Generous enough for a
// meaningful note with dates, tight enough to discourage dumping a whole
// case file into the prompt.
const PRIVATE_CONTEXT_LIMIT = 1000;

// Character ceiling for the recent-context additions. Generous enough for
// several dated notes; tight enough that we're not sending arbitrarily long
// blobs to the LLM.
const RECENT_CONTEXT_ADDITIONS_LIMIT = 2000;

export default function MeetingPrepClient({ employeeId, employeeFirstName }: Props) {
  const [purpose, setPurpose] = useState<MeetingPurpose>("1:1 check-in");
  const [topOfMind, setTopOfMind] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [recentContextAdditions, setRecentContextAdditions] = useState("");
  const [privateContext, setPrivateContext] = useState("");
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
      // Call the LaaS v1 endpoint directly. The legacy /api/briefing route
      // still exists as a deprecated compat shim, but the web app uses the
      // versioned surface so it stays in lockstep with what the extension
      // and partners see.
      // Read the manager's profile choice from localStorage at request time
      // (not on render) so a user changing it in another tab takes effect on
      // their next briefing without a reload.
      const manager = readManagerProfile();
      const res = await fetch("/api/laas/v1/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: { type: "employee", employeeId },
          meeting: {
            purpose,
            topOfMind,
            desiredOutcome,
            recentContextAdditions: recentContextAdditions.trim(),
          },
          ...(manager ? { manager: { code: manager.code } } : {}),
          private: {
            // Trim before sending so whitespace-only entries are treated as
            // empty by the server (matches server-side behavior).
            context: privateContext.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // LaaS errors are structured: { error, message, details? }
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

        {/* Recent context additions — manager's dated updates for this
            conversation only. Not stored on the employee record (same
            persistence promise as private context). Less sensitive than
            private context, so styled with a soft neutral background and
            no privacy badge. */}
        <RecentContextAdditionsField
          employeeFirstName={employeeFirstName}
          value={recentContextAdditions}
          onChange={setRecentContextAdditions}
        />

        {/* Private session context — sensitive content that informs the AI
            but is never persisted. Tonal-shifted background to feel like a
            safe space; privacy badge below the field. */}
        <PrivateContextField
          employeeFirstName={employeeFirstName}
          value={privateContext}
          onChange={setPrivateContext}
        />

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

// Ordered list of section IDs — used for expand-all logic and as the canonical
// ordering of the briefing surface.
const SECTION_IDS = [
  "scan-banner", // not actually collapsible; here for ordering reference
  "sense",
  "connect",
  "adjust",
  "navigate",
  "opening",
  "listen",  // PROMOTED: was near end; now right after Opening
  "pitfalls",
  "phrases",
  "questions",
  "close",
] as const;

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
  // "What to listen for" is open by default — it's the prime real estate per
  // Allison's framing. All other sections start collapsed.
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["listen"]),
  );

  function toggle(id: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    // Don't include "scan-banner" since it isn't collapsible.
    const collapsibleIds = SECTION_IDS.filter(id => id !== "scan-banner");
    setOpenSections(new Set(collapsibleIds));
  }

  function collapseAll() {
    setOpenSections(new Set());
  }

  const isOpen = (id: string) => openSections.has(id);

  return (
    <section className="mt-6 space-y-3">
      {/* Header card — meeting purpose at top, archetype DE-EMPHASIZED. */}
      <div className="rounded-2xl bg-ink-900 px-5 py-5 text-canvas-base">
        <span className="inline-block rounded-full bg-canvas-base px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-900">
          {purpose}
        </span>
        <h2 className="mt-3 font-display text-2xl leading-tight">{briefing.subjectName}</h2>
        <p className="mt-0.5 text-sm text-canvas-base/70">{briefing.subjectRole}</p>

        {/* Archetype + hierarchy: smaller, more subtle. */}
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

        {/* Anti-pigeonholing nudge — woven into the header itself. */}
        <p className="mt-2 text-[11px] leading-relaxed text-canvas-base/55">
          Profile snapshot. Listening intelligence is a skill that develops with practice.
        </p>

        {provider === "demo-fallback" && (
          <p className="mt-3 inline-block rounded-full bg-canvas-base/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
            Demo mode — Vertex AI live key not detected
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

      {/* SCAN cycle banner — frames the four SCAN cards that follow as a wheel,
          not a sequence. Not collapsible; always visible. */}
      <ScanCycleBanner />

      {/* SCAN sections */}
      <Section
        id="sense"
        eyebrow="SCAN · your self-check"
        label="Sense"
        open={isOpen("sense")}
        onToggle={() => toggle("sense")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.sense}</p>
      </Section>

      <Section
        id="connect"
        eyebrow="SCAN · anticipate them"
        label="Connect"
        open={isOpen("connect")}
        onToggle={() => toggle("connect")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.connect}</p>
      </Section>

      <Section
        id="adjust"
        eyebrow="SCAN · adjust yourself"
        label="Adjust"
        open={isOpen("adjust")}
        onToggle={() => toggle("adjust")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.adjust}</p>
      </Section>

      <Section
        id="navigate"
        eyebrow="SCAN · center of the wheel"
        label="Navigate"
        sublabel="Return here when the conversation calls for fresh perspective."
        open={isOpen("navigate")}
        onToggle={() => toggle("navigate")}
      >
        <p className="text-sm leading-relaxed text-ink-700">{briefing.navigate}</p>
      </Section>

      {/* In-the-room block */}
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

      {/* PROMOTED: What to listen for is the prime real estate, with highlight
          treatment, sits right after Opening, opens by default. */}
      <Section
        id="listen"
        label="What to listen for"
        sublabel="The most important section. Listen first; speak second."
        tone="highlight"
        open={isOpen("listen")}
        onToggle={() => toggle("listen")}
      >
        <ul className="space-y-2.5">
          {briefing.whatToListenFor.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed text-teal-900">
              {item}
            </li>
          ))}
        </ul>
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
 * Optional "what's happened recently" field — dated updates the manager
 * wants this briefing to factor in. NOT persisted (same promise as
 * privateContext). Visually lighter than PrivateContextField — this is
 * not sensitive, just situational. The placeholder coaches the user to
 * include dates so the LLM can weight recency.
 */
function RecentContextAdditionsField({
  employeeFirstName,
  value,
  onChange,
}: {
  employeeFirstName: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const remaining = RECENT_CONTEXT_ADDITIONS_LIMIT - value.length;
  const overLimit = remaining < 0;

  return (
    <div>
      <label
        htmlFor="recentContextAdditions"
        className="text-[11px] font-semibold uppercase tracking-wider text-ink-500"
      >
        What's happened recently?
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">
        Optional. Updates since the meeting was scheduled — used for this
        briefing only, not added to {employeeFirstName}'s record. Include
        dates where they matter — &ldquo;last Wednesday,&rdquo; &ldquo;since
        March 2026.&rdquo;
      </p>
      <textarea
        id="recentContextAdditions"
        value={value}
        onChange={e => onChange(e.target.value.slice(0, RECENT_CONTEXT_ADDITIONS_LIMIT))}
        rows={3}
        maxLength={RECENT_CONTEXT_ADDITIONS_LIMIT}
        placeholder={`e.g. "Tuesday (5/20) — got pushback from finance on the SLA proposal." Or "Since March — leading the new cross-team workstream."`}
        className="mt-2 block w-full rounded-xl bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-ink-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900"
      />
      <div className="mt-1.5 flex justify-end">
        <p
          className={[
            "text-[10px] tabular-nums",
            overLimit ? "text-red-700" : "text-ink-300",
          ].join(" ")}
          aria-live="polite"
        >
          {value.length} / {RECENT_CONTEXT_ADDITIONS_LIMIT}
        </p>
      </div>
    </div>
  );
}

/**
 * Optional sensitive-context field. The visual promise is the feature:
 * tonal-shifted background (soft teal — same family as the "what to listen
 * for" highlight, signaling care), explicit copy about non-persistence, and
 * a small privacy badge below.
 *
 * Wording is canonical per the UX spec (ux-spec-private-context.md). Edits
 * to the user-facing language should land here and in the spec together.
 */
function PrivateContextField({
  employeeFirstName,
  value,
  onChange,
}: {
  employeeFirstName: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const remaining = PRIVATE_CONTEXT_LIMIT - value.length;
  const overLimit = remaining < 0;

  return (
    <div className="rounded-xl bg-teal-50/50 p-4 ring-1 ring-teal-200/50">
      <label
        htmlFor="privateContext"
        className="text-[11px] font-semibold uppercase tracking-wider text-teal-800"
      >
        Anything personal worth flagging?
      </label>
      <p className="mt-1 text-[11px] leading-relaxed text-teal-900/75">
        Optional. Sent to the AI to inform this briefing, then discarded. Not stored
        on {employeeFirstName}'s record or anywhere else in the system. Include
        dates where they matter — &ldquo;since March 2026,&rdquo; &ldquo;last
        Tuesday,&rdquo; etc.
      </p>
      <textarea
        id="privateContext"
        value={value}
        onChange={e => onChange(e.target.value.slice(0, PRIVATE_CONTEXT_LIMIT))}
        rows={3}
        maxLength={PRIVATE_CONTEXT_LIMIT}
        placeholder={`e.g. "Since March: ${employeeFirstName} and their partner have been trying to conceive. ${employeeFirstName} has hinted at this once or twice but doesn't bring it up directly."`}
        className="mt-2 block w-full rounded-lg bg-canvas-base px-3.5 py-3 text-sm text-ink-900 ring-1 ring-teal-200/60 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[10px] leading-snug text-teal-800/75">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          AI provider is contractually prevented from training on this data.
        </p>
        <p
          className={[
            "shrink-0 text-[10px] tabular-nums",
            overLimit ? "text-red-700" : "text-teal-800/60",
          ].join(" ")}
          aria-live="polite"
        >
          {value.length} / {PRIVATE_CONTEXT_LIMIT}
        </p>
      </div>
    </div>
  );
}

/**
 * Banner card that frames the four SCAN sections below as a cycle, not a
 * sequence. Not collapsible — always visible — because the framing is the
 * point. If the user can collapse it, they can forget the framing.
 */
function ScanCycleBanner() {
  return (
    <article className="overflow-hidden rounded-2xl bg-teal-50/60 px-5 py-4 ring-1 ring-teal-200/50">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 shrink-0 text-teal-700"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-9-9" />
          <polyline points="21 4 21 9 16 9" />
        </svg>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">
            How to use SCAN
          </p>
          <p className="mt-1 font-display text-base leading-tight text-teal-900">
            SCAN is a cycle, not a checklist.
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-teal-900/85">
            Return to Sense throughout the conversation as you adjust to what comes up. Navigate sits at the center — you'll return there whenever you need to invite a different perspective.
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Collapsible section card. Header is always visible and tappable; body
 * shows when `open` is true. Supports three tones: default (neutral),
 * "warn" (amber, used for pitfalls), and "highlight" (teal, used for
 * "what to listen for" to mark it as prime real estate).
 *
 * `sublabel` adds a small secondary line under the main label — used for
 * Navigate ("Center of the wheel...") and What to listen for ("The most
 * important section...").
 */
function Section({
  id,
  eyebrow,
  label,
  sublabel,
  open,
  onToggle,
  tone,
  children,
}: {
  id: string;
  eyebrow?: string;
  label: string;
  sublabel?: string;
  open: boolean;
  onToggle: () => void;
  tone?: "warn" | "highlight";
  children: React.ReactNode;
}) {
  const containerClass = [
    "overflow-hidden rounded-2xl ring-1",
    tone === "warn" && "bg-amber-50/70 ring-amber-200/60",
    tone === "highlight" && "bg-teal-50/70 ring-teal-300/60",
    !tone && "bg-canvas-card ring-ink-100",
  ].filter(Boolean).join(" ");

  const eyebrowClass = [
    "text-[10px] font-bold uppercase tracking-[0.22em]",
    tone === "warn" && "text-amber-700",
    tone === "highlight" && "text-teal-700",
    !tone && "text-ink-300",
  ].filter(Boolean).join(" ");

  const labelClass = [
    "font-display text-base leading-tight",
    tone === "warn" && "text-amber-900",
    tone === "highlight" && "text-teal-900",
    !tone && "text-ink-900",
  ].filter(Boolean).join(" ");

  const sublabelClass = [
    "mt-0.5 text-[11px] leading-snug",
    tone === "warn" && "text-amber-800/70",
    tone === "highlight" && "text-teal-800/75",
    !tone && "text-ink-500",
  ].filter(Boolean).join(" ");

  const chevronClass = [
    "shrink-0 transition-transform duration-200",
    open ? "rotate-180" : "rotate-0",
    tone === "warn" && "text-amber-700",
    tone === "highlight" && "text-teal-700",
    !tone && "text-ink-300",
  ].filter(Boolean).join(" ");

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
          {sublabel && <p className={sublabelClass}>{sublabel}</p>}
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
