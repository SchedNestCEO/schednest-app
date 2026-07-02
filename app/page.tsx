import Link from "next/link";

const features = [
  {
    title: "Public booking page",
    description:
      "Give customers a simple link where they can request appointments without back-and-forth messages.",
  },
  {
    title: "Requests and approvals",
    description:
      "Keep every booking request organized as pending, approved, or declined from your owner dashboard.",
  },
  {
    title: "Customer list",
    description:
      "Automatically build a customer list as people request appointments through your booking page.",
  },
  {
    title: "Notifications",
    description:
      "Send confirmation updates and keep owners aware of new booking activity.",
  },
];

const pricingPlans = [
  {
    name: "Essentials",
    founderMonthly: "$4.99/mo",
    founderYearly: "$49.99/year",
    standardMonthly: "$9.99/mo",
    standardYearly: "$99.99/year",
    description:
      "For service providers who need a simple booking page and a cleaner way to manage requests.",
    features: [
      "Public booking page",
      "Service list",
      "Booking requests",
      "Basic customer list",
    ],
  },
  {
    name: "Growth",
    founderMonthly: "$14.99/mo",
    founderYearly: "$149.99/year",
    standardMonthly: "$19.99/mo",
    standardYearly: "$199.99/year",
    description:
      "For growing providers who want more structure around customers, requests, and follow-ups.",
    features: [
      "Everything in Essentials",
      "Customer management",
      "Email notifications",
      "Request approvals",
    ],
    highlighted: true,
  },
  {
    name: "Complete",
    founderMonthly: "$34.99/mo",
    founderYearly: "$349.99/year",
    standardMonthly: "$39.99/mo",
    standardYearly: "$399.99/year",
    description:
      "For businesses that want the full SchedNest system as they grow from solo work to a real company.",
    features: [
      "Everything in Growth",
      "Advanced organization",
      "Priority support",
      "Early access to new tools",
    ],
  },
];

const steps = [
  {
    number: "01",
    title: "Set up your business",
    description:
      "Add your business name, services, public booking link, and weekly availability.",
  },
  {
    number: "02",
    title: "Share your booking page",
    description:
      "Send customers one clean link so they can request an appointment anytime.",
  },
  {
    number: "03",
    title: "Approve and grow",
    description:
      "Manage requests, organize customers, and turn scattered bookings into a real system.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050807] text-white">
      <section className="relative overflow-hidden px-6 py-6">
        <div className="absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-emerald-300/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl">
          <nav className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-lg font-black text-black">
                S
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                  SchedNest
                </p>
                <p className="text-xs text-gray-500">
                  From first client to full company
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/login"
                className="rounded-2xl px-4 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Get started
              </Link>
            </div>

            <Link
              href="/signup"
              className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-black transition hover:bg-emerald-300 sm:hidden"
            >
              Start
            </Link>
          </nav>

          <div className="grid gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">
                Start simple. Stay organized. Grow with SchedNest.
              </div>

              <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Organize your bookings from first client to full company.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">
                Give customers one simple way to request appointments, keep
                every booking organized, and manage your growing service
                business from one place.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="rounded-2xl bg-emerald-400 px-6 py-4 text-center text-sm font-black text-black transition hover:bg-emerald-300"
                >
                  Start your business dashboard
                </Link>

                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 px-6 py-4 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Log in
                </Link>
              </div>

              <p className="mt-5 text-sm text-gray-500">
                Built for mobile service providers, solo operators, and growing
                teams who need more structure.
              </p>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_0_100px_rgba(16,185,129,0.12)] backdrop-blur-xl">
              <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">
                      Today
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Booking activity
                    </h2>
                  </div>

                  <div className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                    Live
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-bold text-white">
                      New request received
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Customer is waiting for approval.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-bold text-white">
                      Appointment approved
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Customer confirmation is ready.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-bold text-white">
                      Customer saved
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Your client list grows automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-black text-white">3</p>
                  <p className="mt-1 text-xs text-gray-500">Requests</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-black text-white">12</p>
                  <p className="mt-1 text-xs text-gray-500">Customers</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-2xl font-black text-white">5</p>
                  <p className="mt-1 text-xs text-gray-500">Services</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Mission
          </p>

          <h2 className="mt-5 max-w-5xl text-3xl font-black leading-tight sm:text-5xl">
            SchedNest helps service providers organize, book, and grow — from
            their first client to a full-fledged company.
          </h2>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Why SchedNest
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              Move from hustle to structure.
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-400">
              SchedNest is built for service providers who are ready to stop
              managing everything through memory, texts, screenshots, and
              scattered notes.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/30 hover:bg-emerald-400/5"
              >
                <h3 className="text-xl font-black text-white">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Founder Beta Pricing
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              Available for the first 25 paid businesses that join.
            </h2>

            <p className="mt-5 text-lg leading-8 text-gray-400">
              Lock in early pricing for the life of your active subscription.
              Founder Beta pricing is limited to the first 25 eligible
              businesses that become paid subscribers before full launch.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[2rem] border p-6 transition ${
                  plan.highlighted
                    ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_80px_rgba(16,185,129,0.12)]"
                    : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30"
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-5 inline-flex rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                    Most popular
                  </div>
                )}

                <h3 className="text-2xl font-black text-white">{plan.name}</h3>

                <div className="mt-5">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
                    Founder beta
                  </p>
                  <p className="mt-2 text-4xl font-black text-white">
                    {plan.founderMonthly}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
                    {plan.founderYearly}
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Standard pricing
                  </p>
                  <p className="mt-2 text-sm font-bold text-gray-300">
                    {plan.standardMonthly} or {plan.standardYearly}
                  </p>
                </div>

                <p className="mt-5 min-h-20 text-sm leading-6 text-gray-400">
                  {plan.description}
                </p>

                <div className="mt-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-black">
                        ✓
                      </span>
                      <p className="text-sm leading-6 text-gray-300">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/signup"
                  className={`mt-8 block rounded-2xl px-5 py-3 text-center text-sm font-black transition ${
                    plan.highlighted
                      ? "bg-emerald-400 text-black hover:bg-emerald-300"
                      : "border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Start with {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-4xl text-sm leading-6 text-gray-500">
            Founder Beta pricing is limited to the first 25 eligible businesses
            that become paid subscribers before full launch. Eligible early
            users may keep Founder Beta pricing while their subscription remains
            paid, active, and in good standing. Standard pricing will apply
            after Founder Beta spots close or after full launch.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Vision
            </p>

            <h2 className="mt-5 text-4xl font-black leading-tight">
              The business operating system for service providers.
            </h2>

            <p className="mt-5 text-base leading-8 text-gray-400">
              To become the business operating system that helps service
              providers everywhere move from hustle to structure, from scattered
              bookings to organized growth, and from first client to full
              company.
            </p>
          </div>

          <div className="grid gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-[2rem] border border-white/10 bg-black/20 p-5"
              >
                <p className="text-sm font-black text-emerald-300">
                  {step.number}
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-emerald-400/20 bg-emerald-400/10 p-8 text-center sm:p-12">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-200">
            From first client to full company
          </p>

          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl">
            Start simple today. Build the system your business will grow into.
          </h2>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-black text-black transition hover:bg-emerald-300"
            >
              Get started
            </Link>

            <Link
              href="/login"
              className="rounded-2xl border border-white/10 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SchedNest. All rights reserved.</p>

          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/security" className="hover:text-white">
              Security
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}