type StatusBadgeProps = {
  status?: string | null;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || "pending";

  const labels: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
    completed: "Completed",
    canceled: "Canceled",
    active: "Active",
    trial: "Trial",
    past_due: "Past Due",
    refunded: "Refunded",
  };

  const classes: Record<string, string> = {
    pending: "bg-yellow-400/15 text-yellow-200 border-yellow-400/20",
    approved: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
    declined: "bg-red-400/15 text-red-300 border-red-400/20",
    completed: "bg-blue-400/15 text-blue-300 border-blue-400/20",
    canceled: "bg-gray-400/15 text-gray-300 border-gray-400/20",
    active: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
    trial: "bg-blue-400/15 text-blue-300 border-blue-400/20",
    past_due: "bg-red-400/15 text-red-300 border-red-400/20",
    refunded: "bg-purple-400/15 text-purple-300 border-purple-400/20",
  };

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.16em] ${
        classes[normalizedStatus] ||
        "border-white/10 bg-white/10 text-gray-300"
      }`}
    >
      {labels[normalizedStatus] || normalizedStatus}
    </span>
  );
}