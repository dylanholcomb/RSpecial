// =============================================================================
// LLM PROVIDER — ANTHROPIC
// -----------------------------------------------------------------------------
// Calls the Anthropic API with the structured prompt and parses the JSON
// briefing object out of the response.
//
// Phase 2: a sibling file (azure-openai.ts) will implement the same
// LLMProvider interface. Selection happens in provider.ts based on the
// LLM_PROVIDER env var.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import type { Briefing } from "@/lib/lq-engine";
import type { BriefingInputs, LLMProvider } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt-builder";
import { briefingFromJson, hierarchyDisplay } from "./shape";

const DEFAULT_MODEL = "claude-sonnet-4-5";

export function createAnthropicProvider(): LLMProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const available = !!apiKey;

  return {
    name: "anthropic",
    available,
    async generate(inputs: BriefingInputs): Promise<Briefing> {
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not set.");
      }
      const client = new Anthropic({ apiKey });

      const userPrompt = buildUserPrompt(inputs);

      const response = await client.messages.create({
        model,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

      // Pull text out of the response.
      const textBlock = response.content.find(b => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Anthropic returned no text content.");
      }

      const briefingShape = briefingFromJson(textBlock.text);

      return {
        subjectName: inputs.employee.name,
        subjectRole: inputs.employee.role,
        archetypeName: inputs.engine.archetype?.name ?? null,
        hierarchyDisplay: hierarchyDisplay(inputs.engine),
        ...briefingShape,
        generatedBy: "live",
      };
    },
  };
}
