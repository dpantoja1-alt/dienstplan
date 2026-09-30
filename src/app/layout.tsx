import type { Metadata } from "next";
import { Barlow, Barlow_Semi_Condensed, Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { themeScript } from "@/lib/theme-script";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const barlow = Barlow({
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Semi_Condensed({
  variable: "--font-logo",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-accent",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Eifel Wagyu · Dienstplan",
    template: "%s",
  },
  description: "Dienstplan und Zeiterfassung für das Team",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${inter.variable} ${barlow.variable} ${barlowCondensed.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
