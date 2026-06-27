import type { Metadata } from "next";
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

export const metadata: Metadata = {
title: "SchedNest | AI Scheduling Software for Service Businesses",
description:
"SchedNest helps service businesses manage bookings, customers, reminders, and daily operations with Birdy, the AI operations assistant built in.",
openGraph: {
title: "SchedNest | AI Scheduling Software for Service Businesses",
description:
"Manage bookings, customers, reminders, and daily operations with Birdy, the AI operations assistant built into SchedNest.",
url: "https://schednest.com",
siteName: "SchedNest",
images: [
{
url: "https://schednest.com/logo.png",
width: 1200,
height: 630,
alt: "SchedNest logo",
},
],
locale: "en_US",
type: "website",
},
twitter: {
card: "summary_large_image",
title: "SchedNest | AI Scheduling Software for Service Businesses",
description:
"Manage bookings, customers, reminders, and daily operations with Birdy, the AI operations assistant built into SchedNest.",
images: ["https://schednest.com/logo.png"],
},
};

export default function RootLayout({
children,
}: Readonly<{
children: React.ReactNode;
}>) {
return (
<html lang="en">
<body
className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
>
{children}
</body>
</html>
);
}