"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type ProfileSettings = {
  display_name: string;
  preferred_name: string;
  phone: string;
  timezone: string;
  locale: string;
  preferred_language: string;
  date_format: string;
  time_format: "12h" | "24h";
  week_starts_on: number;
};

type PrivacySettings = {
  analytics_enabled: boolean;
  personalization_enabled: boolean;
  product_cross_context_enabled: boolean;
  allow_birdy_learning: boolean;
  allow_sensitive_memory: boolean;
  allow_usage_improvement: boolean;
  default_sharing_scope:
    | "private"
    | "approved_people"
    | "workspace";
  data_retention_days: number | null;
};

type AccessibilitySettings = {
  large_text: boolean;
  high_contrast: boolean;
  reduced_motion: boolean;
  simplified_navigation: boolean;
  screen_reader_optimized: boolean;
  plain_language: boolean;
  larger_controls: boolean;
};

const defaultProfile: ProfileSettings = {
  display_name: "",
  preferred_name: "",
  phone: "",
  timezone:
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  locale: "en-US",
  preferred_language: "English",
  date_format: "MM/DD/YYYY",
  time_format: "12h",
  week_starts_on: 0,
};

const defaultPrivacy: PrivacySettings = {
  analytics_enabled: true,
  personalization_enabled: true,
  product_cross_context_enabled: false,
  allow_birdy_learning: true,
  allow_sensitive_memory: false,
  allow_usage_improvement: false,
  default_sharing_scope: "private",
  data_retention_days: null,
};

const defaultAccessibility: AccessibilitySettings = {
  large_text: false,
  high_contrast: false,
  reduced_motion: false,
  simplified_navigation: false,
  screen_reader_optimized: false,
  plain_language: false,
  larger_controls: false,
};

export default function UnifiedSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] =
    useState<ProfileSettings>(defaultProfile);
  const [privacy, setPrivacy] =
    useState<PrivacySettings>(defaultPrivacy);
  const [accessibility, setAccessibility] =
    useState<AccessibilitySettings>(defaultAccessibility);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const [profileResult, privacyResult, accessibilityResult] =
      await Promise.all([
        supabase
          .from("platform_profiles")
          .select(
            "display_name, preferred_name, phone, timezone, locale, preferred_language, date_format, time_format, week_starts_on"
          )
          .eq("owner_id", user.id)
          .maybeSingle(),
        supabase
          .from("platform_privacy_settings")
          .select(
            "analytics_enabled, personalization_enabled, product_cross_context_enabled, allow_birdy_learning, allow_sensitive_memory, allow_usage_improvement, default_sharing_scope, data_retention_days"
          )
          .eq("owner_id", user.id)
          .maybeSingle(),
        supabase
          .from("platform_accessibility_settings")
          .select(
            "large_text, high_contrast, reduced_motion, simplified_navigation, screen_reader_optimized, plain_language, larger_controls"
          )
          .eq("owner_id", user.id)
          .maybeSingle(),
      ]);

    const firstError =
      profileResult.error ||
      privacyResult.error ||
      accessibilityResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setProfile(
      profileResult.data
        ? (profileResult.data as ProfileSettings)
        : defaultProfile
    );
    setPrivacy(
      privacyResult.data
        ? (privacyResult.data as PrivacySettings)
        : defaultPrivacy
    );
    setAccessibility(
      accessibilityResult.data
        ? (accessibilityResult.data as AccessibilitySettings)
        : defaultAccessibility
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSettings]);

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setErrorMessage("You must be signed in.");
      return;
    }

    const now = new Date().toISOString();

    const [profileResult, privacyResult, accessibilityResult] =
      await Promise.all([
        supabase
          .from("platform_profiles")
          .upsert(
            {
              owner_id: user.id,
              ...profile,
              updated_at: now,
            },
            { onConflict: "owner_id" }
          ),
        supabase
          .from("platform_privacy_settings")
          .upsert(
            {
              owner_id: user.id,
              ...privacy,
              updated_at: now,
            },
            { onConflict: "owner_id" }
          ),
        supabase
          .from("platform_accessibility_settings")
          .upsert(
            {
              owner_id: user.id,
              ...accessibility,
              updated_at: now,
            },
            { onConflict: "owner_id" }
          ),
      ]);

    setSaving(false);

    const firstError =
      profileResult.error ||
      privacyResult.error ||
      accessibilityResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      return;
    }

    setMessage("Settings saved.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-gray-400">Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-indigo-400/20 bg-indigo-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-indigo-300">
            SchedNest Platform
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Unified Settings
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            One place for account, privacy, accessibility, and Birdy controls.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black">Profile</h2>

            <div className="mt-5 grid gap-4">
              <input
                value={profile.display_name}
                onChange={(e) =>
                  setProfile((c) => ({
                    ...c,
                    display_name: e.target.value,
                  }))
                }
                placeholder="Display name"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <input
                value={profile.preferred_name}
                onChange={(e) =>
                  setProfile((c) => ({
                    ...c,
                    preferred_name: e.target.value,
                  }))
                }
                placeholder="Preferred name"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <input
                value={profile.phone}
                onChange={(e) =>
                  setProfile((c) => ({
                    ...c,
                    phone: e.target.value,
                  }))
                }
                placeholder="Phone"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <input
                value={profile.timezone}
                onChange={(e) =>
                  setProfile((c) => ({
                    ...c,
                    timezone: e.target.value,
                  }))
                }
                placeholder="Timezone"
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <select
                value={profile.preferred_language}
                onChange={(e) =>
                  setProfile((c) => ({
                    ...c,
                    preferred_language: e.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <option>English</option>
                <option>Spanish</option>
              </select>

              <select
                value={profile.time_format}
                onChange={(e) =>
                  setProfile((c) => ({
                    ...c,
                    time_format: e.target.value as "12h" | "24h",
                  }))
                }
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <option value="12h">12-hour time</option>
                <option value="24h">24-hour time</option>
              </select>
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-black">Privacy and Birdy</h2>

            <div className="mt-5 space-y-3">
              {(
                [
                  ["analytics_enabled", "Analytics"],
                  ["personalization_enabled", "Personalization"],
                  ["product_cross_context_enabled", "Cross-product context"],
                  ["allow_birdy_learning", "Birdy learning"],
                  ["allow_sensitive_memory", "Sensitive memory"],
                  ["allow_usage_improvement", "Use data to improve SchedNest"],
                ] as Array<[keyof PrivacySettings, string]>
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-3 py-3"
                >
                  <span className="text-sm text-gray-300">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(privacy[key])}
                    onChange={(e) =>
                      setPrivacy((current) => ({
                        ...current,
                        [key]: e.target.checked,
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <select
              value={privacy.default_sharing_scope}
              onChange={(e) =>
                setPrivacy((c) => ({
                  ...c,
                  default_sharing_scope:
                    e.target.value as PrivacySettings["default_sharing_scope"],
                }))
              }
              className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
            >
              <option value="private">Private by default</option>
              <option value="approved_people">Approved people</option>
              <option value="workspace">Workspace</option>
            </select>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 xl:col-span-2">
            <h2 className="text-xl font-black">Accessibility</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(
                [
                  ["large_text", "Large text"],
                  ["high_contrast", "High contrast"],
                  ["reduced_motion", "Reduced motion"],
                  ["simplified_navigation", "Simplified navigation"],
                  ["screen_reader_optimized", "Screen reader optimized"],
                  ["plain_language", "Plain language"],
                  ["larger_controls", "Larger controls"],
                ] as Array<[keyof AccessibilitySettings, string]>
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-3 py-3"
                >
                  <span className="text-sm text-gray-300">{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(accessibility[key])}
                    onChange={(e) =>
                      setAccessibility((current) => ({
                        ...current,
                        [key]: e.target.checked,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </article>
        </section>

        {message ? (
          <p className="mt-6 text-emerald-200">{message}</p>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 text-red-200">{errorMessage}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={saving}
          className="mt-6 rounded-2xl border border-indigo-300/20 bg-indigo-300/10 px-5 py-3 text-sm font-black text-indigo-100"
        >
          {saving ? "Saving..." : "Save all settings"}
        </button>
      </div>
    </main>
  );
}
