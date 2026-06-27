const workflowSteps = [
{
step: "01",
title: "Customer reaches out",
description: "A customer calls, messages, or submits a booking request.",
},
{
step: "02",
title: "Birdy organizes it",
description:
"Birdy checks your schedule, availability, customer details, and business rules.",
},
{
step: "03",
title: "The booking is prepared",
description:
"Confirmations, reminders, and next steps are prepared so you can approve or adjust them.",
},
{
step: "04",
title: "You stay focused",
description:
"You spend less time managing the business and more time serving customers.",
},
];

export default function HowItWorks() {
return (
<section id="workflow" className="mx-auto w-full max-w-7xl px-6 py-28">
<div className="mx-auto max-w-3xl text-center">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
How It Works
</p>

<h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
Birdy watches the details so you do not have to.
</h2>
</div>

<div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
{workflowSteps.map((item) => (
<div
key={item.step}
className="rounded-3xl border border-white/10 bg-white/[0.04] p-7"
>
<p className="text-sm font-semibold text-emerald-300">
{item.step}
</p>

<h3 className="mt-5 text-xl font-bold">{item.title}</h3>

<p className="mt-4 leading-7 text-gray-300">
{item.description}
</p>
</div>
))}
</div>
</section>
);
}