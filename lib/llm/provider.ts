// =============================================================================
// LLM PROVIDER — FACTORY
// -----------------------------------------------------------------------------
// Picks the right provider based on env config. Phase 1 supports:
//   - "anthropic" (live, requires ANTHROPIC_API_KEY)
//   - "demo-fallback" (templated, always available)
//
// Phase 2 adds "azure-openai" — implementing the same LLMProvider interface
// — and that becomes the default once Mosaic's tenant is configured.
// =============================================================================

import type { LLMProvider } from "./types";
import { createAnthropicProvider } from "./anthropic";
import { createDemoFallbackProvider } from "./demo-fallback";

/**
 * Returns the configured provider. If the configured live provider is
 * unavailable (e.g. no API key), automatically falls back to the demo
 * provider so the app always works.
 */
export function getProvider(): LLMProvider {
  const configured = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();

  if (configured === "demo" || configured === "demo-fallback") {
    return createDemoFallbackProvider();
  }

  if (configured === "anthropic") {
    const live = createAnthropicProvider();
    return live.available ? live : createDemoFallbackProvider();
  }

  // Future: azure-openai branch goes here.
  // if (configured === "azure" || configured === "azure-openai") {
  //   const live = createAzureOpenAIProvider();
  //   return live.available ? live : createDemoFallbackProvider();
  // }

  return createDemoFallbackProvider();
}
