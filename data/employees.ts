// =============================================================================
// SEEDED EMPLOYEE ROSTER
// -----------------------------------------------------------------------------
// Phase 1 stand-in for what will eventually be a connection to the real
// ECHO assessment results stored in the LQ system. Each entry has an
// authored set of habit scores chosen to span the four habits as
// primaries and exercise multiple archetypes.
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
  {
    id: "maya-chen",
    name: "Maya Chen",
    role: "Operations Manager, Client Services",
    initials: "MC",
    backstory:
      "Eight years at the company. Came up through customer success, runs a team of 11. Known for getting things across the finish line and for being the first to ask 'who else is affected by this?'.",
    recentContext:
      "Her team just absorbed two members from a sunsetted product line. She's juggling re-onboarding while delivery commitments hold steady.",
    scores: { CV: 84, AL: 71, RV: 42, CL: 24 },
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
    scores: { AL: 88, RV: 76, CL: 38, CV: 22 },
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
    scores: { RV: 82, AL: 73, CL: 49, CV: 26 },
    assessmentDate: "2026-01-09",
  },
];

export function getEmployeeById(id: string): Employee | undefined {
  return EMPLOYEES.find(e => e.id === id);
}
