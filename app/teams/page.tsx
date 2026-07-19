import Link from "next/link";

export default function TeamsPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300"
        >
          SchedNest
        </Link>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
            Future Product
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
            SchedNest Teams
          </h1>

          <p className="mt-4 text-xl font-bold text-gray-300">
            Shared scheduling for growing teams.
          </p>

          <p className="mt-6 max-w-2xl text-base leading-7 text-gray-400">
            SchedNest Teams will help companies manage workers, team calendars,
            shared bookings, roles, and business operations. This product is not
            publicly available yet.
          </p>

          <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-black text-emerald-300">
              Hidden foundation page
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              This page is here for future planning only. It does not affect the
              current SchedNest Business launch.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}