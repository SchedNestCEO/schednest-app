export default function ContactPage() {
return (
<main className="min-h-screen bg-[#050807] px-6 py-16 text-white">
<div className="mx-auto max-w-3xl">
<a href="/" className="text-sm font-semibold text-emerald-300">
← Back to SchedNest
</a>

<p className="mt-10 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
Contact
</p>

<h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
Get in touch with SchedNest.
</h1>

<p className="mt-5 text-lg leading-8 text-gray-300">
For support, questions, early access, or business inquiries, contact
SchedNest using the email below.
</p>

<div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">
Email
</p>

<a
href="mailto:hello@schednest.com"
className="mt-3 block text-2xl font-bold text-white underline decoration-emerald-300/40 underline-offset-4 transition hover:text-emerald-300"
>
hello@schednest.com
</a>

<p className="mt-4 text-sm leading-6 text-gray-400">
SchedNest is operated by SchedNest, LLC.
</p>
</div>
</div>
</main>
);
}
