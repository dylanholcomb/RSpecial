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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="mx-auto w-full max-w-mobile px-5 pb-24 pt-6">
          {children}
        </div>
      </body>
    </html>
  );
}
