import Link from "next/link";

const contactOptions = [
  {
    title: "General Contact",
    email: "hello@schednest.com",
    description:
      "General questions, early access, product questions, or anything that does not fit another category.",
  },
  {
    title: "Support",
    email: "support@schednest.com",
    description:
      "Help with your account, dashboard, booking page, services, customers, or booking requests.",
  },
  {
    title: "Billing",
    email: "billing@schednest.com",
    description:
      "Subscription questions, invoices, payment issues, cancellations, or refund requests.",
  },
  {
    title: "Founder Beta",
    email: "founder@schednest.com",
    description:
      "Questions about Founder Beta pricing, early business spots, and becoming one of the first SchedNest businesses.",
  },
  {
    title: "Sales",
    email: "sales@schednest.com",
    description:
      "Plan questions, business inquiries, demos, and help choosing the right SchedNest plan.",
  },
  {
    title: "Privacy",
    email: "privacy@schednest.com",
    description:
      "Privacy questions, data access requests, correction requests, deletion requests, or export requests.",
  },
  {
    title: "Security",
    email: "security@schednest.com",
    description:
      "Security concerns, vulnerability reports, account safety issues, or suspicious activity.",
  },
  {
    title: "Legal",
    email: "legal@schednest.com",
    description:
      "Legal notices, Terms of Service questions, policy questions, or formal business communication.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] px-5 py-4">
          <Link href="/" className="text-sm font-black text-emerald-300">
            ← Back to SchedNest
          </Link>

          <Link
            href="/signup"
            className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-black transition hover:bg-emerald-300"
          >
            Get started
          </Link>
        </nav>

        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Contact
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            Get in touch with SchedNest.
          </h1>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-gray-400">
            For support, billing, privacy, security, legal questions, Founder
            Beta inquiries, or business questions, use the email that best fits
            your request.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {contactOptions.map((option) => (
            <div
              key={option.email}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">
                {option.title}
              </p>

              <a
                href={`mailto:${option.email}`}
                className="mt-3 block text-xl font-black text-white underline decoration-emerald-400/40 underline-offset-4 transition hover:text-emerald-300"
              >
                {option.email}
              </a>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                {option.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">
            Automated Emails
          </p>

          <p className="mt-4 text-sm leading-6 text-gray-400">
            SchedNest booking notifications and system emails may be sent from{" "}
            <span className="font-bold text-white">
              notifications@schednest.com
            </span>
            . This inbox is used for automated messages and is not the best
            place for support requests.
          </p>
        </section>

        <section className="mt-8 grid gap-4 rounded-[2rem] border border-white/10 bg-black/20 p-6 sm:grid-cols-3">
          <Link
            href="/terms"
            className="rounded-2xl border border-white/10 px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Terms of Service
          </Link>

          <Link
            href="/privacy"
            className="rounded-2xl border border-white/10 px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Privacy Policy
          </Link>

          <Link
            href="/security"
            className="rounded-2xl bg-emerald-400 px-5 py-4 text-center text-sm font-black text-black transition hover:bg-emerald-300"
          >
            Security Statement
          </Link>
        </section>

        <footer className="mt-8 text-sm text-gray-500">
          <p>SchedNest is operated by SchedNest, LLC.</p>
        </footer>
      </div>
    </main>
  );
}