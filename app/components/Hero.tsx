import DashboardPreview from "./DashboardPreview";
import { waitlistUrl } from "../lib/links";

export default function Hero() {
 return (
 <section className="relative mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-7xl flex-col items-center px-6 py-20 text-center">
 <div className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300">
 Meet Birdy, your AI operations assistant
 </div>

 <h1 className="mt-8 max-w-5xl text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
 The AI Operating System for Time-Based Businesses
 </h1>

 <p className="mt-8 max-w-3xl text-lg leading-8 text-gray-300 sm:text-xl">
 SchedNest brings scheduling, customers, reminders, and Birdy into one
 beautifully simple platform so you can spend less time managing your
 business and more time growing it.
 </p>

 <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
 <a
 href={waitlistUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="w-full rounded-2xl bg-emerald-400 px-8 py-4 text-center font-semibold text-black transition hover:bg-emerald-300 sm:w-auto"
 >
 Start Free
 </a>

 <a
 href="#dashboard"
 className="w-full rounded-2xl border border-white/15 px-8 py-4 text-center font-semibold text-white transition hover:bg-white/10 sm:w-auto"
 >
 View Dashboard
 </a>
 </div>

 <DashboardPreview />
 </section>
 );
}