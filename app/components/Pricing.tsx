import { waitlistUrl } from "../lib/links";

const plans = [
{
name: "Essentials",
price: "$4.99",
description: "For solo professionals getting organized.",
features: ["Up to 50 bookings", "Customer profiles", "Email confirmations"],
},
{
name: "Growth",
price: "$14.99",
description: "For growing businesses ready to save more time.",
features: ["Unlimited bookings", "Smart reminders", "Business dashboard"],
highlighted: true,
},
{
name: "Complete",
price: "$34.99",
description: "Let Birdy help handle the busy work.",
features: [
"Birdy operations assistant",
"SMS reminders",
"Revenue insights",
],
},
];

export default function Pricing() {
return (
<section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-28">
<div className="mx-auto max-w-3xl text-center">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Pricing
</p>

<h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
Simple pricing that grows with your business.
</h2>
</div>

<div className="mt-16 grid gap-6 lg:grid-cols-3">
{plans.map((plan) => (
<div
key={plan.name}
className={`flex min-h-[440px] flex-col rounded-3xl border p-8 ${
plan.highlighted
? "border-emerald-400/30 bg-emerald-400/[0.08] shadow-[0_0_60px_rgba(16,185,129,0.12)]"
: "border-white/10 bg-white/[0.04]"
}`}
>
{plan.highlighted ? (
<div className="mb-5 w-fit rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
Most Popular
</div>
) : null}

<h3 className="text-2xl font-bold">{plan.name}</h3>

<p className="mt-5 text-5xl font-bold">
{plan.price}
<span className="text-lg font-normal text-gray-400">/mo</span>
</p>

<p className="mt-5 leading-7 text-gray-300">
{plan.description}
</p>

<div className="mt-8 space-y-3">
{plan.features.map((feature) => (
<p key={feature} className="text-gray-300">
✓ {feature}
</p>
))}
</div>

<a
href={waitlistUrl}
target="_blank"
rel="noopener noreferrer"
className="mt-auto rounded-2xl bg-emerald-400 px-6 py-4 text-center font-semibold text-black transition hover:bg-emerald-300"
>
Join Waitlist
</a>
</div>
))}
</div>
</section>
);
}