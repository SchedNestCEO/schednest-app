"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ProductNavItem = {
  label: string;
  href: string;
};

type ProductShellProps = {
  productName: string;
  productLabel: string;
  navItems: ProductNavItem[];
  children: React.ReactNode;
};

export default function ProductShell({
  productName,
  navItems,
  children,
}: ProductShellProps) {
  const pathname = usePathname();

  return (
    <div className="torogoz-edition-shell torogoz-app-background min-h-screen text-white">
      <div className="torogoz-shell-streaks" aria-hidden="true">
        <span />
        <span />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              SchedNest
            </h1>

            <p className="mt-1 text-sm font-black uppercase tracking-[0.22em] text-edition-primary">
              {productName.replace("SchedNest ", "")}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl border px-4 py-2 text-sm font-black transition ${
                    active
                      ? "border-edition-primary/25 bg-edition-primary/15 text-edition-primary"
                      : "border-white/10 text-gray-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-8">
        {children}
      </main>
    </div>
  );
}
