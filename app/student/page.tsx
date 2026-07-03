import Link from "next/link";
import { schedNestFeatureFlags, studentPricing } from "../lib/schednest/productConfig";

export default function StudentComingSoonPage() {
  if (!schedNestFeatureFlags.studentPublicLaunch) {
    return (
      <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-8 flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] px-5 py-4">
            <Link href="/" className="text-sm font-black text-emerald-300">
              ← Back to SchedNest
            </Link>
          </nav>

          <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Future Product
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              SchedNest Student is being planned.
            </h1>

            <p className="mt-5 text-sm leading-6 text-gray-400">
              SchedNest Student is a future version of SchedNest for college
              students to organize classes, assignments, due dates, exams, study
              blocks, and school schedules.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-black text-white">
                Planned Student Founder Pricing
              </p>

              <p className="mt-3 text-3xl font-black text-emerald-300">
                {studentPricing.founder.monthlyLabel}
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Available to the first{" "}
                {studentPricing.founder.eligibleSpots.toLocaleString()} eligible
                student accounts while their student subscription remains paid,
                active, and in good standing. After those spots, planned
                standard student pricing is{" "}
                <span className="font-bold text-white">
                  {studentPricing.standard.monthlyLabel}
                </span>
                .
              </p>
            </div>

            <p className="mt-6 text-sm leading-6 text-gray-500">
              This product is not publicly launched yet.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            SchedNest Student
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            Organize your classes, assignments, and due dates.
          </h1>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            Student launch page placeholder.
          </p>
        </section>
      </div>
    </main>
  );
}