import Link from "next/link";
import DashboardShell from "../components/DashboardShell";

const settingSections = [
  {
    title: "Business Profile",
    description:
      "Manage your business name, public slug, description, contact email, phone, and timezone.",
    href: "/dashboard/profile",
    label: "Open profile settings",
  },
  {
    title: "Booking Page",
    description:
      "Manage your public booking link, booking mode, request flow, and business hours display.",
    href: "/dashboard/booking-page",
    label: "Open booking page settings",
  },
  {
    title: "Services",
    description:
      "Manage service names, prices, durations, active services, and service sample previews.",
    href: "/dashboard/services",
    label: "Open service settings",
  },
  {
    title: "Billing",
    description:
      "View your current plan, Stripe subscription status, next due date, and billing portal.",
    href: "/dashboard/account",
    label: "Open billing settings",
  },
  {
    title: "Notifications",
    description:
      "Review booking request notifications, owner alerts, customer emails, and future reminder settings.",
    href: "/dashboard/requests",
    label: "Open requests",
  },
  {
    title: "Customers",
    description:
      "Manage customers, customer status, notes, history, and future loyalty/rewards tools.",
    href: "/dashboard/customers",
    label: "Open customer settings",
  },
];

export default function SettingsPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Settings
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Manage your SchedNest settings.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Use this hub to quickly jump to the settings that control your
            business profile, booking page, services, billing, customers, and
            notifications.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settingSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="text-xl font-black text-white">
                    {section.title}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {section.description}
                  </p>
                </div>

                <span className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition group-hover:border-emerald-400/30 group-hover:bg-emerald-400 group-hover:text-black">
                  {section.label}
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            Coming Next
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            Centralized editing.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
            This settings hub is the first step. Next, we can make these cards
            expandable so you can edit business profile, booking page, billing,
            and notification settings directly from this page.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}
