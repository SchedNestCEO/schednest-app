"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import NotificationBell from "./NotificationBell";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useT } from "../../lib/i18n/client";

type DashboardShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "D",
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    shortLabel: "P",
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    shortLabel: "B",
  },
  {
    href: "/dashboard/requests",
    label: "Requests",
    shortLabel: "R",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    shortLabel: "C",
  },
  {
    href: "/dashboard/services",
    label: "Services",
    shortLabel: "S",
  },
  {
    href: "/dashboard/booking-page",
    label: "Booking Page",
    shortLabel: "BP",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    shortLabel: "⚙",
  },
  {
    href: "/dashboard/birdy",
    label: "Birdy",
    shortLabel: "AI",
  },
  {
    href: "/dashboard/subscriptions",
    label: "Subscriptions",
    shortLabel: "$",
    adminOnly: true,
  },
];

const navLabelKeys: Record<string, string> = {
  "/dashboard": "nav.dashboard",
  "/dashboard/profile": "nav.profile",
  "/dashboard/bookings": "nav.bookings",
  "/dashboard/requests": "nav.requests",
  "/dashboard/customers": "nav.customers",
  "/dashboard/services": "nav.services",
  "/dashboard/booking-page": "nav.bookingPage",
  "/dashboard/settings": "nav.settings",
  "/dashboard/birdy": "nav.birdy",
  "/dashboard/subscriptions": "nav.subscriptions",
};

const ADMIN_EMAIL = "hello@schednest.com";

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const t = useT();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSchedNestAdmin, setIsSchedNestAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isSchedNestAdmin
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue;

      window.localStorage.setItem(
        "schednest-sidebar-collapsed",
        String(nextValue)
      );

      return nextValue;
    });
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedSidebarPreference = window.localStorage.getItem(
        "schednest-sidebar-collapsed"
      );

      setIsSidebarCollapsed(savedSidebarPreference === "true");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
    const timeoutId = window.setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  function isActiveRoute(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function getNavLinkClass(href: string) {
    const isActive = isActiveRoute(href);

    return `rounded-2xl px-4 py-3 text-sm font-black transition ${
      isActive
        ? "bg-edition-primary text-black"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;
  }

  function getCollapsedNavLinkClass(href: string) {
    const isActive = isActiveRoute(href);

    return `flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-black transition ${
      isActive
        ? "bg-edition-primary text-black"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;
  }

  function getTopNavLinkClass(href: string) {
    const isActive = isActiveRoute(href);

    return `whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-black transition ${
      isActive
        ? "bg-edition-primary text-black"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`;
  }

  return (
    <main className="torogoz-app-background min-h-screen text-white">
      <div className="flex min-h-screen">
        <aside
          className={`hidden shrink-0 border-r border-white/10 bg-black/20 transition-all duration-300 lg:block ${
            isSidebarCollapsed ? "w-24 p-4" : "w-72 p-6"
          }`}
        >
          <div className="sticky top-6">
            <div
              className={`flex gap-3 ${
                isSidebarCollapsed
                  ? "flex-col items-center"
                  : "items-start justify-between"
              }`}
            >
              <Link
                href="/dashboard"
                className={
                  isSidebarCollapsed
                    ? "flex h-14 w-14 items-center justify-center rounded-2xl border border-edition-primary/20 bg-edition-primary/10 text-sm font-black text-edition-primary"
                    : "block"
                }
                title="SchedNest Dashboard"
              >
                {isSidebarCollapsed ? (
                  "SN"
                ) : (
                  <>
                    <p className="torogoz-wordmark text-sm font-black uppercase tracking-[0.3em]">
                      SchedNest
                    </p>

                    <h1 className="mt-2 text-2xl font-black text-white">
                      {t("brand.founder", "SchedNest Founder")}
                    </h1>
                  </>
                )}
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={
                  isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                {isSidebarCollapsed ? "›" : "‹"}
              </button>
            </div>

            {isSidebarCollapsed ? (
              <div
                className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                title={userEmail || "Loading..."}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-edition-primary text-sm font-black text-black">
                  {userEmail?.charAt(0).toUpperCase() || "?"}
                </div>

                {isSchedNestAdmin && (
                  <span className="h-2 w-2 rounded-full bg-edition-primary-hover" />
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold text-gray-500">{t("common.signedInAs", "Signed in as")}</p>

                <p className="mt-1 break-words text-sm font-black text-white">
                  {userEmail || "Loading..."}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-edition-primary px-3 py-1 text-xs font-black text-black">
                    complete
                  </span>

                  {isSchedNestAdmin && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-edition-primary">
                      admin
                    </span>
                  )}

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300">
                    beta
                  </span>
                </div>
              </div>
            )}

            <nav
              className={`mt-6 grid gap-2 ${
                isSidebarCollapsed ? "justify-center" : ""
              }`}
            >
              {visibleNavItems.map((item) => {
                const itemLabel = t(navLabelKeys[item.href] || item.label, item.label);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={itemLabel}
                    aria-label={itemLabel}
                    className={
                      isSidebarCollapsed
                        ? getCollapsedNavLinkClass(item.href)
                        : getNavLinkClass(item.href)
                    }
                  >
                    {isSidebarCollapsed ? item.shortLabel : itemLabel}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className={
                isSidebarCollapsed
                  ? "mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                  : "mt-8 w-full rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              }
            >
              {isSidebarCollapsed ? "↩" : t("common.logout", "Log out")}
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-black/20 px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard">
                <p className="torogoz-wordmark text-xs font-black uppercase tracking-[0.3em]">
                  SchedNest
                </p>
                <p className="text-lg font-black text-white">{t("nav.dashboard", "Dashboard")}</p>
              </Link>

              <div className="flex items-center gap-2">
                <LanguageSwitcher />
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
              <div className="mt-4 rounded-[2rem] border border-white/10 bg-surface-dark-raised p-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs font-bold text-gray-500">
                    Signed in as
                  </p>

                  <p className="mt-1 break-words text-sm font-black text-white">
                    {userEmail || "Loading..."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-edition-primary px-3 py-1 text-xs font-black text-black">
                      complete
                    </span>

                    {isSchedNestAdmin && (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-edition-primary">
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
                      className={getNavLinkClass(item.href)}
                    >
                      {t(navLabelKeys[item.href] || item.label, item.label)}
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
            <div className="relative z-40 mb-6 hidden justify-end gap-3 lg:flex">
              <LanguageSwitcher />
              <NotificationBell variant="top" />
            </div>

            <div className="relative z-0">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
