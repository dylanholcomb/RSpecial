# LQ Meeting Prep — Phase 1 MVP

Mobile-first web app that prepares a manager for a 1:1 conversation using the
employee's Listening Intelligence (LQ™) profile, derived from the publicly
documented ECHO Listening Profile™ framework.

This is the **Phase 1** build:

- Real, working app — not a clickable prototype.
- Synthetic roster of 5 employees with authored ECHO-style profiles.
- Stub LQ engine that mirrors the public framework (Connective / Reflective /
  Analytical / Conceptual habits, primary → secondary → tertiary → shadow
  hierarchy, named archetypes, SCAN methodology).
- Live LLM generation via Anthropic when `ANTHROPIC_API_KEY` is set, with
  a templated fallback that runs without any key.

Phase 2 swap path is documented below.

---

## Run it locally

```
cd "/Users/ArchimedesX/Desktop/R Special/meeting-prep"
npm install
cp .env.example .env.local           # then add your API key, optional
npm run dev
```

Open http://localhost:3000.

Without an API key the app still works end-to-end via the templated demo
fallback. Set `ANTHROPIC_API_KEY` in `.env.local` to enable live LLM generation.

## Type-check / build

```
npm run typecheck
npm run build
```

---

## What's where

```
app/
  page.tsx                         # Roster (server component, runs engine)
  employee/[id]/
    page.tsx                       # Profile + snapshot (server)
    MeetingPrepClient.tsx          # Form + briefing display (client)
  api/briefing/route.ts            # Server route — engine + LLM call
  layout.tsx, globals.css

components/
  Avatar.tsx
  HabitChip.tsx

data/
  employees.ts                     # Seeded roster — replace in phase 2

lib/
  lq-engine/                       # === IP BOUNDARY ===
    index.ts                       # Public API (analyzeProfile + types)
    types.ts                       # EngineOutput, Briefing, etc.
    habits.ts                      # The four habits + metadata
    archetypes.ts                  # Named profile archetypes
    conflict.ts                    # Conflict pairings

  llm/
    types.ts                       # LLMProvider interface
    provider.ts                    # Factory — picks anthropic / demo / azure
    anthropic.ts                   # Anthropic implementation
    demo-fallback.ts               # Templated fallback
    prompt-builder.ts              # Builds prompt from engine output
    shape.ts                       # Briefing JSON parser + helpers
```

## The IP boundary

Everything inside `lib/lq-engine/` is the LQ logic surface area. The rest of
the app — the API route, the UI, the LLM prompt — only ever consumes
`EngineOutput`, the engine's structured response.

**The LLM never sees:**

- Raw assessment item responses.
- Scoring weights or rule code.
- Verbatim Mosaic-proprietary KB content.

**The LLM only ever sees:**

- The structured `EngineOutput` (habit hierarchy, archetype lookup, framings,
  shadow warning, conflict patterns).
- The manager's typed meeting context.

This boundary is enforced by the import graph: nothing under `app/` or
`lib/llm/` reaches into engine internals.

## Phase 2 swap (Mosaic / Azure)

Two changes to flip from phase-1 stub to phase-2 production:

1. **Replace the engine internals** in `lib/lq-engine/`:
   - `analyzeProfile()` calls into Mosaic's real KB instead of running the
     stub `rankHabits()` / `findArchetype()` logic.
   - The `EngineOutput` shape stays identical — no consumer changes needed.
   - The 41-profile catalogue replaces `archetypes.ts`.

2. **Add the Azure provider** in `lib/llm/`:
   - Create `lib/llm/azure-openai.ts` implementing the `LLMProvider`
     interface.
   - Wire it up in `lib/llm/provider.ts` (the file already has the
     placeholder branch).
   - Set `LLM_PROVIDER=azure` and the Azure env vars in production.

The UI, the API contract, and the prompt builder do not need to change.

## Notes on listening profile coverage

Phase 1 covers the named archetypes we have public reference data for:

- **The Resolver** — CV-RV-AL
- **The Mover** — CV-RV-CL
- **The Implementer** — CV-AL
- **The Developer** — CV-AL-RV
- **The Pragmatist** — CL-RV-AL
- **The Auditor** — AL-RV
- **The Producer** — AL-RV-CV

Profiles outside this set (e.g. an RV-primary like Jordan Reyes in the
seeded roster) fall back to a description constructed from habit metadata.
The full LQ catalogue of 41 profiles plugs in at phase 2.
