// =============================================================================
// SEEDED EMPLOYEE ROSTER — v0.6 (Allison SME-driven expansion, 2026-05-22)
// -----------------------------------------------------------------------------
// Phase 1 stand-in for what will eventually be a connection to the real
// ECHO assessment results stored in the LQ system. Each entry has an
// authored set of habit scores chosen to produce a specific catalog match
// and dominance type — so the live roster demonstrates ALL four dominance
// behaviors (single / dual / triple / non-dominant) for QA.
//
// Score-tuning notes (engine v0.6 thresholds):
//
//   SINGLE_GAP   = 15  → #1 must lead #2 by at least 15 to be "single"
//   DUAL_GAP     = 15  → #2 must lead #3 by at least 15 to be "dual"
//   TRIPLE_GAP   = 15  → #3 must lead #4 by at least 15 to be "triple"
//   FLEXER_SPREAD = 10 → max-min < 10 across all four habits => Flexer
//
// Phase 2 plan: replace this file with a server-side fetch into the
// internal LQ data store. The Employee shape stays stable.
// =============================================================================

import type { HabitScores } from "@/lib/lq-engine";

export interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** A short backstory the LLM can use to color the briefing. */
  backstory: string;
  /** Recent context — what's currently going on for this person. */
  recentContext: string;
  /** Authored ECHO-style scores, 0–100 per habit. */
  scores: HabitScores;
  /** ISO date the assessment was taken (display only). */
  assessmentDate: string;
}

export const EMPLOYEES: Employee[] = [
  // =========================================================================
  // TRIPLE-DOMINANT (5) — original seed, scores re-tuned so the engine
  // correctly classifies them as triples under v0.6 thresholds.
  // =========================================================================

  {
    id: "maya-chen",
    name: "Maya Chen",
    role: "Operations Manager, Client Services",
    initials: "MC",
    backstory:
      "Eight years at the company. Came up through customer success, runs a team of 11. Known for getting things across the finish line and for being the first to ask 'who else is affected by this?'.",
    recentContext:
      "Her team just absorbed two members from a sunsetted product line. She's juggling re-onboarding while delivery commitments hold steady.",
    // Target: triple "The Developer" (CV-AL-RV). Top 3 close, CL clear shadow.
    scores: { CV: 82, AL: 76, RV: 68, CL: 22 },
    assessmentDate: "2026-02-14",
  },

  {
    id: "devon-park",
    name: "Devon Park",
    role: "Senior Software Engineer, Platform",
    initials: "DP",
    backstory:
      "Nine years on platform infrastructure. The team's go-to for incident reviews. Quietly authoritative. Will sit through a long meeting and say one thing at the end that reframes the entire decision.",
    recentContext:
      "Just finished a six-month migration. Has been quietly skeptical of the leadership push toward a new framework but hasn't said so directly.",
    // Target: triple "The Inventor" (AL-RV-CL). Top 3 close, CV clear shadow.
    scores: { AL: 85, RV: 76, CL: 68, CV: 22 },
    assessmentDate: "2026-01-22",
  },

  {
    id: "priya-iyer",
    name: "Priya Iyer",
    role: "Product Strategist",
    initials: "PI",
    backstory:
      "Joined 18 months ago from a consulting background. Hired specifically to bring outside-in thinking. Comfortable with ambiguity, slower to commit until she's seen the pattern from multiple angles.",
    recentContext:
      "Owns the discovery work for a new market segment. Stakeholders are asking for a recommendation she doesn't think the data supports yet.",
    // Target: triple "The Pragmatist" (CL-RV-AL). Top 3 close, CV clear shadow.
    scores: { CL: 81, RV: 74, AL: 67, CV: 28 },
    assessmentDate: "2026-03-03",
  },

  {
    id: "marcus-okafor",
    name: "Marcus Okafor",
    role: "Marketing Lead, Growth",
    initials: "MO",
    backstory:
      "Promoted into the role nine months ago. High energy, bias to action, runs the team on weekly experiments. Loves big-swing campaigns; less interested in the post-mortem deck.",
    recentContext:
      "His Q1 campaign exceeded acquisition targets but missed retention by a wide margin. Hasn't yet acknowledged the retention gap publicly.",
    // Target: triple "The Mover" (CV-RV-CL). Top 3 close, AL clear shadow.
    scores: { CV: 79, RV: 68, CL: 64, AL: 30 },
    assessmentDate: "2026-02-28",
  },

  {
    id: "jordan-reyes",
    name: "Jordan Reyes",
    role: "Senior Research Analyst",
    initials: "JR",
    backstory:
      "PhD in behavioral economics. Twelve years in the org. Treats meetings as a second-best medium — prefers a good document. Will go silent for ten minutes and then deliver the most thorough answer in the room.",
    recentContext:
      "Has been pulled into more cross-functional reviews than usual. Body language in the last two has read as withdrawn.",
    // Target: triple "The Synthesizer" (RV-AL-CL). Top 3 close, CV clear shadow.
    scores: { RV: 82, AL: 73, CL: 67, CV: 26 },
    assessmentDate: "2026-01-09",
  },

  // =========================================================================
  // SINGLE-DOMINANT (2) — one habit clearly drives. Tile shows 1 chip + shadow.
  // =========================================================================

  {
    id: "sienna-aoki",
    name: "Sienna Aoki",
    role: "People Operations Lead",
    initials: "SA",
    backstory:
      "Three years in HR before this role; came in to professionalize the function. Builds rapport instantly; remembers who is going through what; runs every all-hands as if it were a 1:1 with 200 people.",
    recentContext:
      "Just finished launching the new benefits package. Now turning her attention to a stalled engagement-survey rollout — early read suggests low trust in the engineering org.",
    // Target: single "The Connector" (CV). CV >> other three, which are bunched.
    scores: { CV: 86, RV: 44, AL: 42, CL: 38 },
    assessmentDate: "2026-03-15",
  },

  {
    id: "tomas-herrera",
    name: "Tomás Herrera",
    role: "Senior Financial Analyst",
    initials: "TH",
    backstory:
      "Seven years in finance — three at a Big Four, four here. Builds the models the leadership team plans the year around. Skeptical of round numbers and surprise asks; trusted because his variances are tight.",
    recentContext:
      "Defending the Q3 reforecast in front of the CFO next week. One major customer renewal is wobbling and he wants a sensitivity-analysis discussion, not a what-if narrative.",
    // Target: single "The Scrutinizer" (AL). AL >> others, which are bunched.
    scores: { AL: 84, CL: 42, RV: 40, CV: 36 },
    assessmentDate: "2026-02-02",
  },

  // =========================================================================
  // DUAL-DOMINANT (3) — two habits in balance, then a clear drop. Tile shows
  // 2 chips + shadow.
  // =========================================================================

  {
    id: "kenji-brooks",
    name: "Kenji Brooks",
    role: "Head of Talent Development",
    initials: "KB",
    backstory:
      "Came into the org from an executive-coaching practice. Runs the leadership development curriculum. Will lean back in a meeting and ask the question everyone was thinking but no one had named — and won't let you escape it.",
    recentContext:
      "Two of his program participants have raised concerns about the same VP. He's preparing how to surface the pattern with the VP directly without naming sources.",
    // Target: dual "The Interactor" (CV-RV). CV and RV close, then drop.
    scores: { CV: 80, RV: 76, AL: 42, CL: 30 },
    assessmentDate: "2026-03-28",
  },

  {
    id: "aliyah-sokolova",
    name: "Aliyah Sokolova",
    role: "Principal Architect, Infrastructure",
    initials: "AS",
    backstory:
      "Eleven years in distributed systems, the last five here. Authors the system-design docs everyone references. Pushes back hard on hand-wavy proposals; equally happy at the whiteboard or in a 200-page RFC.",
    recentContext:
      "Reviewing a proposal from a partner team to add a new service to the critical path. She thinks it duplicates an existing capability and is preparing a counter-design.",
    // Target: dual "The Designer" (AL-CL). AL and CL close, then drop.
    scores: { AL: 83, CL: 78, RV: 44, CV: 32 },
    assessmentDate: "2026-02-21",
  },

  {
    id: "henrik-lindqvist",
    name: "Henrik Lindqvist",
    role: "Director of Strategic Planning",
    initials: "HL",
    backstory:
      "Came up through corporate strategy at two prior firms. Quiet, considered, allergic to false certainty. The CEO routes the hardest framing questions to him because his answers age well.",
    recentContext:
      "Drafting the 2027 planning narrative. He thinks the leadership team's stated theme is too narrow and is preparing an alternative framing that re-opens decisions some have already declared closed.",
    // Target: dual "The Contemplator" (CL-RV). CL and RV close, then drop.
    scores: { CL: 81, RV: 75, AL: 42, CV: 36 },
    assessmentDate: "2026-01-18",
  },

  // =========================================================================
  // NON-DOMINANT (1) — The Flexer. All four habits roughly equal; no shadow.
  // Tile shows 4 chips, no shadow chip.
  // =========================================================================

  {
    id: "naomi-brennan",
    name: "Naomi Brennan",
    role: "Chief of Staff to the COO",
    initials: "NB",
    backstory:
      "Two years in this role after a winding career — consulting, then a startup ops job, then a fellowship in public policy. Reads the room differently every time; reframes mid-sentence; reads everyone. Hard to predict, easy to follow.",
    recentContext:
      "Running point on a cross-org initiative that needs buy-in from finance, legal, product, and engineering. Each conversation she enters this week will need a different listening posture.",
    // Target: non-dominant "The Flexer". All four within 6 points.
    scores: { CV: 64, RV: 68, AL: 66, CL: 62 },
    assessmentDate: "2026-04-04",
  },
];

export function getEmployeeById(id: string): Employee | undefined {
  return EMPLOYEES.find(e => e.id === id);
}
