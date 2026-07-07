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
  deleted_at: string | null;
};

type ServiceSampleImage = {
  id: string;
  service_id: string;
  business_id: string;
  owner_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  created_at: string;
  updated_at: string | null;
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
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  const [newSampleImageUrl, setNewSampleImageUrl] = useState("");
  const [newSampleCaption, setNewSampleCaption] = useState("");
  const [newShowSample, setNewShowSample] = useState(false);

  const [sampleEdits, setSampleEdits] = useState<Record<string, SampleEdit>>(
    {}
  );
  const [serviceImagesByService, setServiceImagesByService] = useState<
    Record<string, ServiceSampleImage[]>
  >({});
  const [uploadingServiceId, setUploadingServiceId] = useState<string | null>(
    null
  );
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null
  );

  const planAccess = getPlanAccess(subscription, plan);
  const serviceImageLimit = planAccess.hasCompleteAccess
    ? 5
    : planAccess.hasGrowthAccess
      ? 3
      : 0;

  const activeServices = services.filter(
    (service) => service.is_active !== false
  );
  const pausedServices = services.filter(
    (service) => service.is_active === false
  );
  const visibleSamples = Object.values(serviceImagesByService)
    .flat()
    .filter((image) => image.is_visible !== false && image.image_url?.trim());

  const previewBookingHref = businessProfile?.slug
    ? `/book/${businessProfile.slug}`
    : "/dashboard/booking-page";

  const shouldShowAddService =
    isAddServiceOpen || (!isLoading && services.length === 0);

  function getImagesForService(serviceId: string) {
    return serviceImagesByService[serviceId] || [];
  }

  function getServiceImageLimit() {
    if (planAccess.hasCompleteAccess) return 5;
    if (planAccess.hasGrowthAccess) return 3;
    return 0;
  }

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/storage/v1/object/public/service-samples/";
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.slice(markerIndex + marker.length).split("?")[0]);
  }

  function updateImageCaptionDraft(imageId: string, caption: string) {
    setServiceImagesByService((currentImages) => {
      const nextImages: Record<string, ServiceSampleImage[]> = {};

      for (const [serviceId, images] of Object.entries(currentImages)) {
        nextImages[serviceId] = images.map((image) =>
          image.id === imageId ? { ...image, caption } : image
        );
      }

      return nextImages;
    });
  }

  async function handleUploadServiceImage(
    service: Service,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!businessProfile) {
      setErrorMessage("Business profile not loaded yet.");
      return;
    }

    const imageLimit = getServiceImageLimit();
    const currentImages = getImagesForService(service.id);

    if (imageLimit <= 0) {
      setErrorMessage("Service images are available on Growth and Complete.");
      return;
    }

    if (currentImages.length >= imageLimit) {
      setErrorMessage(`This plan allows up to ${imageLimit} images per service.`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Images must be 5MB or smaller.");
      return;
    }

    setUploadingServiceId(service.id);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Please sign in again before uploading.");
      setUploadingServiceId(null);
      return;
    }

    const safeFileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-");

    const filePath = `${user.id}/${businessProfile.id}/${service.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("service-samples")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setUploadingServiceId(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("service-samples")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("service_sample_images")
      .insert({
        service_id: service.id,
        business_id: businessProfile.id,
        owner_id: businessProfile.owner_id,
        image_url: publicUrlData.publicUrl,
        caption: null,
        sort_order: currentImages.length,
        is_visible: true,
      });

    if (insertError) {
      setErrorMessage(insertError.message);
      setUploadingServiceId(null);
      return;
    }

    setSuccessMessage("Service image uploaded.");
    await loadServices();
    setUploadingServiceId(null);
  }

  async function saveImageCaption(image: ServiceSampleImage) {
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("service_sample_images")
      .update({
        caption: image.caption?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", image.id)
      .eq("business_id", image.business_id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Image caption saved.");
    await loadServices();
  }

  async function toggleServiceImageVisibility(image: ServiceSampleImage) {
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("service_sample_images")
      .update({
        is_visible: image.is_visible === false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", image.id)
      .eq("business_id", image.business_id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      image.is_visible === false
        ? "Image is now visible."
        : "Image hidden from public booking page."
    );

    await loadServices();
  }

  async function deleteServiceImage(image: ServiceSampleImage) {
    setDeletingImageId(image.id);
    setErrorMessage("");
    setSuccessMessage("");

    const storagePath = getStoragePathFromPublicUrl(image.image_url);

    if (storagePath) {
      await supabase.storage.from("service-samples").remove([storagePath]);
    }

    const { error } = await supabase
      .from("service_sample_images")
      .delete()
      .eq("id", image.id)
      .eq("business_id", image.business_id);

    if (error) {
      setErrorMessage(error.message);
      setDeletingImageId(null);
      return;
    }

    setSuccessMessage("Service image removed.");
    await loadServices();
    setDeletingImageId(null);
  }

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
        "id, business_id, owner_id, name, description, price, duration_minutes, is_active, sample_image_url, sample_caption, show_sample_on_booking_page, deleted_at"
      )
      .eq("business_id", safeProfile.id)
      .is("deleted_at", null)
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

    if (safeServices.length > 0) {
      const { data: sampleImagesData, error: sampleImagesError } =
        await supabase
          .from("service_sample_images")
          .select(
            "id, service_id, business_id, owner_id, image_url, caption, sort_order, is_visible, created_at, updated_at"
          )
          .eq("business_id", safeProfile.id)
          .in(
            "service_id",
            safeServices.map((service) => service.id)
          )
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

      if (sampleImagesError) {
        setErrorMessage(sampleImagesError.message);
        setServiceImagesByService({});
        setIsLoading(false);
        return;
      }

      const groupedImages: Record<string, ServiceSampleImage[]> = {};

      ((sampleImagesData || []) as ServiceSampleImage[]).forEach((image) => {
        if (!groupedImages[image.service_id]) {
          groupedImages[image.service_id] = [];
        }

        groupedImages[image.service_id].push(image);
      });

      setServiceImagesByService(groupedImages);
    } else {
      setServiceImagesByService({});
    }

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
      sample_image_url: null,
      sample_caption: null,
      show_sample_on_booking_page: false,
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
    setIsAddServiceOpen(false);
    setSuccessMessage("Service added.");

    await loadServices();
    setIsSaving(false);
  }

  async function toggleServiceStatus(service: Service) {
    setErrorMessage("");
    setSuccessMessage("");

    const nextIsActive = service.is_active === false;

    const { error } = await supabase
      .from("services")
      .update({ is_active: nextIsActive })
      .eq("id", service.id)
      .eq("business_id", service.business_id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      nextIsActive
        ? "Service reactivated."
        : "Service paused. It will not appear as active."
    );

    await loadServices();
  }

  async function deleteService(service: Service) {
    const confirmed = window.confirm(
      `Delete "${service.name}" from your service menu? Existing booking history will stay safe.`
    );

    if (!confirmed) return;

    setDeletingServiceId(service.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("services")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", service.id)
      .eq("business_id", service.business_id);

    if (error) {
      setErrorMessage(error.message);
      setDeletingServiceId(null);
      return;
    }

    setSuccessMessage("Service removed from your menu.");
    await loadServices();
    setDeletingServiceId(null);
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
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
            <button
              type="button"
              onClick={() =>
                setIsAddServiceOpen((currentValue) => !currentValue)
              }
              className="flex w-full flex-col gap-4 p-6 text-left transition hover:bg-white/[0.03] lg:flex-row lg:items-start lg:justify-between"
            >
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                  Service Menu
                </p>

                <h2 className="mt-3 text-2xl font-black text-white">
                  Add a service
                </h2>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                  Services become the options customers can choose from when
                  they request an appointment.
                </p>
              </div>

              <span className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300">
                {shouldShowAddService ? "Collapse" : "Expand"}
              </span>
            </button>

            {shouldShowAddService && (
              <div className="border-t border-white/10 p-6">
                <form onSubmit={handleAddService} className="grid gap-4">
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
                          Service images
                        </p>
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Add the service first, then upload images from the
                          service card below. Growth gets up to 3 images per
                          service. Complete gets up to 5.
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                          serviceImageLimit > 0
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-yellow-400/10 text-yellow-200"
                        }`}
                      >
                        {serviceImageLimit > 0
                          ? `${serviceImageLimit} images`
                          : "Upgrade"}
                      </span>
                    </div>

                    {serviceImageLimit === 0 && (
                      <p className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-gray-300">
                        Essentials can add services, pricing, and duration.
                        Growth and Complete unlock service image uploads.
                      </p>
                    )}
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
            )}
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
              const serviceImages = getImagesForService(service.id);
              const visibleServiceImages = serviceImages.filter(
                (image) => image.is_visible !== false && image.image_url
              );
              const currentImageLimit = getServiceImageLimit();
              const canUploadMoreImages =
                currentImageLimit > 0 &&
                serviceImages.length < currentImageLimit;

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
                            service.is_active !== false
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                              : "border-white/10 bg-white/10 text-gray-400"
                          }`}
                        >
                          {service.is_active !== false ? "Active" : "Paused"}
                        </span>

                        {visibleServiceImages.length > 0 && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                            {visibleServiceImages.length} image
                            {visibleServiceImages.length === 1 ? "" : "s"} visible
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
                          {service.is_active !== false
                            ? "Visible for booking"
                            : "Hidden from active booking flow"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                      <button
                        type="button"
                        onClick={() => toggleServiceStatus(service)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                          service.is_active !== false
                            ? "border-white/10 text-gray-200 hover:bg-white/10"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                        }`}
                      >
                        {service.is_active !== false
                          ? "Pause service"
                          : "Reactivate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteService(service)}
                        disabled={deletingServiceId === service.id}
                        className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingServiceId === service.id
                          ? "Deleting..."
                          : "Delete service"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-emerald-300">
                          Service images
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Upload real service photos instead of pasting image
                          links. Growth allows 3 images per service. Complete
                          allows 5.
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                          currentImageLimit > 0
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-yellow-400/10 text-yellow-200"
                        }`}
                      >
                        {currentImageLimit > 0
                          ? `${serviceImages.length}/${currentImageLimit}`
                          : "Upgrade"}
                      </span>
                    </div>

                    {currentImageLimit === 0 ? (
                      <p className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm leading-6 text-gray-300">
                        Service images are available on Growth and Complete.
                        Upgrade to show visual examples on your booking page.
                      </p>
                    ) : (
                      <>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <label
                            className={`w-fit rounded-2xl px-5 py-3 text-sm font-black transition ${
                              canUploadMoreImages
                                ? "cursor-pointer bg-emerald-400 text-black hover:bg-emerald-300"
                                : "cursor-not-allowed border border-white/10 text-gray-500"
                            }`}
                          >
                            {uploadingServiceId === service.id
                              ? "Uploading..."
                              : canUploadMoreImages
                                ? "Upload image"
                                : "Image limit reached"}

                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              disabled={
                                !canUploadMoreImages ||
                                uploadingServiceId === service.id
                              }
                              onChange={(event) =>
                                handleUploadServiceImage(service, event)
                              }
                              className="hidden"
                            />
                          </label>

                          <p className="text-xs leading-5 text-gray-500">
                            Max 5MB. JPG, PNG, WebP, or GIF.
                          </p>
                        </div>

                        {serviceImages.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-gray-500">
                            No images uploaded yet. Add a photo to help
                            customers understand what this service looks like.
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {serviceImages.map((image) => (
                              <div
                                key={image.id}
                                className="overflow-hidden rounded-2xl border border-white/10 bg-black/30"
                              >
                                <img
                                  src={image.image_url}
                                  alt={image.caption || service.name}
                                  className="h-44 w-full object-cover"
                                />

                                <div className="grid gap-3 p-4">
                                  <input
                                    value={image.caption || ""}
                                    onChange={(event) =>
                                      updateImageCaptionDraft(
                                        image.id,
                                        event.target.value
                                      )
                                    }
                                    placeholder="Optional image caption"
                                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                                  />

                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => saveImageCaption(image)}
                                      className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-400/20"
                                    >
                                      Save caption
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleServiceImageVisibility(image)
                                      }
                                      className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                                    >
                                      {image.is_visible === false
                                        ? "Show"
                                        : "Hide"}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={deletingImageId === image.id}
                                      onClick={() => deleteServiceImage(image)}
                                      className="rounded-2xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {deletingImageId === image.id
                                        ? "Removing..."
                                        : "Remove"}
                                    </button>
                                  </div>

                                  <span
                                    className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                                      image.is_visible === false
                                        ? "bg-white/10 text-gray-400"
                                        : "bg-emerald-400/10 text-emerald-300"
                                    }`}
                                  >
                                    {image.is_visible === false
                                      ? "Hidden"
                                      : "Visible"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
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