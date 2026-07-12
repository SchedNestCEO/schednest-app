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
  accent: "sky" | "violet" | "rose";
  navItems: ProductNavItem[];
  children: React.ReactNode;
};

const accentMap = {
  sky: {
    text: "text-sky-300",
    border: "border-sky-400/20",
    bg: "bg-sky-400/10",
    active: "bg-sky-400/15 text-sky-100 border-sky-300/20",
  },
  violet: {
    text: "text-violet-300",
    border: "border-violet-400/20",
    bg: "bg-violet-400/10",
    active: "bg-violet-400/15 text-violet-100 border-violet-300/20",
  },
  rose: {
    text: "text-rose-300",
    border: "border-rose-400/20",
    bg: "bg-rose-400/10",
    active: "bg-rose-400/15 text-rose-100 border-rose-300/20",
  },
} as const;

export default function ProductShell({
  productName,
  productLabel,
  accent,
  navItems,
  children,
}: ProductShellProps) {
  const pathname = usePathname();
  const styles = accentMap[accent];

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <header className={`border-b ${styles.border} ${styles.bg}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${styles.text}`}>
              {productLabel}
            </p>
            <h1 className="mt-1 text-2xl font-black">{productName}</h1>
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
                      ? styles.active
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

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
