type BirdyThinkingStatusProps = {
  active: boolean;
};

export function BirdyThinkingStatus({ active }: BirdyThinkingStatusProps) {
  if (!active) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="birdy-thinking-status"
      className="pointer-events-none absolute left-1/2 top-[12%] z-20 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-black/80 px-4 py-2 shadow-[0_0_28px_rgba(34,211,238,0.2)] backdrop-blur-md"
    >
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-cyan-300 motion-safe:animate-pulse motion-reduce:animate-none"
        />
        Birdy is thinking
      </span>
    </div>
  );
}
