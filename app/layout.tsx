import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://splitwiz.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "SplitWiz — Trip Expense Splitter",
    template: "%s — SplitWiz",
  },
  description:
    "Split trip expenses with friends and settle up instantly. Track who paid what, see who owes whom, and settle with a tap. Free, no sign-up required.",
  keywords: [
    "trip expenses",
    "expense splitter",
    "split bills",
    "travel budget",
    "group expenses",
    "settle up",
    "travel finance",
  ],
  authors: [{ name: "SplitWiz" }],
  openGraph: {
    type: "website",
    url: APP_URL,
    title: "SplitWiz — Trip Expense Splitter",
    description:
      "Split trip expenses with friends and settle up instantly. Free, no sign-up required.",
    siteName: "SplitWiz",
    images: [{ url: "/icon.svg", width: 100, height: 100, alt: "SplitWiz" }],
  },
  twitter: {
    card: "summary",
    title: "SplitWiz — Trip Expense Splitter",
    description:
      "Split trip expenses with friends and settle up instantly.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
