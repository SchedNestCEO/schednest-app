"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
};

type Service = {
  id: string;
  name: string;
  price: number | null;
  duration_minutes: number | null;
};

type BookingRequest = {
  id: string;
  business_id: string;
  owner_id: string;
  customer_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  source: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  intake_answers: Record<string, string | boolean> | null;
  created_at: string;
};

type UpdateRequestOptions = {
  confirmedDate?: string;
  confirmedTime?: string;
};

function getDateInputValue(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTimeInputValue(value: string) {
  const date = new Date(value);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

export default function BookingRequestsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<BookingRequest | null>(null);

  const [confirmationDate, setConfirmationDate] = useState("");
  const [confirmationTime, setConfirmationTime] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequests({
    preserveMessage = false,
  }: { preserveMessage?: boolean } = {}) {
    setIsLoading(true);
    setErrorMessage("");

    if (!preserveMessage) {
      setMessage("");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Unable to load user session.");
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("business_profiles")
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Business profile not found.");
      setIsLoading(false);
      return;
    }

    setBusinessProfile(profile);

    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("business_id", profile.id);

    if (serviceError) {
      setErrorMessage(serviceError.message);
      setIsLoading(false);
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from("bookings")
      .select(
        "id, business_id, owner_id, customer_id, service_id, start_time, end_time, status, source, customer_name, customer_phone, customer_email, notes, intake_answers, created_at"
      )
      .eq("business_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestError) {
      setErrorMessage(requestError.message);
      setIsLoading(false);
      return;
    }

    setServices(serviceData || []);
    setRequests(requestData || []);
    setIsLoading(false);
  }

  function openRequestDetails(request: BookingRequest) {
    setSelectedRequest(request);
    setConfirmationDate(getDateInputValue(request.start_time));
    setConfirmationTime(getTimeInputValue(request.start_time));
    setErrorMessage("");
    setMessage("");
  }

  function resetConfirmationTime() {
    if (!selectedRequest) return;

    setConfirmationDate(getDateInputValue(selectedRequest.start_time));
    setConfirmationTime(getTimeInputValue(selectedRequest.start_time));
  }

  async function updateRequestStatus(
    bookingId: string,
    newStatus: "confirmed" | "cancelled",
    options?: UpdateRequestOptions
  ) {
    setIsUpdating(bookingId);
    setErrorMessage("");
    setMessage("");

    const request = requests.find((item) => item.id === bookingId);

    if (newStatus === "confirmed" && options?.confirmedDate && options?.confirmedTime) {
      if (!request) {
        setErrorMessage("Request not found.");
        setIsUpdating(null);
        return;
      }

      const service = getServiceDetails(request.service_id);
      const existingStart = new Date(request.start_time);
      const existingEnd = new Date(request.end_time);
      const existingDurationMinutes = Math.max(
        5,
        Math.round((existingEnd.getTime() - existingStart.getTime()) / 60000)
      );

      const durationMinutes =
        service?.duration_minutes || existingDurationMinutes || 60;

      const newStart = new Date(
        `${options.confirmedDate}T${options.confirmedTime}`
      );

      if (Number.isNaN(newStart.getTime())) {
        setErrorMessage("Please choose a valid confirmation date and time.");
        setIsUpdating(null);
        return;
      }

      const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

      const { error: timeUpdateError } = await supabase
        .from("bookings")
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
        .eq("id", bookingId)
        .eq("business_id", request.business_id);

      if (timeUpdateError) {
        setErrorMessage(timeUpdateError.message);
        setIsUpdating(null);
        return;
      }
    }

    const { error } = await supabase.rpc("approve_booking_request", {
      p_booking_id: bookingId,
      p_new_status: newStatus,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsUpdating(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setMessage(
        newStatus === "confirmed"
          ? "Booking approved, but the customer notification was not sent because your session expired."
          : "Booking declined, but the customer notification was not sent because your session expired."
      );
      setSelectedRequest(null);
      await loadRequests({ preserveMessage: true });
      setIsUpdating(null);
      return;
    }

    const notificationResponse = await fetch("/api/booking-notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        bookingId,
        eventType:
          newStatus === "confirmed" ? "booking.approved" : "booking.declined",
      }),
    });

    const isDifferentConfirmedTime =
      newStatus === "confirmed" &&
      request &&
      options?.confirmedDate &&
      options?.confirmedTime &&
      (options.confirmedDate !== getDateInputValue(request.start_time) ||
        options.confirmedTime !== getTimeInputValue(request.start_time));

    if (!notificationResponse.ok) {
      setMessage(
        newStatus === "confirmed"
          ? "Booking approved, but the email notification was not sent."
          : "Booking declined, but the email notification was not sent."
      );
    } else {
      setMessage(
        newStatus === "confirmed"
          ? isDifferentConfirmedTime
            ? "Booking request approved with updated time and customer notified."
            : "Booking request approved and customer notified."
          : "Booking request declined and customer notified."
      );
    }

    setSelectedRequest(null);
    await loadRequests({ preserveMessage: true });
    setIsUpdating(null);
  }

  function getServiceName(serviceId: string | null) {
    if (!serviceId) return "Service";
    return (
      services.find((service) => service.id === serviceId)?.name || "Service"
    );
  }

  function getServiceDetails(serviceId: string | null) {
    if (!serviceId) return null;
    return services.find((service) => service.id === serviceId) || null;
  }

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatTime(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatRequestedAt(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatMoney(value: number | null) {
    if (value === null || value === undefined) return "Not set";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  function getIntakeEntries(request: BookingRequest | null) {
    if (!request?.intake_answers) return [];

    return Object.entries(request.intake_answers).filter(
      ([, value]) =>
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== false
    );
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedService = selectedRequest
    ? getServiceDetails(selectedRequest.service_id)
    : null;

  const isConfirmingDifferentTime =
    selectedRequest &&
    (confirmationDate !== getDateInputValue(selectedRequest.start_time) ||
      confirmationTime !== getTimeInputValue(selectedRequest.start_time));

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-semibold text-emerald-300">
            Booking Requests
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Review booking requests.
          </h1>

          <h2 className="mt-4 text-2xl font-bold">
            {isLoading
              ? "Loading requests..."
              : `${requests.length} pending request${
                  requests.length === 1 ? "" : "s"
                }`}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Public booking requests come in as pending. Open a request to review
            the customer, service, preferred time, notes, and approve or decline
            from the details drawer.
          </p>

          {businessProfile && (
            <p className="mt-3 text-xs text-gray-500">
              Managing requests for{" "}
              {businessProfile.business_name || "your business"}.
            </p>
          )}

          {errorMessage && (
            <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </p>
          )}
        </div>

        <div className="grid gap-4">
          {isLoading && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
              <p className="text-sm text-gray-400">
                Loading pending requests...
              </p>
            </div>
          )}

          {!isLoading && requests.length === 0 && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                ✦
              </div>

              <h3 className="mt-4 text-xl font-bold text-white">
                No pending requests.
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400">
                When someone requests a booking from your public page, it will
                appear here for review.
              </p>
            </div>
          )}

          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.05]"
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-white">
                      {request.customer_name || "Customer"}
                    </h3>

                    <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-200">
                      Pending
                    </span>

                    {request.customer_id && (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        Customer saved
                      </span>
                    )}

                    {getIntakeEntries(request).length > 0 && (
                      <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-200">
                        Intake included
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-gray-200">
                    {getServiceName(request.service_id)} ·{" "}
                    {formatDateTime(request.start_time)}
                  </p>

                  <p className="mt-1 text-xs font-bold text-emerald-300">
                    {formatTime(request.start_time)} -{" "}
                    {formatTime(request.end_time)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-300">
                    {request.customer_phone && (
                      <span className="rounded-full bg-white/5 px-3 py-1">
                        {request.customer_phone}
                      </span>
                    )}

                    {request.customer_email && (
                      <span className="rounded-full bg-white/5 px-3 py-1">
                        {request.customer_email}
                      </span>
                    )}

                    <span className="rounded-full bg-white/5 px-3 py-1">
                      Source: {request.source || "booking_page"}
                    </span>
                  </div>

                  {request.notes && (
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
                      {request.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openRequestDetails(request)}
                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
                  >
                    View details
                  </button>

                  <button
                    type="button"
                    onClick={() => updateRequestStatus(request.id, "confirmed")}
                    disabled={isUpdating === request.id}
                    className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdating === request.id ? "Updating..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    onClick={() => updateRequestStatus(request.id, "cancelled")}
                    disabled={isUpdating === request.id}
                    className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close request details"
              onClick={() => setSelectedRequest(null)}
              className="hidden flex-1 cursor-default lg:block"
            />

            <div className="h-full w-full overflow-y-auto border-l border-white/10 bg-[#07100d] p-5 shadow-[0_20px_100px_rgba(0,0,0,0.6)] sm:max-w-xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                    Request Details
                  </p>

                  <h2 className="mt-3 text-3xl font-black text-white">
                    {selectedRequest.customer_name || "Customer"}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Requested {formatRequestedAt(selectedRequest.created_at)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-200">
                    Pending
                  </span>

                  {selectedRequest.customer_id && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                      Customer saved
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-300">
                  Review the request before confirming. You can approve the
                  requested time or choose a different time that works better.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm font-black text-emerald-300">
                    Appointment
                  </p>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                        Service
                      </p>
                      <p className="mt-1 text-lg font-black text-white">
                        {getServiceName(selectedRequest.service_id)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                        Customer Requested
                      </p>
                      <p className="mt-1 text-sm font-bold text-white">
                        {formatDateTime(selectedRequest.start_time)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-emerald-300">
                        {formatTime(selectedRequest.start_time)} -{" "}
                        {formatTime(selectedRequest.end_time)}
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-sm font-black text-emerald-300">
                        Confirm time
                      </p>

                      <p className="mt-2 text-xs leading-5 text-gray-400">
                        Keep the requested time or choose a different date/time
                        before approving.
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Confirm Date
                          </label>
                          <input
                            type="date"
                            value={confirmationDate}
                            onChange={(event) =>
                              setConfirmationDate(event.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Confirm Time
                          </label>
                          <input
                            type="time"
                            value={confirmationTime}
                            onChange={(event) =>
                              setConfirmationTime(event.target.value)
                            }
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>

                      {isConfirmingDifferentTime && (
                        <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                          <p className="text-sm font-black text-yellow-200">
                            Confirming a different time
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-300">
                            The booking will be approved using the updated time,
                            and the customer notification will reflect the final
                            appointment time.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={resetConfirmationTime}
                        className="mt-4 rounded-2xl border border-white/10 px-4 py-2 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                      >
                        Reset to requested time
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Duration
                        </p>
                        <p className="mt-1 text-sm font-black text-white">
                          {selectedService?.duration_minutes
                            ? `${selectedService.duration_minutes} minutes`
                            : "Not set"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Price
                        </p>
                        <p className="mt-1 text-sm font-black text-white">
                          {selectedService
                            ? formatMoney(selectedService.price)
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm font-black text-emerald-300">
                    Customer
                  </p>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                        Name
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {selectedRequest.customer_name || "Not provided"}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Phone
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-white">
                          {selectedRequest.customer_phone || "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Email
                        </p>
                        <p className="mt-1 break-words text-sm font-black text-white">
                          {selectedRequest.customer_email || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                        Source
                      </p>
                      <p className="mt-1 text-sm font-black text-white">
                        {selectedRequest.source || "booking_page"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm font-black text-emerald-300">
                    Customer Note
                  </p>

                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-400">
                    {selectedRequest.notes ||
                      "No note was included with this request."}
                  </p>
                </div>

                {getIntakeEntries(selectedRequest).length > 0 && (
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-sm font-black text-emerald-300">
                      Intake Answers
                    </p>

                    <div className="mt-4 grid gap-3">
                      {getIntakeEntries(selectedRequest).map(
                        ([question, answer]) => (
                          <div
                            key={question}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              {question}
                            </p>
                            <p className="mt-2 whitespace-pre-line text-sm font-black text-white">
                              {typeof answer === "boolean"
                                ? answer
                                  ? "Yes"
                                  : "No"
                                : String(answer)}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 mt-6 border-t border-white/10 bg-[#07100d] py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateRequestStatus(selectedRequest.id, "confirmed", {
                        confirmedDate: confirmationDate,
                        confirmedTime: confirmationTime,
                      })
                    }
                    disabled={isUpdating === selectedRequest.id}
                    className="rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdating === selectedRequest.id
                      ? "Approving..."
                      : isConfirmingDifferentTime
                        ? "Approve updated time"
                        : "Approve & notify"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateRequestStatus(selectedRequest.id, "cancelled")
                    }
                    disabled={isUpdating === selectedRequest.id}
                    className="rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-sm font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdating === selectedRequest.id
                      ? "Declining..."
                      : "Decline & notify"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}