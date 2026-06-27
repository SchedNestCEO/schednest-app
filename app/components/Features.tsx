const features = [
{
title: "Stop missing opportunities",
description:
"SchedNest helps organize bookings, reminders, and customer requests so important opportunities do not slip through the cracks.",
},
{
title: "Keep every customer organized",
description:
"Customer details, notes, booking history, and upcoming activity stay in one simple place.",
},
{
title: "Know what needs attention",
description:
"Birdy watches your schedule, pending requests, reminders, and customer activity so you know what needs attention next.",
},
{
title: "Let Birdy handle the busy work",
description:
"Birdy helps with scheduling, follow-ups, reminders, and daily operations while you stay in control.",
},
];

export default function Features() {
return (
<section id="features" className="mx-auto w-full max-w-7xl px-6 py-28">
<div className="mx-auto max-w-3xl text-center">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Why SchedNest
</p>

<h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
Stop worrying about the work that should already be handled.
</h2>

<p className="mt-6 text-lg leading-8 text-gray-300">
SchedNest uses Birdy to help you stay ahead of bookings, reminders,
customers, and daily priorities.
</p>
</div>

<div className="mt-16 grid gap-6 md:grid-cols-2">
{features.map((feature) => (
<div
key={feature.title}
className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
>
<div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
✓
</div>

<h3 className="text-2xl font-bold">{feature.title}</h3>

<p className="mt-4 leading-7 text-gray-300">
{feature.description}
</p>
</div>
))}
</div>
</section>
);
}