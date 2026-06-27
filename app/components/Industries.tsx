const industries = [
"Auto Detailers",
"Barbers",
"Salons",
"Dog Walkers",
"Tutors",
"Cleaners",
"Personal Trainers",
"Bakers",
"Tattoo Artists",
];

export default function Industries() {
return (
<section id="industries" className="mx-auto w-full max-w-7xl px-6 py-28">
<div className="mx-auto max-w-3xl text-center">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Built For
</p>

<h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
One operating system for time-based businesses.
</h2>
</div>

<div className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
{industries.map((industry) => (
<div
key={industry}
className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center font-semibold"
>
{industry}
</div>
))}
</div>
</section>
);
}