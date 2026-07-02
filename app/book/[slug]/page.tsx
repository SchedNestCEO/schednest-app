"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type PublicBusiness = {
 id: string;
 business_name: string | null;
 slug: string | null;
 timezone: string | null;
};

type PublicService = {
 id: string;
 name: string;
 description: string | null;
 price: number | null;
 duration_minutes: number | null;
};

type PublicHour = {
 day_of_week: number;
 is_open: boolean;
 open_time: string | null;
 close_time: string | null;
};

type PublicBookingPageData = {
 business: PublicBusiness;
 services: PublicService[];
 business_hours: PublicHour[];
};

const days = [
 "Sunday",
 "Monday",
 "Tuesday",
 "Wednesday",
 "Thursday",
 "Friday",
 "Saturday",
];

function toTimeLabel(value: string | null) {
 if (!value) return "";
 return value.slice(0, 5);
}

export default function PublicBookingPage() {
 const params = useParams<{ slug: string }>();
 const slug = params?.slug || "";
 const supabase = useMemo(() => createClient(), []);

 const [pageData, setPageData] = useState<PublicBookingPageData | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const [successMessage, setSuccessMessage] = useState("");

 const [selectedServiceId, setSelectedServiceId] = useState("");
 const [customerName, setCustomerName] = useState("");
 const [customerPhone, setCustomerPhone] = useState("");
 const [customerEmail, setCustomerEmail] = useState("");
 const [bookingDate, setBookingDate] = useState("");
 const [bookingTime, setBookingTime] = useState("");
 const [notes, setNotes] = useState("");

 async function loadPage() {
 setIsLoading(true);
 setErrorMessage("");

 const { data, error } = await supabase.rpc("get_public_booking_page", {
 p_slug: slug,
 });

 if (error) {
 setErrorMessage(error.message);
 setIsLoading(false);
 return;
 }

 if (!data) {
 setErrorMessage("Booking page not found.");
 setIsLoading(false);
 return;
 }

 const typedData = data as PublicBookingPageData;

 setPageData(typedData);

 if (typedData.services.length > 0) {
 setSelectedServiceId(typedData.services[0].id);
 }

 setIsLoading(false);
 }

 async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
 event.preventDefault();

 if (!pageData) {
 setErrorMessage("Booking page not loaded.");
 return;
 }

 if (!selectedServiceId) {
 setErrorMessage("Please select a service.");
 return;
 }

 if (!customerName.trim()) {
 setErrorMessage("Please enter your name.");
 return;
 }

 if (!bookingDate || !bookingTime) {
 setErrorMessage("Please choose a date and time.");
 return;
 }

 setIsSubmitting(true);
 setErrorMessage("");
 setSuccessMessage("");

 const startDateTime = new Date(`${bookingDate}T${bookingTime}`);

 const { data, error } = await supabase.rpc("create_public_booking", {
 p_business_id: pageData.business.id,
 p_service_id: selectedServiceId,
 p_customer_name: customerName,
 p_customer_phone: customerPhone,
 p_customer_email: customerEmail,
 p_start_time: startDateTime.toISOString(),
 p_notes: notes,
 });

 if (error) {
 setErrorMessage(error.message);
 setIsSubmitting(false);
 return;
 }

 const bookingResult = data as { id?: string } | null;

 if (bookingResult?.id) {
 await fetch("/api/booking-notifications", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 bookingId: bookingResult.id,
 eventType: "booking.requested",
 }),
 });
 }

 setSuccessMessage(
 "Your booking request was sent. The business will confirm your appointment."
 );
 setCustomerName("");
 setCustomerPhone("");
 setCustomerEmail("");
 setBookingDate("");
 setBookingTime("");
 setNotes("");

 setIsSubmitting(false);
 }

 useEffect(() => {
 if (slug) {
 loadPage();
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [slug]);

 if (isLoading) {
 return (
 <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
 <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
 <p className="text-sm text-gray-400">Loading booking page...</p>
 </div>
 </main>
 );
 }

 if (!pageData) {
 return (
 <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
 <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
 <h1 className="text-2xl font-bold">Booking page unavailable</h1>
 <p className="mt-3 text-sm text-gray-400">{errorMessage}</p>
 </div>
 </main>
 );
 }

 return (
 <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
 <div className="mx-auto max-w-4xl space-y-6">
 <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
 <p className="text-sm font-semibold text-emerald-300">
 SchedNest Booking
 </p>
 <h1 className="mt-3 text-4xl font-black">
 Book with {pageData.business.business_name || "this business"}
 </h1>
 <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
 Choose a service and request a time. Your appointment will be marked
 pending until confirmed.
 </p>
 </section>

 <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
 <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
 <p className="text-sm font-semibold text-emerald-300">
 Business Hours
 </p>

 <div className="mt-4 space-y-3">
 {pageData.business_hours.length === 0 && (
 <p className="text-sm text-gray-400">
 Hours have not been added yet.
 </p>
 )}

 {pageData.business_hours.map((hour) => (
 <div
 key={hour.day_of_week}
 className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3 text-sm"
 >
 <span className="font-medium text-gray-200">
 {days[hour.day_of_week]}
 </span>
 <span className="text-gray-400">
 {hour.is_open
 ? `${toTimeLabel(hour.open_time)} - ${toTimeLabel(
 hour.close_time
 )}`
 : "Closed"}
 </span>
 </div>
 ))}
 </div>
 </div>

 <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
 <p className="text-sm font-semibold text-emerald-300">
 Request Appointment
 </p>
 <h2 className="mt-3 text-2xl font-bold">
 Choose your booking details
 </h2>

 <form onSubmit={submitBooking} className="mt-6 grid gap-4">
 <div>
 <label className="text-sm font-medium text-gray-300">
 Service
 </label>
 <select
 value={selectedServiceId}
 onChange={(event) => setSelectedServiceId(event.target.value)}
 className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
 >
 {pageData.services.map((service) => (
 <option key={service.id} value={service.id}>
 {service.name} — ${service.price ?? 0} —{" "}
 {service.duration_minutes ?? 60} min
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-sm font-medium text-gray-300">
 Your name
 </label>
 <input
 value={customerName}
 onChange={(event) => setCustomerName(event.target.value)}
 placeholder="Your full name"
 className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
 />
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label className="text-sm font-medium text-gray-300">
 Phone
 </label>
 <input
 value={customerPhone}
 onChange={(event) => setCustomerPhone(event.target.value)}
 placeholder="Phone number"
 className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
 />
 </div>

 <div>
 <label className="text-sm font-medium text-gray-300">
 Email
 </label>
 <input
 value={customerEmail}
 onChange={(event) => setCustomerEmail(event.target.value)}
 type="email"
 placeholder="Email address"
 className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
 />
 </div>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label className="text-sm font-medium text-gray-300">
 Date
 </label>
 <input
 value={bookingDate}
 onChange={(event) => setBookingDate(event.target.value)}
 type="date"
 className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
 />
 </div>

 <div>
 <label className="text-sm font-medium text-gray-300">
 Time
 </label>
 <input
 value={bookingTime}
 onChange={(event) => setBookingTime(event.target.value)}
 type="time"
 className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
 />
 </div>
 </div>

 <div>
 <label className="text-sm font-medium text-gray-300">
 Notes
 </label>
 <textarea
 value={notes}
 onChange={(event) => setNotes(event.target.value)}
 placeholder="Anything the business should know?"
 className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
 />
 </div>

 {errorMessage && (
 <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
 {errorMessage}
 </p>
 )}

 {successMessage && (
 <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
 {successMessage}
 </p>
 )}

 <button
 type="submit"
 disabled={isSubmitting || pageData.services.length === 0}
 className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {isSubmitting ? "Sending request..." : "Request booking"}
 </button>
 </form>
 </div>
 </section>
 </div>
 </main>
 );
}