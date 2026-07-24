import Link from "next/link";
import LegalReadTracker from "../components/LegalReadTracker";

const sections = [
  {
    title: "1. Information We Collect",
    body: [
      "SchedNest may collect account information such as your name, email address, login information, business name, business contact details, and subscription information.",
      "SchedNest may collect business information you add to the platform, including services, prices, booking availability, business hours, customers, appointments, booking requests, and notes you choose to enter.",
      "SchedNest may collect customer information submitted through booking pages, including names, email addresses, phone numbers, requested services, requested appointment times, and messages.",
      "SchedNest may collect technical information such as device type, browser type, IP address, log data, usage activity, and information needed to keep the platform secure and functioning.",
    ],
  },
  {
    title: "2. How We Use Information",
    body: [
      "SchedNest uses information to provide, operate, maintain, secure, and improve the platform.",
      "SchedNest uses information to create accounts, manage bookings, send notifications, support customers, process payments, prevent abuse, troubleshoot issues, and communicate important service updates.",
      "SchedNest may use aggregated or de-identified information to understand usage trends and improve the platform.",
    ],
  },
  {
    title: "3. Customer Data",
    body: [
      "Businesses using SchedNest are responsible for the customer information they collect and manage through the platform.",
      "SchedNest processes customer data to provide booking, customer management, notification, and related platform services.",
      "SchedNest does not sell customer booking data.",
    ],
  },
  {
    title: "4. Payment Information",
    body: [
      "SchedNest may use third-party payment providers to process subscription payments, invoices, ACH payments, or payment links.",
      "SchedNest does not intend to store full credit card numbers on its own servers. Payment information may be handled by third-party payment providers according to their own terms and privacy policies.",
    ],
  },
  {
    title: "5. Sharing Information",
    body: [
      "SchedNest may share information with trusted service providers that help operate the platform, such as hosting providers, database providers, authentication providers, email delivery services, payment processors, analytics providers, customer support tools, and security tools.",
      "SchedNest may share information when required by law, legal process, regulation, court order, or to protect the rights, safety, and security of SchedNest, users, customers, or the public.",
      "SchedNest may share information in connection with a business transaction such as a merger, acquisition, financing, reorganization, or sale of assets.",
    ],
  },
  {
    title: "6. Security",
    body: [
      "SchedNest uses reasonable administrative, technical, and organizational safeguards designed to protect information.",
      "No online service can guarantee absolute security. Users are responsible for using strong passwords, protecting login credentials, and limiting account access to trusted people.",
    ],
  },
  {
    title: "7. Data Retention",
    body: [
      "SchedNest keeps information for as long as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, maintain security, and support legitimate business purposes.",
      "Businesses may request deletion or export of account information, subject to legal, security, billing, backup, and operational requirements.",
    ],
  },
  {
    title: "8. Your Choices",
    body: [
      "You may update certain account and business information through your SchedNest account.",
      "You may request access, correction, deletion, or export of certain information by contacting SchedNest.",
      "You may unsubscribe from marketing emails if SchedNest sends them. Transactional emails, booking notices, account notices, billing notices, and security notices may still be sent when needed to provide the service.",
    ],
  },
  {
    title: "9. California Privacy Rights",
    body: [
      "Depending on where you live and whether applicable privacy laws apply to SchedNest, you may have rights to know, access, correct, delete, or limit certain uses of your personal information.",
      "SchedNest does not sell customer booking data. If SchedNest later uses data in a way that requires additional privacy notices or opt-out rights, SchedNest will update this Privacy Policy and provide required choices.",
    ],
  },
  {
    title: "10. Children's Privacy",
    body: [
      "SchedNest is not intended for children under 13 years old.",
      "SchedNest does not knowingly collect personal information from children under 13. If you believe a child has provided personal information to SchedNest, contact us so we can review and delete it when appropriate.",
    ],
  },
  {
    title: "11. Sensitive Information",
    body: [
      "SchedNest is not intended to store regulated medical records, protected health information, Social Security numbers, government identification numbers, financial account passwords, or other highly sensitive regulated information unless SchedNest has entered into a separate written agreement allowing that use.",
      "Users should avoid entering unnecessary sensitive information into booking notes, customer records, service descriptions, or messages.",
    ],
  },
  {
    title: "12. Changes to This Privacy Policy",
    body: [
      "SchedNest may update this Privacy Policy from time to time.",
      "If changes are material, SchedNest may provide notice through the website, dashboard, email, or another reasonable method.",
      "Continued use of SchedNest after the updated Privacy Policy becomes effective means you acknowledge the updated policy.",
    ],
  },
  {
    title: "13. Contact",
    body: [
      "Privacy questions, data access requests, correction requests, deletion requests, or export requests can be sent to privacy@schednest.com.",
      "General support questions can be sent to support@schednest.com.",
      "Security concerns can be sent to security@schednest.com.",
      "Billing or subscription questions can be sent to billing@schednest.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="torogoz-public-page min-h-screen px-6 py-10 text-white">
      <LegalReadTracker
        storageKey="schednest_privacy_read_2026-07-02"
        label="Privacy Policy"
      />

      <div className="mx-auto max-w-4xl">
        <nav className="mb-8 flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <Link href="/" className="group">
            <p className="torogoz-wordmark text-2xl font-black tracking-tight">
              SchedNest
            </p>
            <p className="mt-0.5 text-xs font-bold text-gray-500 transition group-hover:text-gray-300">
              ← Back home
            </p>
          </Link>

          <Link
            href="/signup"
            className="rounded-2xl bg-edition-primary px-4 py-2 text-sm font-black text-black transition hover:bg-edition-primary-hover"
          >
            Get started
          </Link>
        </nav>

        <section className="torogoz-public-hero relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
          <div className="torogoz-public-streaks" aria-hidden="true">
            <span />
            <span />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
            Privacy Policy
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            How SchedNest handles information
          </h1>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            Last updated: July 2, 2026
          </p>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            This Privacy Policy explains how SchedNest collects, uses, shares,
            and protects information when people use the SchedNest website,
            dashboard, booking pages, and related services.
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
            href="/terms"
            className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
          >
            Terms
          </Link>

          <Link
            href="/security"
            className="rounded-2xl bg-edition-primary px-5 py-3 text-center text-sm font-black text-black transition hover:bg-edition-primary-hover"
          >
            Security
          </Link>
        </div>
      </div>
    </main>
  );
}