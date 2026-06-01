// =============================================================================
// Root layout — adds the environment badge introduced in v0.6.5.
// -----------------------------------------------------------------------------
// Reads ENVIRONMENT env var (set on the Cloud Run service) and renders a
// conditional ribbon at the very top of every page:
//
//   ENVIRONMENT=stage      → amber "PILOT — real LQ data — internal use only"
//   ENVIRONMENT=prod       → no badge (absence is the signal)
//   ENVIRONMENT=(anything else, including unset)  → gray "DEMO — synthetic data only"
//
// Per the May 26, 2026 environment naming convention (see PROJECT-FACTS.md).
// The badge makes every screenshot self-documenting and prevents stakeholders
// from confusing the demo environment with the pilot environment.
// =============================================================================

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meeting Prep — LQ",
  description:
    "Prepare for a 1:1 with the listening intelligence of the person across the table.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FAFAF7",
};

type EnvBadgeKind = "demo" | "pilot" | null;

function envBadgeKind(): EnvBadgeKind {
  const env = (process.env.ENVIRONMENT || "").toLowerCase();
  if (env === "prod" || env === "production") return null;
  if (env === "stage" || env === "staging" || env === "pilot") return "pilot";
  return "demo";
}

function EnvBadge() {
  const kind = envBadgeKind();
  if (!kind) return null;
  const isPilot = kind === "pilot";
  return (
    <div
      role="status"
      aria-label={isPilot ? "Pilot environment" : "Demo environment"}
      className={[
        "w-full px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em]",
        isPilot
          ? "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300"
          : "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-300/40",
      ].join(" ")}
    >
      {isPilot
        ? "PILOT  ·  Real LQ data  ·  Internal use only"
        : "DEMO  ·  Synthetic data only"}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <EnvBadge />
        <div className="mx-auto w-full max-w-mobile px-5 pb-24 pt-6">
          {children}
        </div>
      </body>
    </html>
  );
}
