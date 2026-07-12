"use client";

import ProductShell from "./ProductShell";

type Accent = "sky" | "violet" | "rose";

type ProductNavItem = {
  label: string;
  href: string;
};

type ProductFeaturePageProps = {
  productName: string;
  productLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: Accent;
  navItems: readonly ProductNavItem[];
  items: string[];
};

const accentMap = {
  sky: {
    border: "border-sky-400/20",
    background: "bg-sky-400/10",
    text: "text-sky-300",
    card: "border-sky-200/10",
  },
  violet: {
    border: "border-violet-400/20",
    background: "bg-violet-400/10",
    text: "text-violet-300",
    card: "border-violet-200/10",
  },
  rose: {
    border: "border-rose-400/20",
    background: "bg-rose-400/10",
    text: "text-rose-300",
    card: "border-rose-200/10",
  },
} as const;

export default function ProductFeaturePage({
  productName,
  productLabel,
  eyebrow,
  title,
  description,
  accent,
  navItems,
  items,
}: ProductFeaturePageProps) {
  const styles = accentMap[accent];

  return (
    <ProductShell
      productName={productName}
      productLabel={productLabel}
      accent={accent}
      navItems={[...navItems]}
    >
      <section
        className={`rounded-[2rem] border p-7 ${styles.border} ${styles.background}`}
      >
        <p
          className={`text-sm font-black uppercase tracking-[0.28em] ${styles.text}`}
        >
          {eyebrow}
        </p>

        <h2 className="mt-3 text-4xl font-black">{title}</h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          {description}
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article
            key={item}
            className={`rounded-[2rem] border bg-white/[0.04] p-6 ${styles.card}`}
          >
            <h3 className="text-lg font-black">{item}</h3>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              Foundation placeholder ready for the next build phase.
            </p>
          </article>
        ))}
      </section>
    </ProductShell>
  );
}
