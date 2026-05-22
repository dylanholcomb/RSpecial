// =============================================================================
// LLM PROVIDER — FACTORY
// -----------------------------------------------------------------------------
// Picks the right LLM provider based on environment. Supports:
//
//   "vertex-gemini" — production, runs on Google Cloud Run with the project's
//                     default service account (which needs roles/aiplatform.user).
//                     This is the IP-protection-correct path: prompts and
//                     responses go to Vertex AI under the enterprise-tier
//                     no-training contract.
//
//   "anthropic"     — legacy, calls Anthropic's API with an API key. Retained
//                     for local development and as a non-GCP fallback. Should
//                     NOT see proprietary LQ content in production.
//
//   "demo-fallback" — templated, runs without any external service. Used
//                     when neither live provider is available, and by the
//                     /api/briefing route when a live provider errors.
//
// Auto-selection logic:
//   - Explicit LLM_PROVIDER env var wins.
//   - Otherwise: if running on GCP (GOOGLE_CLOUD_PROJECT is set automatically
//     by Cloud Run), use vertex-gemini.
//   - Otherwise: if ANTHROPIC_API_KEY is set, use anthropic.
//   - Otherwise: demo-fallback.
// =============================================================================

import type { LLMProvider } from "./types";
import { createAnthropicProvider } from "./anthropic";
import { createDemoFallbackProvider } from "./demo-fallback";
import { createVertexGeminiProvider } from "./vertex-gemini";

export function getProvider(): LLMProvider {
  const configured = (process.env.LLM_PROVIDER || "").toLowerCase();
  const onGcp = !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.VERTEX_AI_PROJECT);
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  // Explicit config wins.
  if (configured === "vertex" || configured === "vertex-gemini" || configured === "gemini") {
    const live = createVertexGeminiProvider();
    return live.available ? live : createDemoFallbackProvider();
  }
  if (configured === "anthropic") {
    const live = createAnthropicProvider();
    return live.available ? live : createDemoFallbackProvider();
  }
  if (configured === "demo" || configured === "demo-fallback") {
    return createDemoFallbackProvider();
  }

  // Auto-select.
  if (onGcp) {
    const live = createVertexGeminiProvider();
    if (live.available) return live;
  }
  if (hasAnthropic) {
    const live = createAnthropicProvider();
    if (live.available) return live;
  }
  return createDemoFallbackProvider();
}
