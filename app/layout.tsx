import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./lib/i18n/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "SchedNest | From first client to full company";

const siteDescription =
  "SchedNest helps service providers organize, book, and grow — from their first client to a full-fledged company.";

export const metadata: Metadata = {
  metadataBase: new URL("https://schednest.com"),
  title: {
    default: siteTitle,
    template: "%s | SchedNest",
  },
  description: siteDescription,
  applicationName: "SchedNest",
  keywords: [
    "SchedNest",
    "service business booking",
    "appointment scheduling",
    "booking software",
    "customer management",
    "service provider software",
    "small business booking",
  ],
  authors: [{ name: "SchedNest" }],
  creator: "SchedNest",
  publisher: "SchedNest",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "https://schednest.com",
    siteName: "SchedNest",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "SchedNest",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/logo.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        data-theme="business"
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}