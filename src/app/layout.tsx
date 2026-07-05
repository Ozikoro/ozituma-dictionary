import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ozituma.com"),
  title: "OziTuma Dictionary",
  description:
    "A multilingual dictionary for African indigenous languages — search words and compare translations across 18+ languages.",
  openGraph: {
    title: "OziTuma Dictionary",
    description: "A multilingual dictionary for African indigenous languages — search words and compare translations across 18+ languages.",
    url: "https://ozituma.com",
    siteName: "OziTuma Dictionary",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "OziTuma Dictionary Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OziTuma Dictionary",
    description: "A multilingual dictionary for African indigenous languages — search words and compare translations across 18+ languages.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
