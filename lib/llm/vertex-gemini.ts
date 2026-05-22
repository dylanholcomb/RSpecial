// =============================================================================
// LLM PROVIDER — VERTEX AI GEMINI
// -----------------------------------------------------------------------------
// Production LLM provider for the LQ Platform on Google Cloud. Calls Gemini
// via Vertex AI inside the same GCP project that holds the proprietary LQ
// knowledge base, under the enterprise-tier contractual commitment that
// prompts and responses are not used to train Google's foundation models.
//
// Authentication: on Cloud Run, the service uses Application Default
// Credentials — no API key required. The Cloud Run service account must
// have the `roles/aiplatform.user` IAM role (granted by an admin once).
//
// Configuration via environment variables (all have sensible defaults so
// the provider "just works" on Cloud Run with no setup):
//   VERTEX_AI_PROJECT   — GCP project ID (defaults to GOOGLE_CLOUD_PROJECT,
//                          which Cloud Run sets automatically)
//   VERTEX_AI_LOCATION  — region (default: us-central1)
//   VERTEX_AI_MODEL     — Gemini model ID (default: gemini-2.5-flash)
// =============================================================================

import { VertexAI } from "@google-cloud/vertexai";
import type { Briefing } from "@/lib/lq-engine";
import type { BriefingInputs, LLMProvider } from "./types";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt-builder";
import { briefingFromJson, hierarchyDisplay } from "./shape";

const DEFAULT_LOCATION = "us-central1";
const DEFAULT_MODEL = "gemini-2.5-flash";

export function createVertexGeminiProvider(): LLMProvider {
  // GOOGLE_CLOUD_PROJECT is set automatically by Cloud Run; VERTEX_AI_PROJECT
  // is an explicit override for local development or non-Cloud-Run hosts.
  const project =
    process.env.VERTEX_AI_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "";

  const location = process.env.VERTEX_AI_LOCATION || DEFAULT_LOCATION;
  const model = process.env.VERTEX_AI_MODEL || DEFAULT_MODEL;

  // The provider is "available" when we have a project ID. If ADC turns out
  // to be misconfigured at call time, generate() will throw and the API
  // route's fallback handler returns a demo briefing so the app never
  // 500s on the user.
  const available = !!project;

  return {
    name: "vertex-gemini",
    available,
    async generate(inputs: BriefingInputs): Promise<Briefing> {
      if (!project) {
        throw new Error(
          "Vertex AI provider has no project ID. Set VERTEX_AI_PROJECT or " +
          "GOOGLE_CLOUD_PROJECT, or run inside a Cloud Run service where the " +
          "platform sets it automatically."
        );
      }

      const vertex = new VertexAI({ project, location });

      // Use response_mime_type=application/json so the model is guaranteed to
      // return valid JSON. This is cleaner than the Anthropic path where we
      // ask for JSON in the prompt and then defensively parse the text.
      const generativeModel = vertex.getGenerativeModel({
        model,
        generationConfig: {
          // v0.3: bumped from 2048 → 8192 to accommodate richer briefings
          // generated against the full 41-profile catalog entries (each entry
          // is significantly larger than the public-stub archetype it replaced).
          maxOutputTokens: 8192,
          temperature: 0.7,
          responseMimeType: "application/json",
        },
        systemInstruction: {
          role: "system",
          parts: [{ text: SYSTEM_PROMPT }],
        },
      });

      const userPrompt = buildUserPrompt(inputs);

      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Vertex AI Gemini returned no text content.");
      }

      const briefingShape = briefingFromJson(text);

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
