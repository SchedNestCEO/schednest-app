"use client";

import ProductShell from "./ProductShell";

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
  navItems: readonly ProductNavItem[];
  items: string[];
};

export default function ProductFeaturePage({
  productName,
  productLabel,
  eyebrow,
  title,
  description,
  navItems,
  items,
}: ProductFeaturePageProps) {
  return (
    <ProductShell
      productName={productName}
      productLabel={productLabel}
      navItems={[...navItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
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
            className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
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
