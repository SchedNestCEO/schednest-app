import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
        ✦
      </div>

      <h3 className="mt-4 text-xl font-black text-white">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
        {description}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          {actionLabel && actionHref && (
            <Link
              href={actionHref}
              className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
            >
              {actionLabel}
            </Link>
          )}

          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}