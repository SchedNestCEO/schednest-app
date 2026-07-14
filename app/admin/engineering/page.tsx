import Link from "next/link";

const sections = [
  ["Documentation", "Active", "Engineering standards, architecture records, and release guidance are repository-owned."],
  ["Architecture", "Active", "Platform boundaries and major decisions are tracked through ADRs."],
  ["Build", "Configured", "GitHub Actions runs verification, lint, type checking, and a production build."],
  ["Tests", "Foundation", "Static and build gates are active. Workflow and load tests arrive later."],
  ["Performance", "Planned", "Performance Center data and dashboards are scheduled for Sprint 3."],
  ["Security", "Documented", "Authorization, secrets, migration, and product-boundary rules are documented."],
];

export default function EngineeringPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-black text-emerald-300">← Founder OS</Link>
        <section className="mt-6 rounded-[2.5rem] border border-emerald-400/20 bg-emerald-400/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">Engineering Foundation v1.0</p>
          <h1 className="mt-5 text-4xl font-black">Engineering</h1>
          <p className="mt-4 max-w-3xl text-sm text-gray-300">The operating foundation for maintaining, testing, documenting, and releasing SchedNest safely.</p>
        </section>
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(([title, status, detail]) => (
            <article key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-black">{title}</h2>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">{status}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-400">{detail}</p>
            </article>
          ))}
        </section>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">Sprint 1 validation</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-gray-300">{`npm run engineering:verify
npm run lint
npm run typecheck
npm run build`}</pre>
        </section>
      </div>
    </main>
  );
}
