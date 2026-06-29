import DashboardShell from "../components/DashboardShell";

export default function CustomersPage() {
return (
<DashboardShell
title="Customers"
subtitle="Keep track of customers, contact info, visit history, and follow-ups."
>
<div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
<p className="text-sm font-semibold text-emerald-300">Customer List</p>
<h2 className="mt-3 text-2xl font-bold">No customers yet</h2>
<p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
Customers will be created when people submit booking requests or when
the business owner adds them manually.
</p>
</div>
</DashboardShell>
);
}
