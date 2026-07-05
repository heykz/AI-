import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — AI Aggregation Assistant",
  description:
    "Aggregated information from multiple sources, with an AI assistant that helps you understand it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
