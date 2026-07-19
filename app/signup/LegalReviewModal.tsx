"use client";

import { useEffect, useRef, useState } from "react";

type LegalReviewModalProps = {
  isOpen: boolean;
  title: string;
  version: string;
  sections: {
    title: string;
    body: string[];
  }[];
  onClose: () => void;
  onComplete: (completedAt: string) => void;
};

export default function LegalReviewModal({
  isOpen,
  title,
  version,
  sections,
  onClose,
  onComplete,
}: LegalReviewModalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = window.setTimeout(() => {
      setHasReachedBottom(false);

      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  if (!isOpen) return null;

  function handleScroll() {
    const element = scrollRef.current;

    if (!element) return;

    const bottomReached =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 24;

    if (bottomReached) {
      setHasReachedBottom(true);
    }
  }

  function handleComplete() {
    const completedAt = new Date().toISOString();
    onComplete(completedAt);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#07100d] shadow-[0_20px_100px_rgba(0,0,0,0.6)]">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                Required Review
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>

              <p className="mt-2 text-xs text-gray-500">
                Version: {version}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[58vh] overflow-y-auto px-5 py-6"
        >
          <div className="grid gap-5">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <h3 className="text-lg font-black text-white">
                  {section.title}
                </h3>

                <div className="mt-4 grid gap-3">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm leading-6 text-gray-400"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 p-5">
          {!hasReachedBottom ? (
            <p className="mb-3 text-sm text-gray-400">
              Scroll to the bottom to unlock confirmation.
            </p>
          ) : (
            <p className="mb-3 text-sm font-bold text-emerald-300">
              Review completed. You can confirm this policy.
            </p>
          )}

          <button
            type="button"
            disabled={!hasReachedBottom}
            onClick={handleComplete}
            className="w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            I have reviewed this policy
          </button>
        </div>
      </div>
    </div>
  );
}