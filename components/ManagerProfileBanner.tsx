"use client";

// =============================================================================
// ManagerProfileBanner — "Your listening profile" picker (v0.6 / 2026-05-22)
// -----------------------------------------------------------------------------
// Per Allison SME guidance: SCAN done correctly uses BOTH parties' profiles.
// Sense (the manager's self-check) and Adjust (the manager's modulation)
// land better when the prompt knows who the manager is.
//
// Phase 1 sourcing: the user picks their profile from the 41-profile catalog
// once; the choice persists in localStorage under MANAGER_PROFILE_STORAGE_KEY
// and is sent on every prep request as `manager.code`. When unset, briefings
// fall back to generic Sense/Adjust framing (no behavior break).
//
// Phase 2+: when IAP is on and the authenticated user has a `profile` on
// their UserDoc, the backend will prefer that and ignore the client-side
// value. This component (and the storage key) will remain as an override
// path for the Chrome extension / partner integrations.
// =============================================================================

import { useEffect, useState } from "react";
import {
  MANAGER_PROFILE_STORAGE_KEY,
  type ManagerProfileChoice,
} from "@/lib/client/manager-profile";

interface CatalogEntry {
  code: string;
  name: string;
  dominanceType: "single" | "dual" | "triple" | "non_dominant";
}

interface Props {
  /** Full 41-profile catalog summary, passed in from the server component. */
  catalog: CatalogEntry[];
}

export function ManagerProfileBanner({ catalog }: Props) {
  const [choice, setChoice] = useState<ManagerProfileChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read localStorage on mount. Done in an effect so SSR + client agree.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANAGER_PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ManagerProfileChoice;
        if (parsed?.code) setChoice(parsed);
      }
    } catch {
      // localStorage may be disabled (private browsing). Treat as unset.
    } finally {
      setHydrated(true);
    }
  }, []);

  function persist(next: ManagerProfileChoice | null) {
    try {
      if (next) localStorage.setItem(MANAGER_PROFILE_STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(MANAGER_PROFILE_STORAGE_KEY);
    } catch {
      // ignore
    }
    setChoice(next);
  }

  // Pre-hydration: render a neutral placeholder so we don't flash an
  // unselected state on top of a selected one (or vice versa).
  if (!hydrated) {
    return (
      <div className="rounded-2xl bg-canvas-card p-4 ring-1 ring-ink-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">
          Your listening profile
        </p>
        <p className="mt-1 text-xs text-ink-500">Loading…</p>
      </div>
    );
  }

  if (!choice) {
    return (
      <div className="rounded-2xl bg-teal-50/60 p-4 ring-1 ring-teal-200/50">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 shrink-0 text-teal-700"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
              Personalize your briefings
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-teal-900">
              Set your own ECHO listening profile so the SCAN guidance grounds in your habits, not just the subject's.
            </p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-teal-700 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-teal-600"
            >
              Set your profile
            </button>
          </div>
        </div>
        {open && <Picker catalog={catalog} onPick={(c) => { persist(c); setOpen(false); }} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-canvas-card p-3 pl-4 pr-3 ring-1 ring-ink-100">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-300">
          Your listening profile
        </p>
        <p className="truncate text-sm font-semibold text-ink-900">
          {choice.name}
          <span className="ml-2 font-mono text-[10px] font-normal uppercase text-ink-500">
            {choice.code}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full bg-canvas-subtle px-3 py-1.5 text-[11px] font-medium text-ink-700 transition-colors hover:bg-ink-100"
      >
        Change
      </button>
      <button
        type="button"
        onClick={() => persist(null)}
        className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-ink-500 transition-colors hover:text-ink-900"
        aria-label="Clear your listening profile"
      >
        Clear
      </button>
      {open && <Picker catalog={catalog} current={choice.code} onPick={(c) => { persist(c); setOpen(false); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Picker modal — searchable list of all 41 profiles, grouped by dominance.
// -----------------------------------------------------------------------------

function Picker({
  catalog,
  current,
  onPick,
  onClose,
}: {
  catalog: CatalogEntry[];
  current?: string;
  onPick: (c: ManagerProfileChoice) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = catalog.filter(
    (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.code.toLowerCase().includes(q.toLowerCase()),
  );

  // Group by dominance for visual scanability.
  const grouped: Record<string, CatalogEntry[]> = { single: [], dual: [], triple: [], non_dominant: [] };
  for (const e of filtered) grouped[e.dominanceType].push(e);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick your listening profile"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-canvas-base shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-300">
              Pick your profile
            </p>
            <p className="text-base font-semibold text-ink-900">Your listening profile</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-500 transition-colors hover:bg-canvas-subtle hover:text-ink-900"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="border-b border-ink-100 px-5 py-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or code…"
            className="block w-full rounded-lg bg-canvas-subtle px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:bg-canvas-base focus:outline-none focus:ring-2 focus:ring-ink-900"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {(["single", "dual", "triple", "non_dominant"] as const).map((dom) => {
            const entries = grouped[dom];
            if (entries.length === 0) return null;
            return (
              <section key={dom} className="mb-3">
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  {DOM_LABEL[dom]}
                </p>
                <ul>
                  {entries.map((e) => (
                    <li key={e.code}>
                      <button
                        type="button"
                        onClick={() => onPick({ code: e.code, name: e.name })}
                        className={[
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          current === e.code
                            ? "bg-teal-50 ring-1 ring-teal-300"
                            : "hover:bg-canvas-subtle",
                        ].join(" ")}
                      >
                        <span className="text-sm font-medium text-ink-900">{e.name}</span>
                        <span className="font-mono text-[10px] uppercase text-ink-500">{e.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const DOM_LABEL: Record<CatalogEntry["dominanceType"], string> = {
  single: "Single-dominant",
  dual: "Dual-dominant",
  triple: "Triple-dominant",
  non_dominant: "Non-dominant (Flexer)",
};
