import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OziTuma Dictionary",
  description:
    "A multilingual dictionary for African indigenous languages — search words and compare translations across 18+ languages.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
