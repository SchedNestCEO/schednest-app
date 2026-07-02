"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type NotificationBellProps = {
variant?: "mobile" | "top";
};

type BookingNotification = {
id: string;
event_type: string;
recipient_type: string;
recipient_email: string;
subject: string;
status: string;
error_message: string | null;
read_at: string | null;
created_at: string;
};

function BellIcon() {
return (
<svg
aria-hidden="true"
viewBox="0 0 24 24"
className="h-5 w-5"
fill="none"
stroke="currentColor"
strokeWidth="2"
strokeLinecap="round"
strokeLinejoin="round"
>
<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
<path d="M13.73 21a2 2 0 0 1-3.46 0" />
</svg>
);
}

export default function NotificationBell({
variant = "top",
}: NotificationBellProps) {
const supabase = useMemo(() => createClient(), []);
const [isOpen, setIsOpen] = useState(false);
const [notifications, setNotifications] = useState<BookingNotification[]>([]);
const [unreadCount, setUnreadCount] = useState(0);
const [isLoading, setIsLoading] = useState(false);

async function loadNotifications() {
setIsLoading(true);

const { data, error } = await supabase
.from("booking_notifications")
.select(
"id, event_type, recipient_type, recipient_email, subject, status, error_message, read_at, created_at"
)
.eq("recipient_type", "owner")
.order("created_at", { ascending: false })
.limit(10);

if (error) {
console.error("Failed to load notifications:", error.message);
setNotifications([]);
setUnreadCount(0);
setIsLoading(false);
return;
}

const safeData = (data || []) as BookingNotification[];

setNotifications(safeData);
setUnreadCount(safeData.filter((item) => !item.read_at).length);
setIsLoading(false);
}

async function markAllAsRead() {
const unreadIds = notifications
.filter((item) => !item.read_at)
.map((item) => item.id);

if (unreadIds.length === 0) return;

const readAt = new Date().toISOString();

const { error } = await supabase
.from("booking_notifications")
.update({ read_at: readAt })
.in("id", unreadIds);

if (error) {
console.error("Failed to mark notifications as read:", error.message);
return;
}

setNotifications((current) =>
current.map((item) =>
unreadIds.includes(item.id) ? { ...item, read_at: readAt } : item
)
);

setUnreadCount(0);
}

function getTitle(notification: BookingNotification) {
if (notification.status === "failed") return "Notification failed";
if (notification.event_type === "booking.requested") {
return "New booking request";
}
if (notification.event_type === "booking.approved") {
return "Booking approved";
}
if (notification.event_type === "booking.declined") {
return "Booking declined";
}

return "SchedNest update";
}

function getDescription(notification: BookingNotification) {
if (notification.error_message) return notification.error_message;

return notification.subject;
}

function formatDate(value: string) {
return new Date(value).toLocaleString([], {
dateStyle: "short",
timeStyle: "short",
});
}

useEffect(() => {
loadNotifications();

const interval = window.setInterval(() => {
loadNotifications();
}, 30000);

return () => window.clearInterval(interval);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

const buttonClass =
variant === "mobile"
? "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300 transition hover:bg-white/10 hover:text-white"
: "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-gray-300 transition hover:bg-white/10 hover:text-white";

return (
<div className="relative">
<button
type="button"
onClick={() => setIsOpen((current) => !current)}
className={buttonClass}
aria-label="Open notifications"
>
<BellIcon />

{unreadCount > 0 && (
<span className="absolute right-0 top-0 flex h-5 min-w-[1.25rem] translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black text-black">
{unreadCount}
</span>
)}
</button>

{isOpen && (
<div className="absolute right-0 top-full z-50 mt-2 w-[20rem] max-w-[calc(100vw-2rem)]">
<div className="overflow-hidden rounded-3xl border border-white/10 bg-[#07100d] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
<div>
<p className="text-sm font-black text-white">Notifications</p>
<p className="text-xs text-gray-500">
Recent booking activity
</p>
</div>

{unreadCount > 0 && (
<button
type="button"
onClick={markAllAsRead}
className="text-xs font-semibold text-emerald-300 hover:text-emerald-200"
>
Mark read
</button>
)}
</div>

<div className="max-h-80 overflow-y-auto">
{isLoading && notifications.length === 0 ? (
<div className="px-4 py-6 text-sm text-gray-400">
Loading notifications...
</div>
) : notifications.length === 0 ? (
<div className="px-4 py-6 text-sm text-gray-400">
No notifications yet.
</div>
) : (
notifications.map((notification) => (
<div
key={notification.id}
className="border-b border-white/10 px-4 py-3 last:border-b-0"
>
<div className="flex items-start justify-between gap-3">
<div>
<p className="text-sm font-bold text-white">
{getTitle(notification)}
</p>

<p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
{getDescription(notification)}
</p>

<p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-600">
{formatDate(notification.created_at)}
</p>
</div>

{!notification.read_at && (
<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
)}
</div>
</div>
))
)}
</div>

<div className="border-t border-white/10 p-3">
<Link
href="/dashboard/requests"
onClick={() => setIsOpen(false)}
className="block rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
>
Open booking requests
</Link>
</div>
</div>
</div>
)}
</div>
);
}