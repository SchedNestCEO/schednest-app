"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
  slug: string | null;
};

type Service = {
  id: string;
  business_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
  sample_image_url: string | null;
  sample_caption: string | null;
  show_sample_on_booking_page: boolean | null;
};

type AnyRow = Record<string, unknown>;

type SampleEdit = {
  sample_image_url: string;
  sample_caption: string;
  show_sample_on_booking_page: boolean;
};

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "Price not listed";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getString(row: AnyRow | null, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPlanAccess(subscription: AnyRow | null, plan: AnyRow | null) {
  const status = getString(subscription, ["status"], "").toLowerCase();
  const planName = getString(plan, ["name", "plan_name", "title"], "")
    .toLowerCase()
    .trim();

  const isActive =
    status === "active" ||
    status === "trialing" ||
    status === "trial" ||
    status === "past_due";

  const hasGrowthAccess =
    isActive &&
    (planName.includes("growth") || planName.includes("complete"));

  const hasCompleteAccess = isActive && planName.includes("complete");

  return {
    isActive,
    planName: planName ? formatLabel(planName) : "No plan assigned",
    hasGrowthAccess,
    hasCompleteAccess,
  };
}

function isUsableImageUrl(value: string) {
  const cleanValue = value.trim();

  if (!cleanValue) return true;

  return (
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("/")
  );
}

export default function ServicesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<AnyRow | null>(null);
  const [plan, setPlan] = useState<AnyRow | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingSampleId, setSavingSampleId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");

  const [newSampleImageUrl, setNewSampleImageUrl] = useState("");
  const [newSampleCaption, setNewSampleCaption] = useState("");
  const [newShowSample, setNewShowSample] = useState(false);

  const [sampleEdits, setSampleEdits] = useState<Record<string, SampleEdit>>(
    {}
  );

  const planAccess = getPlanAccess(subscription, plan);

  const activeServices = services.filter((service) => service.is_active);
  const pausedServices = services.filter((service) => !service.is_active);
  const visibleSamples = services.filter(
    (service) =>
      service.show_sample_on_booking_page && service.sample_image_url?.trim()
  );

  const previewBookingHref = businessProfile?.slug
    ? `/book/${businessProfile.slug}`
    : "/dashboard/booking-page";

  async function loadServices() {
    setIsLoading(true);
    setErrorMessage("");

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
      .select("id, owner_id, business_name, slug")
      .eq("owner_id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Business profile not found.");
      setIsLoading(false);
      return;
    }

    const safeProfile = profile as BusinessProfile;
    setBusinessProfile(safeProfile);

    const { data: subscriptionData } = await supabase
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", safeProfile.id)
      .maybeSingle();

    const safeSubscription = (subscriptionData || null) as AnyRow | null;
    setSubscription(safeSubscription);

    const planId = safeSubscription?.plan_id;

    if (typeof planId === "string" && planId) {
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      setPlan((planData || null) as AnyRow | null);
    } else {
      setPlan(null);
    }

    const { data: serviceData, error: servicesError } = await supabase
      .from("services")
      .select(
        "id, business_id, owner_id, name, description, price, duration_minutes, is_active, sample_image_url, sample_caption, show_sample_on_booking_page"
      )
      .eq("business_id", safeProfile.id)
      .order("created_at", { ascending: false });

    if (servicesError) {
      setErrorMessage("Unable to load services.");
      setIsLoading(false);
      return;
    }

    const safeServices = (serviceData || []) as Service[];
    setServices(safeServices);

    const initialSampleEdits: Record<string, SampleEdit> = {};

    safeServices.forEach((service) => {
      initialSampleEdits[service.id] = {
        sample_image_url: service.sample_image_url || "",
        sample_caption: service.sample_caption || "",
        show_sample_on_booking_page:
          service.show_sample_on_booking_page || false,
      };
    });

    setSampleEdits(initialSampleEdits);
    setIsLoading(false);
  }

  async function handleAddService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessProfile) {
      setErrorMessage("Business profile not loaded yet.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Service name is required.");
      return;
    }

    if (planAccess.hasGrowthAccess && !isUsableImageUrl(newSampleImageUrl)) {
      setErrorMessage("Sample image must be a valid image URL.");
      return;
    }

    if (
      planAccess.hasGrowthAccess &&
      newShowSample &&
      !newSampleImageUrl.trim()
    ) {
      setErrorMessage("Add a sample image URL before showing it publicly.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.from("services").insert({
      business_id: businessProfile.id,
      owner_id: businessProfile.owner_id,
      name: name.trim(),
      description: description.trim() || null,
      price: price ? Number(price) : null,
      duration_minutes: durationMinutes ? Number(durationMinutes) : 60,
      is_active: true,
      sample_image_url: planAccess.hasGrowthAccess
        ? newSampleImageUrl.trim() || null
        : null,
      sample_caption: planAccess.hasGrowthAccess
        ? newSampleCaption.trim() || null
        : null,
      show_sample_on_booking_page: planAccess.hasGrowthAccess
        ? newShowSample
        : false,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setDurationMinutes("60");
    setNewSampleImageUrl("");
    setNewSampleCaption("");
    setNewShowSample(false);
    setSuccessMessage("Service added.");

    await loadServices();
    setIsSaving(false);
  }

  async function toggleServiceStatus(service: Service) {
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      service.is_active
        ? "Service paused. It will not appear as active."
        : "Service reactivated."
    );

    await loadServices();
  }

  async function saveServiceSample(service: Service) {
    if (!planAccess.hasGrowthAccess) {
      setErrorMessage("Service samples are available on Growth and Complete.");
      return;
    }

    const edit = sampleEdits[service.id];

    if (!edit) {
      setErrorMessage("Sample details not loaded yet.");
      return;
    }

    if (!isUsableImageUrl(edit.sample_image_url)) {
      setErrorMessage("Sample image must be a valid image URL.");
      return;
    }

    if (edit.show_sample_on_booking_page && !edit.sample_image_url.trim()) {
      setErrorMessage("Add a sample image URL before showing it publicly.");
      return;
    }

    setSavingSampleId(service.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("services")
      .update({
        sample_image_url: edit.sample_image_url.trim() || null,
        sample_caption: edit.sample_caption.trim() || null,
        show_sample_on_booking_page: edit.show_sample_on_booking_page,
      })
      .eq("id", service.id)
      .eq("business_id", service.business_id);

    if (error) {
      setErrorMessage(error.message);
      setSavingSampleId(null);
      return;
    }

    setSuccessMessage("Service sample saved.");
    await loadServices();
    setSavingSampleId(null);
  }

  function updateSampleEdit(
    serviceId: string,
    field: keyof SampleEdit,
    value: string | boolean
  ) {
    setSampleEdits((current) => ({
      ...current,
      [serviceId]: {
        sample_image_url: current[serviceId]?.sample_image_url || "",
        sample_caption: current[serviceId]?.sample_caption || "",
        show_sample_on_booking_page:
          current[serviceId]?.show_sample_on_booking_page || false,
        [field]: value,
      },
    }));
  }

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Services
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Manage your service menu.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Add the services clients can request from your public booking page.
            Keep pricing, duration, availability, and service samples clear so
            customers know exactly what they are booking.
          </p>

          {businessProfile && (
            <p className="mt-3 text-xs text-gray-500">
              Managing services for{" "}
              {businessProfile.business_name || "your business"}.
            </p>
          )}

          {errorMessage && (
            <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Total Services</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : services.length}
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-bold text-emerald-300">Active</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : activeServices.length}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Paused</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : pausedServices.length}
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-bold text-emerald-300">
              Public Samples
            </p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : visibleSamples.length}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Service Menu
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Add a service
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Services become the options customers can choose from when they
              request an appointment.
            </p>

            <form onSubmit={handleAddService} className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Service name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Haircut, Consultation, Mobile Detail"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Briefly describe what is included."
                  className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Price
                  </label>
                  <input
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="25.00"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Duration minutes
                  </label>
                  <input
                    value={durationMinutes}
                    onChange={(event) =>
                      setDurationMinutes(event.target.value)
                    }
                    type="number"
                    min="5"
                    step="5"
                    placeholder="60"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-emerald-300">
                      Service sample
                    </p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Growth and Complete businesses can show a sample image on
                      the public booking page.
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                      planAccess.hasGrowthAccess
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-yellow-400/10 text-yellow-200"
                    }`}
                  >
                    {planAccess.hasGrowthAccess ? "Unlocked" : "Growth"}
                  </span>
                </div>

                {!planAccess.hasGrowthAccess && (
                  <p className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-gray-300">
                    Essentials can add services, pricing, and duration. Growth
                    and Complete can add service samples for a more branded
                    booking page.
                  </p>
                )}

                <div
                  className={`mt-4 grid gap-4 ${
                    !planAccess.hasGrowthAccess ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Sample image URL
                    </label>
                    <input
                      value={newSampleImageUrl}
                      disabled={!planAccess.hasGrowthAccess}
                      onChange={(event) =>
                        setNewSampleImageUrl(event.target.value)
                      }
                      placeholder="https://example.com/sample.jpg"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Sample caption
                    </label>
                    <input
                      value={newSampleCaption}
                      disabled={!planAccess.hasGrowthAccess}
                      onChange={(event) =>
                        setNewSampleCaption(event.target.value)
                      }
                      placeholder="Example: Before and after detail package"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 disabled:cursor-not-allowed"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <input
                      type="checkbox"
                      checked={newShowSample}
                      disabled={!planAccess.hasGrowthAccess}
                      onChange={(event) =>
                        setNewShowSample(event.target.checked)
                      }
                      className="mt-1 h-5 w-5 accent-emerald-400 disabled:cursor-not-allowed"
                    />

                    <span>
                      <span className="block text-sm font-black text-white">
                        Show this sample on booking page
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-gray-500">
                        Customers will see this visual example when reviewing
                        your services.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
              >
                {isSaving ? "Saving..." : "Add service"}
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
              Booking Page Ready
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Services power your booking flow.
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              Active services are what customers can choose from when they visit
              your public booking page.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Minimum Needed
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  At least 1 active service
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Current Active Services
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {isLoading ? "..." : activeServices.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Public Samples
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {isLoading ? "..." : visibleSamples.length}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/dashboard/booking-page"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
              >
                View booking page settings
              </Link>

              <Link
                href={previewBookingHref}
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Preview public booking page
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-300">
                Current Services
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                {isLoading
                  ? "Loading services..."
                  : `${services.length} service${
                      services.length === 1 ? "" : "s"
                    }`}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Pause services you do not want clients to book right now.
                Reactivate them when they are available again.
              </p>
            </div>

            <Link
              href="/dashboard/booking-page"
              className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Share booking link
            </Link>
          </div>

          {!isLoading && services.length === 0 && (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-black/20 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                ✦
              </div>

              <h3 className="mt-4 text-xl font-black text-white">
                No services yet.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                Add your first service above so customers have something to
                request from your public booking page.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4">
            {services.map((service) => {
              const sampleEdit = sampleEdits[service.id] || {
                sample_image_url: "",
                sample_caption: "",
                show_sample_on_booking_page: false,
              };

              return (
                <div
                  key={service.id}
                  className="rounded-3xl border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.04]"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-black text-white">
                          {service.name}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                            service.is_active
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                              : "border-white/10 bg-white/10 text-gray-400"
                          }`}
                        >
                          {service.is_active ? "Active" : "Paused"}
                        </span>

                        {service.show_sample_on_booking_page &&
                          service.sample_image_url && (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                              Sample visible
                            </span>
                          )}
                      </div>

                      {service.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                          {service.description}
                        </p>
                      ) : (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                          No description added yet.
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-300">
                        <span className="rounded-full bg-white/5 px-3 py-1">
                          {formatMoney(service.price)}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1">
                          {service.duration_minutes ?? 60} min
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1">
                          {service.is_active
                            ? "Visible for booking"
                            : "Hidden from active booking flow"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleServiceStatus(service)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                        service.is_active
                          ? "border-white/10 text-gray-200 hover:bg-white/10"
                          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                      }`}
                    >
                      {service.is_active ? "Pause service" : "Reactivate"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-emerald-300">
                          Service sample
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Growth and Complete can show this service sample on
                          the public booking page.
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                          planAccess.hasGrowthAccess
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-yellow-400/10 text-yellow-200"
                        }`}
                      >
                        {planAccess.hasGrowthAccess ? "Unlocked" : "Growth"}
                      </span>
                    </div>

                    <div
                      className={`mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] ${
                        !planAccess.hasGrowthAccess ? "opacity-50" : ""
                      }`}
                    >
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                        {sampleEdit.sample_image_url ? (
                          <img
                            src={sampleEdit.sample_image_url}
                            alt={sampleEdit.sample_caption || service.name}
                            className="h-52 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-52 items-center justify-center p-6 text-center text-sm leading-6 text-gray-500">
                            Add an image URL to preview this service sample.
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            Sample image URL
                          </label>
                          <input
                            value={sampleEdit.sample_image_url}
                            disabled={!planAccess.hasGrowthAccess}
                            onChange={(event) =>
                              updateSampleEdit(
                                service.id,
                                "sample_image_url",
                                event.target.value
                              )
                            }
                            placeholder="https://example.com/sample.jpg"
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            Sample caption
                          </label>
                          <input
                            value={sampleEdit.sample_caption}
                            disabled={!planAccess.hasGrowthAccess}
                            onChange={(event) =>
                              updateSampleEdit(
                                service.id,
                                "sample_caption",
                                event.target.value
                              )
                            }
                            placeholder="Example: Final result after service"
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 disabled:cursor-not-allowed"
                          />
                        </div>

                        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                          <input
                            type="checkbox"
                            checked={sampleEdit.show_sample_on_booking_page}
                            disabled={!planAccess.hasGrowthAccess}
                            onChange={(event) =>
                              updateSampleEdit(
                                service.id,
                                "show_sample_on_booking_page",
                                event.target.checked
                              )
                            }
                            className="mt-1 h-5 w-5 accent-emerald-400 disabled:cursor-not-allowed"
                          />

                          <span>
                            <span className="block text-sm font-black text-white">
                              Show sample on booking page
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-gray-500">
                              Customers will see this visual example when
                              reviewing your services.
                            </span>
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => saveServiceSample(service)}
                          disabled={
                            !planAccess.hasGrowthAccess ||
                            savingSampleId === service.id
                          }
                          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingSampleId === service.id
                            ? "Saving sample..."
                            : "Save service sample"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}