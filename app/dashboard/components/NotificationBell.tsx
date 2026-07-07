"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type NotificationBellProps = {
  variant?: "mobile" | "top";
};

type BookingNotification = {
  id: string;
  booking_id: string | null;
  event_type: string;
  recipient_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  read_at: string | null;
  created_at: string;
};

type BookingStatusById = Record<string, string>;

const REQUESTED_EVENT = "booking.requested";

export default function NotificationBell({
  variant = "top",
}: NotificationBellProps) {
  const supabase = useMemo(() => createClient(), []);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<BookingStatusById>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const unreadCount = notifications.length;

  const dropdownPositionClass = variant === "mobile" ? "fixed" : "absolute";

  const dropdownClass =
    variant === "mobile"
      ? "left-4 right-4 top-24 w-auto max-w-none"
      : "right-0 mt-3 w-96";

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("booking_notifications")
      .select(
        "id, booking_id, event_type, recipient_type, recipient_email, subject, status, read_at, created_at"
      )
      .eq("event_type", REQUESTED_EVENT)
      .ilike("subject", "New booking request%")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      setErrorMessage(error.message);
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const nextNotifications = (data || []) as BookingNotification[];
    setNotifications(nextNotifications);

    const bookingIds = Array.from(
      new Set(
        nextNotifications
          .map((notification) => notification.booking_id)
          .filter((bookingId): bookingId is string => Boolean(bookingId))
      )
    );

    if (bookingIds.length > 0) {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("id, status")
        .in("id", bookingIds);

      const nextStatuses: BookingStatusById = {};

      for (const booking of bookingsData || []) {
        if (booking.id && booking.status) {
          nextStatuses[booking.id] = booking.status;
        }
      }

      setBookingStatuses(nextStatuses);
    } else {
      setBookingStatuses({});
    }

    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadNotifications();

    const intervalId = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markNotificationRead(notificationId: string) {
    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from("booking_notifications")
      .update({ read_at: readAt })
      .eq("id", notificationId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNotifications((currentNotifications) =>
      currentNotifications.filter(
        (notification) => notification.id !== notificationId
      )
    );
  }

  async function markAllRead() {
    const unreadIds = notifications.map((notification) => notification.id);

    if (unreadIds.length === 0) return;

    const readAt = new Date().toISOString();

    const { error } = await supabase
      .from("booking_notifications")
      .update({ read_at: readAt })
      .in("id", unreadIds);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNotifications([]);
  }

  async function handleBookingDecision(
    notification: BookingNotification,
    decision: "approve" | "decline"
  ) {
    if (!notification.booking_id) return;

    const actionKey = `${notification.id}-${decision}`;
    const nextStatus = decision === "approve" ? "approved" : "declined";
    const eventType =
      decision === "approve" ? "booking.approved" : "booking.declined";

    setActionLoadingId(actionKey);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again before updating this request.");
      }

      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: nextStatus })
        .eq("id", notification.booking_id);

      if (updateError) {
        throw updateError;
      }

      setBookingStatuses((currentStatuses) => ({
        ...currentStatuses,
        [notification.booking_id as string]: nextStatus,
      }));

      await markNotificationRead(notification.id);

      const response = await fetch("/api/booking-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bookingId: notification.booking_id,
          eventType,
        }),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(
          responseBody?.error ||
            "The request was updated, but the customer notification failed."
        );
      }

      setSuccessMessage(
        decision === "approve"
          ? "Approved. Customer notified."
          : "Declined. Customer notified."
      );

      await loadNotifications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating this request."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  function getTimeLabel(dateString: string) {
    const createdAt = new Date(dateString);
    const now = new Date();
    const differenceInMinutes = Math.floor(
      (now.getTime() - createdAt.getTime()) / 60000
    );

    if (differenceInMinutes < 1) return "Just now";
    if (differenceInMinutes < 60) return `${differenceInMinutes}m ago`;

    const differenceInHours = Math.floor(differenceInMinutes / 60);

    if (differenceInHours < 24) return `${differenceInHours}h ago`;

    const differenceInDays = Math.floor(differenceInHours / 24);
    return `${differenceInDays}d ago`;
  }

  function getStatusLabel(status?: string | null) {
    if (!status) return "Pending";

    if (status === "approved") return "Approved";
    if (status === "declined") return "Declined";
    if (status === "pending") return "Pending";

    return status;
  }

  function getStatusClass(status?: string | null) {
    if (status === "approved") {
      return "bg-emerald-400/15 text-emerald-300";
    }

    if (status === "declined") {
      return "bg-red-400/15 text-red-300";
    }

    return "bg-yellow-400/15 text-yellow-200";
  }

  function canManageRequest(notification: BookingNotification) {
    if (!notification.booking_id) return false;
    if (notification.event_type !== REQUESTED_EVENT) return false;

    const currentStatus = bookingStatuses[notification.booking_id];

    return !currentStatus || currentStatus === "pending";
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/10"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
        >
          <path
            d="M15 17H9m9-2.5V11a6 6 0 0 0-12 0v3.5L4.7 16.8A.8.8 0 0 0 5.4 18h13.2a.8.8 0 0 0 .7-1.2L18 14.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 20a2.2 2.2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-400 px-2 text-xs font-black text-black shadow-[0_0_20px_rgba(52,211,153,0.6)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`${dropdownPositionClass} z-50 rounded-[2rem] border border-white/10 bg-[#07100d] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.65)] ${dropdownClass}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Notifications</p>
              <p className="mt-1 text-xs text-gray-500">
                Unread booking requests.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>

          {successMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-300">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-gray-400">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-bold text-white">
                  No new notifications.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const currentStatus = notification.booking_id
                  ? bookingStatuses[notification.booking_id]
                  : null;

                const isManageable = canManageRequest(notification);

                return (
                  <div
                    key={notification.id}
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4 shadow-[0_0_35px_rgba(52,211,153,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black leading-5 text-white">
                          {notification.subject}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {getTimeLabel(notification.created_at)}
                        </p>
                      </div>

                      {notification.event_type === REQUESTED_EVENT && (
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] ${getStatusClass(
                            currentStatus
                          )}`}
                        >
                          {getStatusLabel(currentStatus)}
                        </span>
                      )}
                    </div>

                    {isManageable && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={actionLoadingId !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBookingDecision(notification, "approve");
                          }}
                          className="rounded-2xl bg-emerald-400 px-4 py-3 text-xs font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoadingId === `${notification.id}-approve`
                            ? "Approving..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          disabled={actionLoadingId !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleBookingDecision(notification, "decline");
                          }}
                          className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-xs font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoadingId === `${notification.id}-decline`
                            ? "Declining..."
                            : "Decline"}
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      {notification.booking_id ? (
                        <Link
                          href="/dashboard/requests"
                          className="text-xs font-black text-emerald-300 transition hover:text-emerald-200"
                        >
                          View request page
                        </Link>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => markNotificationRead(notification.id)}
                        className="text-xs font-bold text-gray-500 transition hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}