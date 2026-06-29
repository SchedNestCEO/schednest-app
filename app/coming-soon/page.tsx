export default function ComingSoonPage() {
return (
<main className="min-h-screen bg-[#050807] px-6 py-16 text-white">
<div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl flex-col items-center justify-center text-center">
<p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
SchedNest Beta
</p>

<h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
Your Nest is almost ready.
</h1>

<p className="mt-6 text-lg leading-8 text-gray-300">
SchedNest is currently in early testing. If you created an account,
your dashboard access will open once your workspace is ready.
</p>

<div className="mt-10 flex flex-col gap-3 sm:flex-row">
<a
href="/"
className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
>
Back to home
</a>

<a
href="mailto:hello@schednest.com"
className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
>
Contact SchedNest
</a>
</div>
</div>
</main>
);
}
