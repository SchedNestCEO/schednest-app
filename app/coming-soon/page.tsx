import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <main className="torogoz-public-page min-h-screen px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-4xl items-center justify-center">
        <section className="torogoz-public-hero relative w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur-xl sm:px-10 sm:py-16">
          <div className="torogoz-public-streaks" aria-hidden="true">
            <span />
            <span />
          </div>

          <Link href="/" className="inline-block">
            <p className="torogoz-wordmark text-2xl font-black tracking-tight sm:text-3xl">
              SchedNest
            </p>
          </Link>

          <p className="mt-8 text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
            SchedNest Beta
          </p>

          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
            Your Nest is almost ready.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            SchedNest is currently in early testing. If you created an account,
            your dashboard access will open once your workspace is ready.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-black text-white transition hover:bg-white hover:text-black"
            >
              Back to home
            </Link>

            <a
              href="mailto:hello@schednest.com"
              className="rounded-full bg-edition-primary px-6 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover"
            >
              Contact SchedNest
            </a>
          </div>

          <div className="torogoz-public-ribbon" aria-hidden="true" />
        </section>
      </div>
    </main>
  );
}
