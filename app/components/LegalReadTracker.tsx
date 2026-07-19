"use client";

import { useEffect, useState } from "react";

type LegalReadTrackerProps = {
  storageKey: string;
  label: string;
};

export default function LegalReadTracker({
  storageKey,
  label,
}: LegalReadTrackerProps) {
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    function checkScrollProgress() {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      const isAtBottom = scrollTop + windowHeight >= documentHeight - 80;

      if (isAtBottom) {
        const completedAt = new Date().toISOString();
        window.localStorage.setItem(storageKey, completedAt);
        setIsCompleted(true);
      }
    }

    const timeoutId = window.setTimeout(() => {
      const existingValue = window.localStorage.getItem(storageKey);

      if (existingValue) {
        setIsCompleted(true);
        return;
      }

      window.addEventListener("scroll", checkScrollProgress);
      checkScrollProgress();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", checkScrollProgress);
    };
  }, [storageKey]);

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[#07100d]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {isCompleted ? (
        <p className="text-sm font-bold text-emerald-300">
          {label} reading completed. You may return to signup.
        </p>
      ) : (
        <p className="text-sm leading-6 text-gray-300">
          Please scroll to the bottom to confirm you have reviewed the {label}.
        </p>
      )}
    </div>
  );
}