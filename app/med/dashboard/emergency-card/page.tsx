"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };

type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

type EmergencyCard = {
  id?: string;
  blood_type: string | null;
  allergies: string | null;
  conditions: string | null;
  emergency_contacts: EmergencyContact[];
  preferred_hospital: string | null;
  primary_provider: string | null;
  insurance_provider: string | null;
  insurance_member_id: string | null;
  notes: string | null;
  share_with_caregivers: boolean;
};

const emptyCard: EmergencyCard = {
  blood_type: "",
  allergies: "",
  conditions: "",
  emergency_contacts: [],
  preferred_hospital: "",
  primary_provider: "",
  insurance_provider: "",
  insurance_member_id: "",
  notes: "",
  share_with_caregivers: true,
};

export default function EmergencyCardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [card, setCard] = useState<EmergencyCard>(emptyCard);
  const [contact, setContact] = useState<EmergencyContact>({
    name: "",
    relationship: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("med_profiles")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      setErrorMessage(profileError?.message || "Open the Med dashboard first.");
      setLoading(false);
      return;
    }

    setProfile(profileData as MedProfile);

    const { data, error } = await supabase
      .from("med_emergency_cards")
      .select(
        "id, blood_type, allergies, conditions, emergency_contacts, preferred_hospital, primary_provider, insurance_provider, insurance_member_id, notes, share_with_caregivers"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setCard(data ? (data as EmergencyCard) : emptyCard);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  function addContact() {
    if (!contact.name.trim() || !contact.phone.trim()) return;

    setCard((current) => ({
      ...current,
      emergency_contacts: [...current.emergency_contacts, contact],
    }));

    setContact({ name: "", relationship: "", phone: "" });
  }

  function removeContact(index: number) {
    setCard((current) => ({
      ...current,
      emergency_contacts: current.emergency_contacts.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  async function saveCard() {
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const payload = {
      owner_id: user.id,
      med_profile_id: profile.id,
      blood_type: card.blood_type?.trim() || null,
      allergies: card.allergies?.trim() || null,
      conditions: card.conditions?.trim() || null,
      emergency_contacts: card.emergency_contacts,
      preferred_hospital: card.preferred_hospital?.trim() || null,
      primary_provider: card.primary_provider?.trim() || null,
      insurance_provider: card.insurance_provider?.trim() || null,
      insurance_member_id: card.insurance_member_id?.trim() || null,
      notes: card.notes?.trim() || null,
      share_with_caregivers: card.share_with_caregivers,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("med_emergency_cards")
      .upsert(payload, { onConflict: "owner_id" })
      .select(
        "id, blood_type, allergies, conditions, emergency_contacts, preferred_hospital, primary_provider, insurance_provider, insurance_member_id, notes, share_with_caregivers"
      )
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCard(data as EmergencyCard);
    setMessage("Emergency card saved.");
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Family care workspace"
      accent="rose"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-rose-300">
          Critical information
        </p>
        <h2 className="mt-3 text-4xl font-black">Emergency Card</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-rose-50/75">
          Keep essential health and emergency contact information together.
        </p>
      </section>

      {loading ? (
        <p className="mt-6 text-sm text-gray-400">Loading emergency card...</p>
      ) : (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-black">Medical information</h3>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                value={card.blood_type || ""}
                onChange={(e) => setCard((c) => ({ ...c, blood_type: e.target.value }))}
                placeholder="Blood type"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                value={card.primary_provider || ""}
                onChange={(e) => setCard((c) => ({ ...c, primary_provider: e.target.value }))}
                placeholder="Primary provider"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                value={card.preferred_hospital || ""}
                onChange={(e) => setCard((c) => ({ ...c, preferred_hospital: e.target.value }))}
                placeholder="Preferred hospital"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                value={card.insurance_provider || ""}
                onChange={(e) => setCard((c) => ({ ...c, insurance_provider: e.target.value }))}
                placeholder="Insurance provider"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                value={card.insurance_member_id || ""}
                onChange={(e) => setCard((c) => ({ ...c, insurance_member_id: e.target.value }))}
                placeholder="Insurance member ID"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2"
              />
            </div>

            <textarea
              value={card.allergies || ""}
              onChange={(e) => setCard((c) => ({ ...c, allergies: e.target.value }))}
              placeholder="Allergies"
              rows={3}
              className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <textarea
              value={card.conditions || ""}
              onChange={(e) => setCard((c) => ({ ...c, conditions: e.target.value }))}
              placeholder="Medical conditions"
              rows={3}
              className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <textarea
              value={card.notes || ""}
              onChange={(e) => setCard((c) => ({ ...c, notes: e.target.value }))}
              placeholder="Additional emergency notes"
              rows={4}
              className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            />

            <label className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
              <span className="text-sm text-gray-300">
                Share this card with accepted caregivers
              </span>
              <input
                type="checkbox"
                checked={card.share_with_caregivers}
                onChange={(e) =>
                  setCard((c) => ({
                    ...c,
                    share_with_caregivers: e.target.checked,
                  }))
                }
              />
            </label>

            {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
            {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

            <button
              type="button"
              onClick={() => void saveCard()}
              disabled={saving}
              className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-5 py-3 text-sm font-black text-rose-100"
            >
              {saving ? "Saving..." : "Save emergency card"}
            </button>
          </div>

          <div className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-black">Emergency contacts</h3>

            <div className="mt-5 space-y-3">
              <input
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                placeholder="Name"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                value={contact.relationship}
                onChange={(e) =>
                  setContact((c) => ({ ...c, relationship: e.target.value }))
                }
                placeholder="Relationship"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
              <input
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                placeholder="Phone"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              />
            </div>

            <button
              type="button"
              onClick={addContact}
              className="mt-4 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black"
            >
              Add contact
            </button>

            <div className="mt-5 space-y-3">
              {card.emergency_contacts.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{item.name}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.relationship || "Emergency contact"}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{item.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="text-xs font-black text-gray-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </ProductShell>
  );
}
