"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import NotificationBell from "./NotificationBell";

type DashboardShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
  },
  {
    href: "/dashboard/requests",
    label: "Requests",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
  },
  {
    href: "/dashboard/services",
    label: "Services",
  },
  {
    href: "/dashboard/booking-page",
    label: "Booking Page",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
  },
  {
    href: "/dashboard/birdy",
    label: "Birdy",
  },
  {
    href: "/dashboard/subscriptions",
    label: "Subscriptions",
    adminOnly: true,
  },
];

const ADMIN_EMAIL = "hello@schednest.com";

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSchedNestAdmin, setIsSchedNestAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isSchedNestAdmin
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email?.toLowerCase() || null;

      setUserEmail(email);
      setIsSchedNestAdmin(email === ADMIN_EMAIL);
    }

    loadUser();
  }, [supabase]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  function isActiveRoute(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function getNavLinkClass(href: string, isMobile = false) {
    const isActive = isActiveRoute(href);

    return `rounded-2xl px-4 py-3 text-sm font-black transition ${
      isActive
        ? "bg-emerald-400 text-black"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;
  }

  function getTopNavLinkClass(href: string) {
    const isActive = isActiveRoute(href);

    return `whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-black transition ${
      isActive
        ? "bg-emerald-400 text-black"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;
  }

  return (
    <main className="min-h-screen bg-[#050807] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/20 p-6 lg:block">
          <div className="sticky top-6">
            <Link href="/dashboard" className="block">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                SchedNest
              </p>

              <h1 className="mt-2 text-2xl font-black text-white">
                SchedNest Founder
              </h1>
            </Link>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold text-gray-500">Signed in as</p>

              <p className="mt-1 break-words text-sm font-black text-white">
                {userEmail || "Loading..."}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                  complete
                </span>

                {isSchedNestAdmin && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-emerald-300">
                    admin
                  </span>
                )}

                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300">
                  beta
                </span>
              </div>
            </div>

            <nav className="mt-6 grid gap-2">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={getNavLinkClass(item.href)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-8 w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Log out
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-black/20 px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">
                  SchedNest
                </p>
                <p className="text-lg font-black text-white">Dashboard</p>
              </Link>

              <div className="flex items-center gap-2">
                <NotificationBell variant="mobile" />

                <button
                  type="button"
                  onClick={() =>
                    setIsMobileMenuOpen((currentValue) => !currentValue)
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white"
                >
                  Menu
                </button>
              </div>
            </div>

            {isMobileMenuOpen && (
              <div className="mt-4 rounded-[2rem] border border-white/10 bg-[#07100d] p-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-bold text-gray-500">
                    Signed in as
                  </p>

                  <p className="mt-1 break-words text-sm font-black text-white">
                    {userEmail || "Loading..."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                      complete
                    </span>

                    {isSchedNestAdmin && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-emerald-300">
                        admin
                      </span>
                    )}

                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300">
                      beta
                    </span>
                  </div>
                </div>

                <nav className="mt-3 grid gap-2">
                  {visibleNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={getNavLinkClass(item.href, true)}
                    >
                      {item.label}
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Log out
                  </button>
                </nav>
              </div>
            )}
          </header>

          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="relative z-40 mb-6 hidden w-fit max-w-full overflow-visible rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 lg:block">
              <div className="flex flex-wrap items-center gap-2 overflow-visible">
                {visibleNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={getTopNavLinkClass(item.href)}
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="relative shrink-0 overflow-visible">
                  <NotificationBell variant="top" />
                </div>
              </div>
            </div>

            <div className="relative z-0">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
