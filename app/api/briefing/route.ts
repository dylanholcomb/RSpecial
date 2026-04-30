// =============================================================================
// /api/briefing
// -----------------------------------------------------------------------------
// Server route that generates a manager briefing.
// Flow: incoming meeting context → look up employee → run lq-engine → build
// LLM prompt → call provider → return Briefing.
//
// The lq-engine internals never reach the LLM; only the structured
// EngineOutput is included in the prompt.
// =============================================================================

import { NextResponse } from "next/server";
import { analyzeProfile, type MeetingContext, type MeetingPurpose } from "@/lib/lq-engine";
import { getEmployeeById } from "@/data/employees";
import { getProvider } from "@/lib/llm/provider";

export const runtime = "nodejs";
// Always run fresh — briefings are personalized per request.
export const dynamic = "force-dynamic";

const ALLOWED_PURPOSES: MeetingPurpose[] = [
  "1:1 check-in",
  "feedback",
  "coaching",
  "planning",
  "difficult conversation",
];

interface BriefingRequest {
  employeeId?: unknown;
  purpose?: unknown;
  topOfMind?: unknown;
  desiredOutcome?: unknown;
}

function asString(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: BriefingRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const employeeId = asString(body.employeeId, 200);
  const purpose = asString(body.purpose, 100) as MeetingPurpose;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }
  if (!ALLOWED_PURPOSES.includes(purpose)) {
    return NextResponse.json({ error: "invalid purpose" }, { status: 400 });
  }

  const employee = getEmployeeById(employeeId);
  if (!employee) {
    return NextResponse.json({ error: "employee not found" }, { status: 404 });
  }

  const meetingContext: MeetingContext = {
    purpose,
    topOfMind: asString(body.topOfMind, 1000),
    desiredOutcome: asString(body.desiredOutcome, 1000),
  };

  // Run the sealed engine — produces only the *output* shape.
  const engineOutput = analyzeProfile(employee.id, employee.scores);

  const provider = getProvider();
  try {
    const briefing = await provider.generate({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        backstory: employee.backstory,
        recentContext: employee.recentContext,
      },
      engine: engineOutput,
      meetingContext,
    });

    return NextResponse.json({ briefing, provider: provider.name });
  } catch (err) {
    // If the live provider fails for any reason, generate via fallback so the
    // user always sees something useful.
    const message = err instanceof Error ? err.message : "Unknown LLM error";
    console.error("[briefing] live provider failed, falling back:", message);

    const { createDemoFallbackProvider } = await import("@/lib/llm/demo-fallback");
    const fallback = createDemoFallbackProvider();
    const briefing = await fallback.generate({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        backstory: employee.backstory,
        recentContext: employee.recentContext,
      },
      engine: engineOutput,
      meetingContext,
    });
    return NextResponse.json({
      briefing,
      provider: "demo-fallback",
      providerError: message,
    });
  }
}
