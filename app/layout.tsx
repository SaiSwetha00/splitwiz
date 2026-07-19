import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const CANONICAL_URL = "https://expense-splitter-two-flax.vercel.app";

function getAppURL(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site && !site.includes("localhost")) return site;
  return CANONICAL_URL;
}
const APP_URL = getAppURL();

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "SplitWiz",
    "mobile-web-app-capable": "yes",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,500;1,9..40,600&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
