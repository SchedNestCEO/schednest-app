"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Preferences = {
  large_text: boolean;
  high_contrast: boolean;
  simplified_navigation: boolean;
  reduced_motion: boolean;
  voice_reminders: boolean;
  email_reminders: boolean;
  sms_reminders: boolean;
  preferred_language: string;
};

const defaults: Preferences = {
  large_text: false,
  high_contrast: false,
  simplified_navigation: false,
  reduced_motion: false,
  voice_reminders: false,
  email_reminders: true,
  sms_reminders: false,
  preferred_language: "English",
};

const options: Array<[keyof Preferences, string, string]> = [
  ["large_text", "Large text", "Increase text size across Med screens."],
  ["high_contrast", "High contrast", "Make borders and text easier to distinguish."],
  ["simplified_navigation", "Simplified navigation", "Reduce the number of visible navigation choices."],
  ["reduced_motion", "Reduced motion", "Limit movement and animated transitions."],
  ["voice_reminders", "Voice reminders", "Enable spoken reminder support when available."],
  ["email_reminders", "Email reminders", "Send care reminders by email."],
  ["sms_reminders", "Text reminders", "Send care reminders by text message."],
];

export default function AccessibilityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPreferences = useCallback(async () => {
    setLoading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("med_accessibility_preferences")
      .select(
        "large_text, high_contrast, simplified_navigation, reduced_motion, voice_reminders, email_reminders, sms_reminders, preferred_language"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setPreferences(data ? (data as Preferences) : defaults);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPreferences();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPreferences]);

  async function savePreferences() {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setErrorMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("med_accessibility_preferences")
      .upsert(
        {
          owner_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" }
      );

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Accessibility preferences saved.");
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Family care workspace"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Easier to use
        </p>
        <h2 className="mt-3 text-4xl font-black">Accessibility</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          Personalize SchedNest Med for older adults, caregivers, and users with different accessibility needs.
        </p>
      </section>

      <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Loading preferences...</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {options.map(([key, title, description]) => (
                <label
                  key={key}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div>
                    <p className="font-black">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences[key])}
                    onChange={(event) =>
                      setPreferences((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    className="mt-1 h-5 w-5"
                  />
                </label>
              ))}
            </div>

            <label className="mt-5 block max-w-md">
              <span className="text-sm font-black text-gray-300">
                Preferred language
              </span>
              <select
                value={preferences.preferred_language}
                onChange={(event) =>
                  setPreferences((current) => ({
                    ...current,
                    preferred_language: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <option>English</option>
                <option>Spanish</option>
              </select>
            </label>

            {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
            {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

            <button
              type="button"
              onClick={() => void savePreferences()}
              disabled={saving}
              className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </>
        )}
      </section>
    </ProductShell>
  );
}
