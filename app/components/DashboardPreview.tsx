const schedule = [
 "9:00 AM · Exterior Detail",
 "11:30 AM · Interior Detail",
 "2:00 PM · Full Detail",
];

const actionItems = [
 "Approve new booking request",
 "Send follow-up to returning customer",
 "Review tomorrow's availability",
];

export default function DashboardPreview() {
 return (
 <div id="dashboard" className="mt-16 w-full max-w-6xl">
 <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_90px_rgba(16,185,129,0.16)] backdrop-blur-xl sm:p-6">
 <div className="rounded-[1.5rem] border border-white/10 bg-[#07110f] p-5 text-left sm:p-6">
 <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <p className="text-sm text-gray-400">Business Hub</p>
 <h2 className="mt-1 text-2xl font-bold">Today at a glance</h2>
 </div>

 <div className="flex items-center gap-2 self-start rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
 <span className="h-2 w-2 rounded-full bg-emerald-300" />
 Birdy is active
 </div>
 </div>

 <div className="mt-6 grid gap-4 lg:grid-cols-12">
 <div className="rounded-2xl border border-white/10 bg-black/30 p-5 lg:col-span-4">
 <p className="text-sm text-gray-400">Bookings Today</p>
 <p className="mt-3 text-5xl font-bold">7</p>
 <p className="mt-3 text-sm text-emerald-300">
 2 pending approval
 </p>
 </div>

 <div className="rounded-2xl border border-white/10 bg-black/30 p-5 lg:col-span-4">
 <p className="text-sm text-gray-400">Next Booking</p>
 <p className="mt-3 text-xl font-semibold">Full Detail</p>
 <p className="mt-1 text-sm text-gray-400">
 2:00 PM · Customer confirmed
 </p>
 </div>

 <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 lg:col-span-4">
 <p className="text-sm text-emerald-300">Birdy noticed</p>
 <p className="mt-3 text-gray-200">
 Friday is filling quickly. Consider opening one more afternoon
 slot.
 </p>
 </div>

 <div className="rounded-2xl border border-white/10 bg-black/30 p-5 lg:col-span-7">
 <div className="flex items-center justify-between">
 <p className="font-semibold">Today&apos;s Schedule</p>
 <p className="text-sm text-gray-400">June 25</p>
 </div>

 <div className="mt-5 space-y-3">
 {schedule.map((item) => (
 <div
 key={item}
 className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300"
 >
 {item}
 </div>
 ))}
 </div>
 </div>

 <div className="rounded-2xl border border-white/10 bg-black/30 p-5 lg:col-span-5">
 <p className="font-semibold">Birdy&apos;s Action Queue</p>

 <div className="mt-5 space-y-3">
 {actionItems.map((item) => (
 <div key={item} className="flex items-start gap-3">
 <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
 <p className="text-sm text-gray-300">{item}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}