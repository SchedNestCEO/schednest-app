"use client";

import Link from "next/link";
import {
  schedNestProducts,
  type SchedNestProduct,
} from "../lib/products/config";

const accentStyles: Record<
  SchedNestProduct["accent"],
  {
    card: string;
    label: string;
    button: string;
  }
> = {
  emerald: {
    card: "border-emerald-400/20 bg-emerald-400/[0.07]",
    label: "text-emerald-300",
    button:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20",
  },
  sky: {
    card: "border-sky-400/20 bg-sky-400/[0.07]",
    label: "text-sky-300",
    button:
      "border-sky-300/20 bg-sky-300/10 text-sky-100 hover:bg-sky-300/20",
  },
  violet: {
    card: "border-violet-400/20 bg-violet-400/[0.07]",
    label: "text-violet-300",
    button:
      "border-violet-300/20 bg-violet-300/10 text-violet-100 hover:bg-violet-300/20",
  },
  rose: {
    card: "border-rose-400/20 bg-rose-400/[0.07]",
    label: "text-rose-300",
    button:
      "border-rose-300/20 bg-rose-300/10 text-rose-100 hover:bg-rose-300/20",
  },
};

export default function ProductHubPage() {
  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-gray-400">
            Internal product hub
          </p>

          <h1 className="mt-3 text-4xl font-black">SchedNest products</h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            A hidden launcher for testing the Business, Student, Teams, and Med
            foundations without exposing unfinished products in public navigation.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {schedNestProducts.map((product) => {
            const styles = accentStyles[product.accent];

            return (
              <article
                key={product.key}
                className={`rounded-[2rem] border p-6 ${styles.card}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`text-xs font-black uppercase tracking-[0.22em] ${styles.label}`}
                    >
                      {product.key}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {product.name}
                    </h2>
                  </div>

                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-gray-300">
                    {product.publicLaunch ? "Public" : "Hidden"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-300/70">
                  {product.description}
                </p>

                <Link
                  href={product.href}
                  className={`mt-6 inline-flex rounded-2xl border px-4 py-3 text-sm font-black transition ${styles.button}`}
                >
                  Open {product.name}
                </Link>
              </article>
            );
          })}
        </section>

        <section className="mt-6 rounded-[2rem] border border-amber-300/15 bg-amber-300/[0.05] p-6">
          <h2 className="text-lg font-black text-amber-100">
            Internal-only route
          </h2>

          <p className="mt-3 text-sm leading-6 text-amber-50/60">
            Keep this route out of the public navigation until the unfinished
            product versions are ready for launch.
          </p>
        </section>
      </div>
    </main>
  );
}
