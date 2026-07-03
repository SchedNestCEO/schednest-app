"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import LegalReviewModal from "./LegalReviewModal";

const TERMS_VERSION = "2026-07-02";
const PRIVACY_VERSION = "2026-07-02";
const SECURITY_VERSION = "2026-07-02";

type PolicyKey = "terms" | "privacy" | "security";

const legalContent = {
  terms: {
    title: "Terms of Service",
    version: TERMS_VERSION,
    sections: [
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
        title: "3. Founder Beta Pricing",
        body: [
          "SchedNest may offer discounted Founder Beta pricing to early customers before full public launch.",
          "Founder Beta pricing is limited to the first 25 eligible businesses that become paid subscribers before full launch. Availability may close once Founder Beta spots are filled.",
          "Founder Beta pricing is currently: Essentials at $4.99 per month or $49.99 per year, Growth at $14.99 per month or $149.99 per year, and Complete at $34.99 per month or $349.99 per year.",
          "Founder Beta customers may keep Founder Beta pricing for the life of their active subscription, as long as the subscription remains paid, active, and in good standing.",
          "Founder Beta pricing may be lost if the subscription is canceled, refunded, unpaid, inactive, transferred, downgraded and later upgraded, terminated for violation of these Terms, or otherwise no longer in good standing.",
        ],
      },
      {
        title: "4. Billing, Renewals, and Payment",
        body: [
          "You agree to pay all fees associated with your selected plan. Billing may be monthly, yearly, manually invoiced, or processed through a third-party payment provider.",
          "Until automated billing is available, SchedNest may collect payment manually through invoices, payment links, ACH, or other approved business payment methods.",
          "If your plan renews automatically, you authorize SchedNest or its payment provider to charge the payment method on file according to the billing cycle and price disclosed at checkout or on your invoice.",
          "Failure to pay may result in suspension, downgrade, or termination of access to paid features.",
        ],
      },
      {
        title: "5. Cancellations and Refunds",
        body: [
          "You may cancel your subscription according to the cancellation process provided by SchedNest or the applicable payment provider.",
          "Cancellation stops future billing but does not automatically refund previous payments unless SchedNest states otherwise in writing or a refund is required by law.",
          "Monthly subscription payments are generally non-refundable once the billing period begins.",
          "Yearly subscription payments may be eligible for a refund within 14 days of the initial purchase if the account has not been heavily used. After 14 days, yearly subscription payments are generally non-refundable unless required by law or approved by SchedNest in writing.",
          "If you cancel a Founder Beta subscription, receive a refund, fail to pay, become inactive, or otherwise lose good standing, you may lose Founder Beta pricing and may need to subscribe again under the pricing available at that time.",
        ],
      },
      {
        title: "6. Customer Data and Consent",
        body: [
          "You are responsible for obtaining any necessary permission to collect, store, and use your customers' information through SchedNest.",
          "You are responsible for the content of your business communications, booking confirmations, services, prices, availability, and customer interactions.",
          "You agree not to enter sensitive personal information into SchedNest unless you have the legal right and consent to do so.",
          "SchedNest is not intended to store regulated medical records, protected health information, or other highly sensitive regulated data unless SchedNest has entered into a separate written agreement allowing that use.",
        ],
      },
      {
        title: "7. Acceptable Use",
        body: [
          "You may not use SchedNest for unlawful, abusive, fraudulent, harmful, deceptive, or misleading activity.",
          "You may not attempt to access accounts, data, systems, or information that you are not authorized to access.",
          "You may not interfere with, disrupt, reverse engineer, abuse, overload, scrape, or misuse the platform.",
          "SchedNest may suspend or terminate accounts that misuse the platform, violate these Terms, create legal risk, or create risk for SchedNest, customers, or other users.",
        ],
      },
      {
        title: "8. Disclaimer and Limitation of Liability",
        body: [
          "SchedNest is provided on an as-is and as-available basis.",
          "SchedNest does not guarantee uninterrupted service, error-free operation, business results, customer acquisition, revenue, or profitability.",
          "To the fullest extent allowed by law, SchedNest is not liable for lost profits, lost revenue, lost customers, lost data, business interruption, indirect damages, incidental damages, special damages, consequential damages, or punitive damages.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    version: PRIVACY_VERSION,
    sections: [
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
        ],
      },
      {
        title: "6. Security and Retention",
        body: [
          "SchedNest uses reasonable administrative, technical, and organizational safeguards designed to protect information.",
          "No online service can guarantee absolute security. Users are responsible for using strong passwords, protecting login credentials, and limiting account access to trusted people.",
          "SchedNest keeps information for as long as needed to provide the service, comply with legal obligations, resolve disputes, enforce agreements, maintain security, and support legitimate business purposes.",
        ],
      },
      {
        title: "7. Your Choices",
        body: [
          "You may update certain account and business information through your SchedNest account.",
          "You may request access, correction, deletion, or export of certain information by contacting SchedNest through the contact methods provided on the website.",
          "You may unsubscribe from marketing emails if SchedNest sends them. Transactional emails, booking notices, account notices, billing notices, and security notices may still be sent when needed to provide the service.",
        ],
      },
      {
        title: "8. Sensitive Information",
        body: [
          "SchedNest is not intended to store regulated medical records, protected health information, Social Security numbers, government identification numbers, financial account passwords, or other highly sensitive regulated information unless SchedNest has entered into a separate written agreement allowing that use.",
          "Users should avoid entering unnecessary sensitive information into booking notes, customer records, service descriptions, or messages.",
        ],
      },
    ],
  },
  security: {
    title: "Security Statement",
    version: SECURITY_VERSION,
    sections: [
      {
        title: "1. Account Protection",
        body: [
          "SchedNest is designed to protect business accounts, booking information, customer records, and service details through controlled account access.",
          "Users are responsible for keeping passwords secure, protecting login credentials, and limiting account access to trusted people.",
        ],
      },
      {
        title: "2. Data Protection",
        body: [
          "SchedNest uses reasonable technical and organizational safeguards designed to protect account, business, booking, and customer information.",
          "SchedNest is designed to rely on trusted infrastructure providers for database hosting, authentication, email delivery, and platform hosting.",
          "No online system can guarantee absolute security, but SchedNest treats security as a high-priority part of the product.",
        ],
      },
      {
        title: "3. Payments",
        body: [
          "SchedNest intends to use trusted third-party payment providers for subscriptions, invoices, ACH payments, and payment links.",
          "SchedNest does not intend to store full credit card numbers on its own servers.",
        ],
      },
      {
        title: "4. Customer Data Responsibility",
        body: [
          "Businesses using SchedNest are responsible for the customer data they collect through booking pages and customer records.",
          "Users should only collect information they need to provide their services and should avoid entering unnecessary sensitive information into SchedNest.",
        ],
      },
      {
        title: "5. Sensitive Data",
        body: [
          "SchedNest is not intended to store regulated medical records, protected health information, Social Security numbers, government identification numbers, financial account passwords, or other highly sensitive regulated data unless SchedNest has entered into a separate written agreement allowing that use.",
          "If a business needs to store regulated or highly sensitive information, it should contact SchedNest before using the platform for that purpose.",
        ],
      },
      {
        title: "6. Access and Permissions",
        body: [
          "SchedNest is designed so business data is associated with the correct business account.",
          "Users should log out on shared devices, avoid sharing passwords, and notify SchedNest if they believe account access has been compromised.",
        ],
      },
      {
        title: "7. Incident Response",
        body: [
          "If SchedNest becomes aware of a security issue affecting users or customer data, SchedNest will investigate and take appropriate steps based on the nature of the issue.",
          "SchedNest will provide notices when required by applicable law.",
        ],
      },
      {
        title: "8. Vulnerability Reporting",
        body: [
          "If you believe you have found a security vulnerability in SchedNest, please report it responsibly and do not access, modify, delete, download, or share data that does not belong to you.",
          "Before full public launch, SchedNest should create a dedicated security contact email such as security@schednest.com.",
        ],
      },
    ],
  },
};

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [activePolicy, setActivePolicy] = useState<PolicyKey | null>(null);

  const [termsReadAt, setTermsReadAt] = useState<string | null>(null);
  const [privacyReadAt, setPrivacyReadAt] = useState<string | null>(null);
  const [securityReadAt, setSecurityReadAt] = useState<string | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedSecurity, setAcceptedSecurity] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canSubmit =
    Boolean(termsReadAt) &&
    Boolean(privacyReadAt) &&
    Boolean(securityReadAt) &&
    acceptedTerms &&
    acceptedPrivacy &&
    acceptedSecurity &&
    !isLoading;

  function handlePolicyComplete(policy: PolicyKey, completedAt: string) {
    if (policy === "terms") {
      setTermsReadAt(completedAt);
      setAcceptedTerms(false);
    }

    if (policy === "privacy") {
      setPrivacyReadAt(completedAt);
      setAcceptedPrivacy(false);
    }

    if (policy === "security") {
      setSecurityReadAt(completedAt);
      setAcceptedSecurity(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!businessName.trim()) {
      setMessage("Please enter your business name.");
      return;
    }

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (!termsReadAt || !privacyReadAt || !securityReadAt) {
      setMessage(
        "Please review the Terms, Privacy Policy, and Security Statement before creating an account."
      );
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy || !acceptedSecurity) {
      setMessage(
        "You must agree to the Terms, Privacy Policy, and Security Statement before creating an account."
      );
      return;
    }

    setIsLoading(true);

    const acceptedAt = new Date().toISOString();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          business_name: businessName.trim(),
          accepted_terms: true,
          accepted_privacy: true,
          accepted_security: true,
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          security_version: SECURITY_VERSION,
          terms_read_at: termsReadAt,
          privacy_read_at: privacyReadAt,
          security_read_at: securityReadAt,
          accepted_at: acceptedAt,
          acceptance_method: "signup_modal_scroll_gate",
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (data.user) {
      const { error: legalError } = await supabase
        .from("legal_acceptances")
        .insert({
          user_id: data.user.id,
          email: email.trim(),
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          security_version: SECURITY_VERSION,
          accepted_terms: true,
          accepted_privacy: true,
          accepted_security: true,
          terms_read_at: termsReadAt,
          privacy_read_at: privacyReadAt,
          security_read_at: securityReadAt,
          acceptance_method: "signup_modal_scroll_gate",
          accepted_at: acceptedAt,
        });

      if (legalError) {
        console.error("Legal acceptance insert failed:", legalError.message);
      }
    }

    setIsLoading(false);

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Account created. Check your email to confirm your account before logging in."
    );
  }

  const activePolicyContent = activePolicy ? legalContent[activePolicy] : null;

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      {activePolicy && activePolicyContent && (
        <LegalReviewModal
          isOpen={Boolean(activePolicy)}
          title={activePolicyContent.title}
          version={activePolicyContent.version}
          sections={activePolicyContent.sections}
          onClose={() => setActivePolicy(null)}
          onComplete={(completedAt) =>
            handlePolicyComplete(activePolicy, completedAt)
          }
        />
      )}

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section className="hidden lg:block">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-xl font-black text-black">
                S
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                  SchedNest
                </p>
                <p className="text-sm text-gray-500">
                  From first client to full company
                </p>
              </div>
            </Link>

            <h1 className="mt-10 max-w-xl text-5xl font-black leading-tight">
              Start simple. Stay organized. Grow with SchedNest.
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-8 text-gray-400">
              SchedNest puts security, privacy, and legal clarity directly into
              the signup flow.
            </p>
          </section>

          <section className="mx-auto w-full max-w-xl rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_100px_rgba(16,185,129,0.10)] backdrop-blur-xl sm:p-8">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
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
            </div>

            <div className="mt-8 lg:mt-0">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Create account
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight">
                Review policies before joining.
              </h2>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                Review each policy in the popup window, scroll to the bottom,
                then confirm before creating your account.
              </p>
            </div>

            <form onSubmit={handleSignup} className="mt-8 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-300">
                  Business name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Example: Steven's Detailing"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400/60"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400/60"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-400/60"
                  required
                  minLength={6}
                />
              </div>

              <div className="mt-2 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <button
                  type="button"
                  onClick={() => setActivePolicy("terms")}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Review Terms of Service
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {termsReadAt ? "Completed" : "Required"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePolicy("privacy")}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Review Privacy Policy
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {privacyReadAt ? "Completed" : "Required"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePolicy("security")}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Review Security Statement
                  <span className="mt-1 block text-xs font-normal text-gray-500">
                    {securityReadAt ? "Completed" : "Required"}
                  </span>
                </button>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <label
                  className={`flex items-start gap-3 text-sm leading-6 ${
                    termsReadAt ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) =>
                      setAcceptedTerms(event.target.checked)
                    }
                    disabled={!termsReadAt}
                    className="mt-1 h-4 w-4 accent-emerald-400 disabled:cursor-not-allowed"
                    required
                  />
                  <span>I have read and agree to the Terms of Service.</span>
                </label>

                <label
                  className={`flex items-start gap-3 text-sm leading-6 ${
                    privacyReadAt ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(event) =>
                      setAcceptedPrivacy(event.target.checked)
                    }
                    disabled={!privacyReadAt}
                    className="mt-1 h-4 w-4 accent-emerald-400 disabled:cursor-not-allowed"
                    required
                  />
                  <span>I have read and agree to the Privacy Policy.</span>
                </label>

                <label
                  className={`flex items-start gap-3 text-sm leading-6 ${
                    securityReadAt ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={acceptedSecurity}
                    onChange={(event) =>
                      setAcceptedSecurity(event.target.checked)
                    }
                    disabled={!securityReadAt}
                    className="mt-1 h-4 w-4 accent-emerald-400 disabled:cursor-not-allowed"
                    required
                  />
                  <span>
                    I have read and acknowledge the Security Statement.
                  </span>
                </label>
              </div>

              {message && (
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-emerald-300 hover:text-emerald-200"
                >
                  Log in
                </Link>
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}