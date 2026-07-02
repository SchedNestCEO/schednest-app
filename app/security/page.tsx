import Link from "next/link";

const sections = [
  {
    title: "Account Protection",
    body: [
      "SchedNest is designed to protect business accounts, booking information, customer records, and service details through controlled account access.",
      "Users are responsible for keeping passwords secure, protecting login credentials, and limiting account access to trusted people.",
    ],
  },
  {
    title: "Data Protection",
    body: [
      "SchedNest uses reasonable technical and organizational safeguards designed to protect account, business, booking, and customer information.",
      "SchedNest is designed to rely on trusted infrastructure providers for database hosting, authentication, email delivery, and platform hosting.",
      "No online system can guarantee absolute security, but SchedNest treats security as a high-priority part of the product.",
    ],
  },
  {
    title: "Payments",
    body: [
      "SchedNest intends to use trusted third-party payment providers for subscriptions, invoices, ACH payments, and payment links.",
      "SchedNest does not intend to store full credit card numbers on its own servers.",
    ],
  },
  {
    title: "Customer Data Responsibility",
    body: [
      "Businesses using SchedNest are responsible for the customer data they collect through booking pages and customer records.",
      "Users should only collect information they need to provide their services and should avoid entering unnecessary sensitive information into SchedNest.",
    ],
  },
  {
    title: "Sensitive Data",
    body: [
      "SchedNest is not intended to store regulated medical records, protected health information, Social Security numbers, government identification numbers, financial account passwords, or other highly sensitive regulated data unless SchedNest has entered into a separate written agreement allowing that use.",
      "If a business needs to store regulated or highly sensitive information, it should contact SchedNest before using the platform for that purpose.",
    ],
  },
  {
    title: "Access and Permissions",
    body: [
      "SchedNest is designed so business data is associated with the correct business account.",
      "Users should log out on shared devices, avoid sharing passwords, and notify SchedNest if they believe account access has been compromised.",
    ],
  },
  {
    title: "Incident Response",
    body: [
      "If SchedNest becomes aware of a security issue affecting users or customer data, SchedNest will investigate and take appropriate steps based on the nature of the issue.",
      "SchedNest will provide notices when required by applicable law.",
    ],
  },
  {
    title: "Vulnerability Reporting",
    body: [
      "If you believe you have found a security vulnerability in SchedNest, please report it responsibly and do not access, modify, delete, download, or share data that does not belong to you.",
      "Before full public launch, SchedNest should create a dedicated security contact email such as security@schednest.com.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-8 flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] px-5 py-4">
          <Link href="/" className="text-sm font-black text-emerald-300">
            SchedNest
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
            Security
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            Security is a core part of SchedNest.
          </h1>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            SchedNest helps service providers manage bookings, customers,
            services, and business activity. Protecting that information is one
            of our highest priorities.
          </p>
        </section>

        <div className="mt-8 grid gap-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <h2 className="text-xl font-black text-white">
                {section.title}
              </h2>

              <div className="mt-4 grid gap-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-6 text-gray-400"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Back home
          </Link>

          <Link
            href="/privacy"
            className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Privacy Policy
          </Link>

          <Link
            href="/terms"
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
          >
            Terms
          </Link>
        </div>
      </div>
    </main>
  );
}