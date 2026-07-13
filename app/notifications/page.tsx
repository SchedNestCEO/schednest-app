"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type PlatformNotification = {
  id: string;
  product: "platform" | "student" | "teams" | "med" | "business" | "life";
  notification_type: string;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  body: string | null;
  action_url: string | null;
  status:
    | "pending"
    | "scheduled"
    | "sent"
    | "read"
    | "acknowledged"
    | "cancelled"
    | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

type NotificationPreferences = {
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  digest_mode: "instant" | "hourly" | "daily";
};

const defaultPreferences: NotificationPreferences = {
  in_app_enabled: true,
  email_enabled: true,
  sms_enabled: false,
  push_enabled: false,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  digest_mode: "instant",
};

const productLabels = {
  platform: "Platform",
  student: "Student",
  teams: "Teams",
  med: "Med",
  business: "Business",
  life: "Life",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(defaultPreferences);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view notifications.");
      setLoading(false);
      return;
    }

    const [notificationsResult, preferencesResult] = await Promise.all([
      supabase
        .from("platform_notifications")
        .select(
          "id, product, notification_type, severity, title, body, action_url, status, scheduled_for, sent_at, read_at, acknowledged_at, created_at"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("platform_notification_preferences")
        .select(
          "in_app_enabled, email_enabled, sms_enabled, push_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone, digest_mode"
        )
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

    const firstError = notificationsResult.error || preferencesResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setNotifications(
      (notificationsResult.data || []) as PlatformNotification[]
    );

    setPreferences(
      preferencesResult.data
        ? (preferencesResult.data as NotificationPreferences)
        : defaultPreferences
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function markRead(id: string) {
    const { error } = await supabase.rpc(
      "mark_platform_notification_read",
      {
        target_notification_id: id,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "acknowledged"
                  ? item.status
                  : "read",
              read_at: item.read_at || new Date().toISOString(),
            }
          : item
      )
    );
  }

  async function acknowledge(id: string) {
    const { error } = await supabase.rpc(
      "acknowledge_platform_notification",
      {
        target_notification_id: id,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "acknowledged",
              read_at: item.read_at || new Date().toISOString(),
              acknowledged_at:
                item.acknowledged_at || new Date().toISOString(),
            }
          : item
      )
    );
  }

  async function markAllRead() {
    const unread = notifications.filter(
      (item) => !item.read_at && item.status !== "acknowledged"
    );

    for (const item of unread) {
      await markRead(item.id);
    }

    setMessage("All notifications marked as read.");
  }

  async function savePreferences() {
    setSavingPreferences(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSavingPreferences(false);
      setErrorMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("platform_notification_preferences")
      .upsert(
        {
          owner_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "owner_id",
        }
      );

    setSavingPreferences(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Notification preferences saved.");
  }

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") {
      return !item.read_at && item.status !== "acknowledged";
    }

    if (filter === "critical") {
      return item.severity === "critical";
    }

    return true;
  });

  const unreadCount = notifications.filter(
    (item) => !item.read_at && item.status !== "acknowledged"
  ).length;

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            SchedNest Platform
          </p>

          <h1 className="mt-3 text-4xl font-black">Notifications</h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            One inbox for Student, Teams, Med, Business, Life, and Birdy.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Inbox</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {unreadCount} unread
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["all", "unread", "critical"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black ${
                      filter === value
                        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 text-gray-500"
                    }`}
                  >
                    {value}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                >
                  Mark all read
                </button>
              </div>
            </div>

            {message ? (
              <p className="mt-4 text-sm text-emerald-200">{message}</p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 text-sm text-red-200">{errorMessage}</p>
            ) : null}

            {loading ? (
              <p className="mt-6 text-sm text-gray-400">
                Loading notifications...
              </p>
            ) : filteredNotifications.length === 0 ? (
              <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
                <p className="font-black">No notifications here</p>
                <p className="mt-2 text-sm text-gray-500">
                  Product alerts and Birdy updates will appear in this inbox.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredNotifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={`rounded-[1.5rem] border p-5 ${
                      notification.read_at
                        ? "border-white/10 bg-black/10"
                        : "border-emerald-300/20 bg-emerald-300/[0.06]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                            {productLabels[notification.product]}
                          </span>

                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                            {notification.severity}
                          </span>
                        </div>

                        <h3 className="mt-3 font-black">
                          {notification.title}
                        </h3>

                        {notification.body ? (
                          <p className="mt-2 text-sm leading-6 text-gray-400">
                            {notification.body}
                          </p>
                        ) : null}

                        <p className="mt-3 text-xs text-gray-600">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!notification.read_at ? (
                          <button
                            type="button"
                            onClick={() => void markRead(notification.id)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                          >
                            Mark read
                          </button>
                        ) : null}

                        {notification.status !== "acknowledged" ? (
                          <button
                            type="button"
                            onClick={() => void acknowledge(notification.id)}
                            className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100"
                          >
                            Acknowledge
                          </button>
                        ) : null}

                        {notification.action_url ? (
                          <Link
                            href={notification.action_url}
                            onClick={() => void markRead(notification.id)}
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300"
                          >
                            Open
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black">Preferences</h2>

            <div className="mt-5 space-y-3">
              {(
                [
                  ["in_app_enabled", "In-app"],
                  ["email_enabled", "Email"],
                  ["sms_enabled", "SMS"],
                  ["push_enabled", "Push"],
                  ["quiet_hours_enabled", "Quiet hours"],
                ] as Array<[keyof NotificationPreferences, string]>
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
                >
                  <span className="text-sm font-bold text-gray-300">
                    {label}
                  </span>

                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            {preferences.quiet_hours_enabled ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  type="time"
                  value={preferences.quiet_hours_start || ""}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      quiet_hours_start: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                />

                <input
                  type="time"
                  value={preferences.quiet_hours_end || ""}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      quiet_hours_end: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                />
              </div>
            ) : null}

            <label className="mt-4 block">
              <span className="text-sm font-bold text-gray-300">
                Digest mode
              </span>

              <select
                value={preferences.digest_mode}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    digest_mode: event.target
                      .value as NotificationPreferences["digest_mode"],
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <option value="instant">Instant</option>
                <option value="hourly">Hourly digest</option>
                <option value="daily">Daily digest</option>
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-gray-300">
                Time zone
              </span>

              <input
                value={preferences.timezone}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    timezone: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />
            </label>

            <button
              type="button"
              onClick={() => void savePreferences()}
              disabled={savingPreferences}
              className="mt-5 w-full rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-3 text-sm font-black text-emerald-100"
            >
              {savingPreferences ? "Saving..." : "Save preferences"}
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}
