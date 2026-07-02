import Link from "next/link";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or using SchedNest, you agree to these Terms of Service. If you do not agree, you should not use SchedNest.",
      "SchedNest is provided by SchedNest LLC. These Terms apply to all users, businesses, account owners, customers, and visitors who access or use the platform.",
    ],
  },
  {
    title: "2. SchedNest Services",
    body: [
      "SchedNest provides tools to help service providers organize bookings, services, customer information, booking requests, notifications, and related business activity.",
      "SchedNest does not guarantee that you will receive customers, appointments, revenue, profits, business growth, or any specific business results from using the platform.",
      "SchedNest may update, improve, change, add, or remove features over time as the platform develops.",
    ],
  },
  {
    title: "3. Accounts and Business Information",
    body: [
      "You are responsible for keeping your account information accurate, current, and secure.",
      "You are responsible for all services, prices, availability, business hours, customer communications, booking information, and business details you enter into SchedNest.",
      "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.",
    ],
  },
  {
    title: "4. Founder Beta Pricing",
    body: [
      "SchedNest may offer discounted Founder Beta pricing to early customers before full public launch.",
      "Founder Beta pricing is limited to the first 25 eligible businesses that become paid subscribers before full launch. Availability may close once Founder Beta spots are filled.",
      "Founder Beta pricing is currently: Essentials at $4.99 per month or $49.99 per year, Growth at $14.99 per month or $149.99 per year, and Complete at $34.99 per month or $349.99 per year.",
      "Founder Beta customers may keep Founder Beta pricing for the life of their active subscription, as long as the subscription remains paid, active, and in good standing.",
      "Founder Beta pricing may be lost if the subscription is canceled, refunded, unpaid, inactive, transferred, downgraded and later upgraded, terminated for violation of these Terms, or otherwise no longer in good standing.",
      "Founder Beta pricing is not transferable and applies only to the eligible business account that originally subscribed.",
    ],
  },
  {
    title: "5. Standard Pricing",
    body: [
      "After full launch or after Founder Beta spots close, SchedNest plans to use standard pricing for new customers.",
      "The planned standard pricing is: Essentials at $9.99 per month or $99.99 per year, Growth at $19.99 per month or $199.99 per year, and Complete at $39.99 per month or $399.99 per year.",
      "SchedNest may still offer discounts, promotions, free trials, taxes, fees, add-ons, enterprise plans, custom services, or separate pricing for future optional features.",
      "Any pricing shown on the SchedNest website, checkout page, invoice, or subscription agreement at the time of purchase will control that purchase.",
    ],
  },
  {
    title: "6. Billing, Renewals, and Payment",
    body: [
      "You agree to pay all fees associated with your selected plan. Billing may be monthly, yearly, manually invoiced, or processed through a third-party payment provider.",
      "Until automated billing is available, SchedNest may collect payment manually through invoices, payment links, ACH, or other approved business payment methods.",
      "If your plan renews automatically, you authorize SchedNest or its payment provider to charge the payment method on file according to the billing cycle and price disclosed at checkout or on your invoice.",
      "Failure to pay may result in suspension, downgrade, or termination of access to paid features.",
    ],
  },
  {
    title: "7. Cancellations and Refunds",
    body: [
      "You may cancel your subscription according to the cancellation process provided by SchedNest or the applicable payment provider.",
      "Cancellation stops future billing but does not automatically refund previous payments unless SchedNest states otherwise in writing or a refund is required by law.",
      "Monthly subscription payments are generally non-refundable once the billing period begins.",
      "Yearly subscription payments may be eligible for a refund within 14 days of the initial purchase if the account has not been heavily used. After 14 days, yearly subscription payments are generally non-refundable unless required by law or approved by SchedNest in writing.",
      "SchedNest may approve refunds for duplicate charges, billing errors, technical issues caused by SchedNest, or other circumstances SchedNest determines are appropriate.",
      "If you cancel a Founder Beta subscription, receive a refund, fail to pay, become inactive, or otherwise lose good standing, you may lose Founder Beta pricing and may need to subscribe again under the pricing available at that time.",
      "If your subscription is canceled, you may continue to have access to paid features until the end of the current paid billing period unless your account is suspended or terminated for violation of these Terms.",
    ],
  },
  {
    title: "8. Customer Data and Consent",
    body: [
      "You are responsible for obtaining any necessary permission to collect, store, and use your customers' information through SchedNest.",
      "You are responsible for the content of your business communications, booking confirmations, services, prices, availability, and customer interactions.",
      "You agree not to enter sensitive personal information into SchedNest unless you have the legal right and consent to do so.",
      "SchedNest is not intended to store regulated medical records, protected health information, or other highly sensitive regulated data unless SchedNest has entered into a separate written agreement allowing that use.",
    ],
  },
  {
    title: "9. Privacy and Security",
    body: [
      "Your use of SchedNest is also governed by our Privacy Policy.",
      "SchedNest uses reasonable administrative, technical, and organizational safeguards designed to protect account, business, booking, and customer information.",
      "No online service can guarantee absolute security. You are responsible for using strong passwords, keeping your login information secure, and limiting account access to trusted users.",
    ],
  },
  {
    title: "10. Acceptable Use",
    body: [
      "You may not use SchedNest for unlawful, abusive, fraudulent, harmful, deceptive, or misleading activity.",
      "You may not attempt to access accounts, data, systems, or information that you are not authorized to access.",
      "You may not interfere with, disrupt, reverse engineer, abuse, overload, scrape, or misuse the platform.",
      "SchedNest may suspend or terminate accounts that misuse the platform, violate these Terms, create legal risk, or create risk for SchedNest, customers, or other users.",
    ],
  },
  {
    title: "11. Third-Party Services",
    body: [
      "SchedNest may rely on third-party services for hosting, authentication, database services, email delivery, payment processing, analytics, or other platform functions.",
      "Third-party services may have their own terms, privacy policies, and security practices. SchedNest is not responsible for third-party services outside of its reasonable control.",
    ],
  },
  {
    title: "12. Beta Features",
    body: [
      "Some SchedNest features may be offered as beta, early access, preview, or experimental features.",
      "Beta features may change, break, be limited, or be removed as the platform develops.",
      "SchedNest may use feedback from beta users to improve the platform.",
    ],
  },
  {
    title: "13. Termination",
    body: [
      "SchedNest may suspend, restrict, or terminate access to the platform if you violate these Terms, fail to pay, misuse the service, create legal risk, or create risk for SchedNest or other users.",
      "You may stop using SchedNest at any time, subject to any active billing obligations or cancellation terms.",
    ],
  },
  {
    title: "14. Disclaimer",
    body: [
      "SchedNest is provided on an as-is and as-available basis.",
      "SchedNest does not guarantee uninterrupted service, error-free operation, business results, customer acquisition, revenue, or profitability.",
    ],
  },
  {
    title: "15. Limitation of Liability",
    body: [
      "To the fullest extent allowed by law, SchedNest is not liable for lost profits, lost revenue, lost customers, lost data, business interruption, indirect damages, incidental damages, special damages, consequential damages, or punitive damages.",
      "Your use of SchedNest is your responsibility, including how you manage bookings, customers, services, payments, availability, and business operations.",
    ],
  },
  {
    title: "16. Changes to These Terms",
    body: [
      "SchedNest may update these Terms from time to time.",
      "If changes are material, SchedNest may provide notice through the website, dashboard, email, or another reasonable method.",
      "Continued use of SchedNest after updated Terms become effective means you accept the updated Terms.",
    ],
  },
  {
    title: "17. Contact",
    body: [
      "Questions about these Terms of Service can be sent to SchedNest through the contact methods provided on the website.",
    ],
  },
];

export default function TermsPage() {
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
            Terms of Service
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            SchedNest Terms of Service
          </h1>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            Last updated: July 2, 2026
          </p>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            These Terms of Service are provided as a strong starting point for
            SchedNest. Before full launch or broad paid customer rollout,
            SchedNest should have these Terms reviewed by a qualified attorney.
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
            href="/security"
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
          >
            Security
          </Link>
        </div>
      </div>
    </main>
  );
}