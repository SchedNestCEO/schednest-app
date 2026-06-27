import { waitlistUrl } from "../lib/links";

export default function CTA() {
return (
<section className="mx-auto w-full max-w-5xl px-6 py-32 text-center">
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-16 shadow-[0_0_80px_rgba(16,185,129,0.12)] sm:px-12">
<h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
Your business should feel easier to run.
</h2>

<p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300">
Join the Founding Members waitlist and help shape the future of
SchedNest.
</p>

<a
href={waitlistUrl}
target="_blank"
rel="noopener noreferrer"
className="mt-10 inline-flex rounded-2xl bg-emerald-400 px-8 py-4 font-semibold text-black transition hover:bg-emerald-300"
>
Join Waitlist
</a>
</div>
</section>
);
}