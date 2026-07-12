"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";
import { useT } from "../../lib/i18n/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
  slug: string | null;
  manual_payments_enabled: boolean | null;
  manual_payment_zelle: string | null;
  manual_payment_cash_app: string | null;
  manual_payment_venmo: string | null;
  manual_payment_paypal: string | null;
  manual_payment_other: string | null;
  manual_payment_qr_url: string | null;
  manual_payment_qr_caption: string | null;
};

type Service = {
  id: string;
  business_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  price: number | null;
  pricing_type: string | null;
  duration_minutes: number | null;
  is_active: boolean | null;
  sample_image_url: string | null;
  sample_caption: string | null;
  show_sample_on_booking_page: boolean | null;
  deleted_at: string | null;
  publish_at: string | null;
  unpublish_at: string | null;
  discount_type: string | null;
  discount_value: number | null;
  discount_label: string | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  deposits_enabled: boolean | null;
  deposit_required: boolean | null;
  deposit_collection_method: string | null;
  deposit_type: "fixed" | "percentage" | null;
  deposit_amount: number | null;
  deposit_policy: string | null;
  manual_deposit_instructions: string | null;
  cancellation_window_hours: number | null;
  late_cancellation_forfeits_deposit: boolean | null;
  no_show_forfeits_deposit: boolean | null;
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

type PricingType = "fixed" | "hourly" | "starting_at" | "quote" | "varies";

type SampleEdit = {
  sample_image_url: string;
  sample_caption: string;
  show_sample_on_booking_page: boolean;
};

type ServiceSettingsEdit = {
  publish_at: string;
  unpublish_at: string;
  discount_type: "none" | "percent" | "fixed";
  discount_value: string;
  discount_label: string;
  discount_starts_at: string;
  discount_ends_at: string;
  deposits_enabled: boolean;
  deposit_collection_method: "manual" | "stripe";
  deposit_type: "fixed" | "percentage";
  deposit_amount: string;
  deposit_policy: string;
  manual_deposit_instructions: string;
  cancellation_window_hours: string;
  late_cancellation_forfeits_deposit: boolean;
  no_show_forfeits_deposit: boolean;
};

type ManualPaymentSettings = {
  manual_payments_enabled: boolean;
  manual_payment_zelle: string;
  manual_payment_cash_app: string;
  manual_payment_venmo: string;
  manual_payment_paypal: string;
  manual_payment_other: string;
  manual_payment_qr_url: string;
  manual_payment_qr_caption: string;
};

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "Price not listed";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPriceFromType(
  value: number | null,
  pricingType: string | null | undefined,
) {
  const type = pricingType || "fixed";

  if (type === "quote") return "Quote required";
  if (type === "varies") return "Price varies";

  if (value === null || value === undefined) {
    if (type === "hourly") return "Hourly rate not listed";
    if (type === "starting_at") return "Starting price not listed";
    return "Price not listed";
  }

  if (type === "hourly") return `${formatMoney(value)}/hr`;
  if (type === "starting_at") return `Starting at ${formatMoney(value)}`;

  return formatMoney(value);
}

function formatServicePrice(service: Service) {
  return formatPriceFromType(service.price, service.pricing_type);
}

function formatDepositAmount(
  depositType: string | null | undefined,
  depositAmount: number | null | undefined,
) {
  if (!depositAmount) return "Not set";
  if (depositType === "percentage") return `${depositAmount}%`;
  return formatMoney(depositAmount);
}

function getDepositBadgeLabel(service: Service) {
  if (!(service.deposits_enabled || service.deposit_required))
    return "No deposit";
  return `Deposit: ${formatDepositAmount(service.deposit_type, service.deposit_amount)}`;
}

function formatDuration(value: number | null) {
  if (!value) return "Duration varies";

  return `${value} min`;
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
    isActive && (planName.includes("growth") || planName.includes("complete"));

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

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function getPublishLabel(service: Service) {
  const now = new Date();

  if (service.publish_at && new Date(service.publish_at) > now) {
    return "Scheduled";
  }

  if (service.unpublish_at && new Date(service.unpublish_at) <= now) {
    return "Ended";
  }

  return service.is_active === false ? "Paused" : "Live";
}

function hasSavedDiscount(service: Service) {
  return Boolean(
    service.discount_type &&
    service.discount_type !== "none" &&
    service.discount_value !== null &&
    service.discount_value !== undefined,
  );
}

function cleanCapturedLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractCapturedPrice(value: string) {
  const priceMatch = value.match(/\$\s*(\d+(?:\.\d{1,2})?)/);

  return priceMatch?.[1] || "";
}

function extractCapturedDuration(value: string) {
  const durationMatch = value.match(
    /\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr|minutes?|mins?|min)\b/i,
  );

  if (!durationMatch) return "";

  const amount = Number(durationMatch[1]);
  const unit = durationMatch[2].toLowerCase();

  if (Number.isNaN(amount)) return "";

  if (unit.startsWith("hour") || unit.startsWith("hr")) {
    return String(Math.round(amount * 60));
  }

  return String(Math.round(amount));
}

function extractCapturedPricingType(value: string): PricingType {
  const lowerValue = value.toLowerCase();

  if (/\b(per hour|hourly|\/hr|an hour|each hour)\b/.test(lowerValue)) {
    return "hourly";
  }

  if (/\b(starting at|starts at|from\s+\$|prices start)\b/.test(lowerValue)) {
    return "starting_at";
  }

  if (
    /\b(quote required|request quote|quote only|contact for price)\b/.test(
      lowerValue,
    )
  ) {
    return "quote";
  }

  if (/\b(price varies|varies|depends)\b/.test(lowerValue)) {
    return "varies";
  }

  return "fixed";
}

function extractCapturedDiscount(value: string) {
  const percentMatch =
    value.match(/\b(\d{1,3})\s*%\s*(?:off|discount|sale)?\b/i) ||
    value.match(/\b(?:off|discount|sale)\s*(\d{1,3})\s*%\b/i);

  if (percentMatch) {
    return {
      type: "percent" as const,
      value: percentMatch[1],
    };
  }

  const fixedMatch = value.match(
    /\$\s*(\d+(?:\.\d{1,2})?)\s*(?:off|discount)\b/i,
  );

  if (fixedMatch) {
    return {
      type: "fixed" as const,
      value: fixedMatch[1],
    };
  }

  return {
    type: "none" as const,
    value: "",
  };
}

function extractCapturedPromoLabel(value: string) {
  const lines = value.split(/\n+/).map(cleanCapturedLine).filter(Boolean);

  const promoLine = lines.find((line) =>
    /\b(special|promo|promotion|sale|deal|discount|limited|summer|holiday|new client|first time)\b/i.test(
      line,
    ),
  );

  return promoLine?.slice(0, 60) || "";
}

function extractCapturedServiceName(value: string) {
  const lines = value.split(/\n+/).map(cleanCapturedLine).filter(Boolean);

  const filteredLines = lines.filter((line) => {
    const lowerLine = line.toLowerCase();

    if (line.length < 3 || line.length > 80) return false;
    if (/^\$?\d+(?:\.\d{1,2})?$/.test(line)) return false;
    if (
      /\b(off|discount|sale|promo|call|text|dm|book now|link in bio)\b/i.test(
        line,
      )
    ) {
      return false;
    }
    if (
      /\b(am|pm|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(
        line,
      )
    ) {
      return false;
    }
    if (lowerLine.includes("@") || lowerLine.includes("http")) return false;

    return true;
  });

  const lineWithPackage =
    filteredLines.find((line) =>
      /\b(package|service|session|detail|consult|consultation)\b/i.test(line),
    ) || filteredLines[0];

  if (!lineWithPackage) return "";

  return lineWithPackage
    .replace(/[-–—|•]+$/g, "")
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, "")
    .trim()
    .slice(0, 80);
}

function buildCapturedServiceDescription(value: string) {
  const lines = value.split(/\n+/).map(cleanCapturedLine).filter(Boolean);

  const cleanedLines = lines.filter((line) => {
    if (/^\$?\d+(?:\.\d{1,2})?$/.test(line)) return false;
    if (/^\d+\s*(min|mins|minutes|hr|hrs|hours)$/i.test(line)) return false;

    return true;
  });

  return cleanedLines.join("\n").slice(0, 700);
}

export default function ServicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const t = useT();

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
  const [manualPaymentSettings, setManualPaymentSettings] =
    useState<ManualPaymentSettings>({
      manual_payments_enabled: true,
      manual_payment_zelle: "",
      manual_payment_cash_app: "",
      manual_payment_venmo: "",
      manual_payment_paypal: "",
      manual_payment_other: "",
      manual_payment_qr_url: "",
      manual_payment_qr_caption: "",
    });
  const [isSavingManualPayments, setIsSavingManualPayments] = useState(false);
  const [isUploadingPaymentQr, setIsUploadingPaymentQr] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [newPricingType, setNewPricingType] = useState<PricingType>("fixed");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  const [newSampleImageUrl, setNewSampleImageUrl] = useState("");
  const [newSampleCaption, setNewSampleCaption] = useState("");
  const [newShowSample, setNewShowSample] = useState(false);
  const [newPublishAt, setNewPublishAt] = useState("");
  const [newUnpublishAt, setNewUnpublishAt] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<
    "none" | "percent" | "fixed"
  >("none");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newDiscountLabel, setNewDiscountLabel] = useState("");
  const [newDepositsEnabled, setNewDepositsEnabled] = useState(false);
  const [newDepositCollectionMethod, setNewDepositCollectionMethod] = useState<
    "manual" | "stripe"
  >("manual");
  const [newDepositType, setNewDepositType] = useState<"fixed" | "percentage">(
    "fixed",
  );
  const [newDepositAmount, setNewDepositAmount] = useState("");
  const [newDepositPolicy, setNewDepositPolicy] = useState("");
  const [newManualDepositInstructions, setNewManualDepositInstructions] =
    useState("");
  const [newCancellationWindowHours, setNewCancellationWindowHours] =
    useState("24");
  const [
    newLateCancellationForfeitsDeposit,
    setNewLateCancellationForfeitsDeposit,
  ] = useState(true);
  const [newNoShowForfeitsDeposit, setNewNoShowForfeitsDeposit] =
    useState(true);

  const [serviceCaptureText, setServiceCaptureText] = useState("");
  const [serviceCaptureMessage, setServiceCaptureMessage] = useState("");
  const [serviceCaptureImageFile, setServiceCaptureImageFile] =
    useState<File | null>(null);
  const [serviceCaptureImagePreviewUrl, setServiceCaptureImagePreviewUrl] =
    useState("");
  const [isReadingServiceCapture, setIsReadingServiceCapture] = useState(false);

  const [sampleEdits, setSampleEdits] = useState<Record<string, SampleEdit>>(
    {},
  );
  const [serviceSettingsEdits, setServiceSettingsEdits] = useState<
    Record<string, ServiceSettingsEdit>
  >({});
  const [savingServiceSettingsId, setSavingServiceSettingsId] = useState<
    string | null
  >(null);
  const [serviceImagesByService, setServiceImagesByService] = useState<
    Record<string, ServiceSampleImage[]>
  >({});
  const [uploadingServiceId, setUploadingServiceId] = useState<string | null>(
    null,
  );
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null,
  );

  const planAccess = getPlanAccess(subscription, plan);
  const serviceImageLimit = planAccess.hasCompleteAccess
    ? 5
    : planAccess.hasGrowthAccess
      ? 3
      : 0;

  const activeServices = services.filter(
    (service) => service.is_active !== false,
  );
  const pausedServices = services.filter(
    (service) => service.is_active === false,
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

    return decodeURIComponent(
      url.slice(markerIndex + marker.length).split("?")[0],
    );
  }

  function applyCapturedServiceDetails(rawText: string) {
    if (!rawText.trim()) {
      setServiceCaptureMessage(
        "Paste service text or upload a screenshot first.",
      );
      return;
    }

    const capturedName = extractCapturedServiceName(rawText);
    const capturedDescription = buildCapturedServiceDescription(rawText);
    const capturedPrice = extractCapturedPrice(rawText);
    const capturedPricingType = extractCapturedPricingType(rawText);
    const capturedDuration = extractCapturedDuration(rawText);
    const capturedDiscount = extractCapturedDiscount(rawText);
    const capturedPromoLabel = extractCapturedPromoLabel(rawText);

    if (capturedName) {
      setName(capturedName);
    }

    if (capturedDescription) {
      setDescription(capturedDescription);
    }

    setNewPricingType(capturedPricingType);

    if (capturedPricingType === "quote" || capturedPricingType === "varies") {
      setPrice("");
    } else if (capturedPrice) {
      setPrice(capturedPrice);
    }

    if (capturedDuration) {
      setDurationMinutes(capturedDuration);
    }

    if (capturedDiscount.type !== "none") {
      setNewDiscountType(capturedDiscount.type);
      setNewDiscountValue(capturedDiscount.value);
      setNewDiscountLabel(capturedPromoLabel || "Promotion");
    } else if (capturedPromoLabel) {
      setNewDiscountLabel(capturedPromoLabel);
    }

    setIsAddServiceOpen(true);

    setServiceCaptureMessage(
      [
        capturedName ? "Name found." : "Review service name manually.",
        capturedPrice ? "Price found." : "Review price manually.",
        capturedDuration ? "Duration found." : "Review duration manually.",
        capturedDiscount.type !== "none"
          ? "Promo found."
          : "No promo detected.",
      ].join(" "),
    );
  }

  function handleExtractServiceCaptureText() {
    applyCapturedServiceDetails(serviceCaptureText);
  }

  function handleServiceCaptureImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] || null;

    setServiceCaptureImageFile(file);
    setServiceCaptureMessage("");

    if (serviceCaptureImagePreviewUrl) {
      URL.revokeObjectURL(serviceCaptureImagePreviewUrl);
    }

    if (file) {
      setServiceCaptureImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setServiceCaptureImagePreviewUrl("");
    }
  }

  async function readServiceCaptureScreenshot() {
    if (!serviceCaptureImageFile) {
      setServiceCaptureMessage("Upload a service screenshot first.");
      return;
    }

    if (!serviceCaptureImageFile.type.startsWith("image/")) {
      setServiceCaptureMessage("Please upload an image file.");
      return;
    }

    if (serviceCaptureImageFile.size > 6 * 1024 * 1024) {
      setServiceCaptureMessage("Screenshot must be 6MB or smaller.");
      return;
    }

    setIsReadingServiceCapture(true);
    setServiceCaptureMessage("Reading service screenshot...");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");

      const result = await worker.recognize(serviceCaptureImageFile);
      await worker.terminate();

      const extractedText = result.data.text.trim();

      if (!extractedText) {
        setServiceCaptureMessage(
          "I could not read text from that screenshot. Try a clearer crop or paste the caption manually.",
        );
        setIsReadingServiceCapture(false);
        return;
      }

      setServiceCaptureText(extractedText);
      applyCapturedServiceDetails(extractedText);

      setServiceCaptureMessage(
        "Screenshot text captured. Review the service details before saving.",
      );
    } catch (error) {
      setServiceCaptureMessage(
        error instanceof Error
          ? error.message
          : "Unable to read service screenshot right now.",
      );
    }

    setIsReadingServiceCapture(false);
  }

  function clearServiceCaptureAssistant() {
    setServiceCaptureText("");
    setServiceCaptureMessage("");
    setServiceCaptureImageFile(null);

    if (serviceCaptureImagePreviewUrl) {
      URL.revokeObjectURL(serviceCaptureImagePreviewUrl);
    }

    setServiceCaptureImagePreviewUrl("");
  }

  function updateImageCaptionDraft(imageId: string, caption: string) {
    setServiceImagesByService((currentImages) => {
      const nextImages: Record<string, ServiceSampleImage[]> = {};

      for (const [serviceId, images] of Object.entries(currentImages)) {
        nextImages[serviceId] = images.map((image) =>
          image.id === imageId ? { ...image, caption } : image,
        );
      }

      return nextImages;
    });
  }

  async function handleUploadServiceImage(
    service: Service,
    event: React.ChangeEvent<HTMLInputElement>,
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
      setErrorMessage(
        `This plan allows up to ${imageLimit} images per service.`,
      );
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
        : "Image hidden from public booking page.",
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

  async function getBusinessProfileForManualPayments() {
    if (businessProfile) return businessProfile;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Unable to load user session. Please sign in again.");
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("business_profiles")
      .select(
        "id, owner_id, business_name, slug, manual_payments_enabled, manual_payment_zelle, manual_payment_cash_app, manual_payment_venmo, manual_payment_paypal, manual_payment_other, manual_payment_qr_url, manual_payment_qr_caption",
      )
      .eq("owner_id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Business profile not found. Refresh and try again.");
      return null;
    }

    const safeProfile = profile as BusinessProfile;
    setBusinessProfile(safeProfile);

    return safeProfile;
  }

  function updateManualPaymentSetting(
    field: keyof ManualPaymentSettings,
    value: string | boolean,
  ) {
    setManualPaymentSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleUploadPaymentQr(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const profileForPayments = await getBusinessProfileForManualPayments();

    if (!profileForPayments) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("QR code image must be 5MB or smaller.");
      return;
    }

    setIsUploadingPaymentQr(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Please sign in again before uploading.");
      setIsUploadingPaymentQr(false);
      return;
    }

    const safeFileName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-");

    const filePath = `${user.id}/${profileForPayments.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-qr-codes")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setIsUploadingPaymentQr(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("payment-qr-codes")
      .getPublicUrl(filePath);

    setManualPaymentSettings((current) => ({
      ...current,
      manual_payment_qr_url: publicUrlData.publicUrl,
    }));

    setSuccessMessage(
      t("manualPayments.uploaded", "Payment QR code uploaded."),
    );
    setIsUploadingPaymentQr(false);
  }

  async function saveManualPaymentSettings() {
    setIsSavingManualPayments(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase.rpc("save_manual_payment_methods", {
      p_business_id: businessProfile?.id || null,
      p_manual_payments_enabled: manualPaymentSettings.manual_payments_enabled,
      p_zelle: manualPaymentSettings.manual_payment_zelle,
      p_cash_app: manualPaymentSettings.manual_payment_cash_app,
      p_venmo: manualPaymentSettings.manual_payment_venmo,
      p_paypal: manualPaymentSettings.manual_payment_paypal,
      p_other: manualPaymentSettings.manual_payment_other,
      p_qr_url: manualPaymentSettings.manual_payment_qr_url,
      p_qr_caption: manualPaymentSettings.manual_payment_qr_caption,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSavingManualPayments(false);
      return;
    }

    const savedProfile = data as BusinessProfile | null;

    if (savedProfile) {
      setBusinessProfile(savedProfile);
      setManualPaymentSettings({
        manual_payments_enabled: savedProfile.manual_payments_enabled !== false,
        manual_payment_zelle: savedProfile.manual_payment_zelle || "",
        manual_payment_cash_app: savedProfile.manual_payment_cash_app || "",
        manual_payment_venmo: savedProfile.manual_payment_venmo || "",
        manual_payment_paypal: savedProfile.manual_payment_paypal || "",
        manual_payment_other: savedProfile.manual_payment_other || "",
        manual_payment_qr_url: savedProfile.manual_payment_qr_url || "",
        manual_payment_qr_caption: savedProfile.manual_payment_qr_caption || "",
      });
    }

    setSuccessMessage(
      t("manualPayments.saved", "Manual payment methods saved."),
    );

    setIsSavingManualPayments(false);
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
      .select(
        "id, owner_id, business_name, slug, manual_payments_enabled, manual_payment_zelle, manual_payment_cash_app, manual_payment_venmo, manual_payment_paypal, manual_payment_other, manual_payment_qr_url, manual_payment_qr_caption",
      )
      .eq("owner_id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Business profile not found.");
      setIsLoading(false);
      return;
    }

    const safeProfile = profile as BusinessProfile;
    setBusinessProfile(safeProfile);
    setManualPaymentSettings({
      manual_payments_enabled: safeProfile.manual_payments_enabled !== false,
      manual_payment_zelle: safeProfile.manual_payment_zelle || "",
      manual_payment_cash_app: safeProfile.manual_payment_cash_app || "",
      manual_payment_venmo: safeProfile.manual_payment_venmo || "",
      manual_payment_paypal: safeProfile.manual_payment_paypal || "",
      manual_payment_other: safeProfile.manual_payment_other || "",
      manual_payment_qr_url: safeProfile.manual_payment_qr_url || "",
      manual_payment_qr_caption: safeProfile.manual_payment_qr_caption || "",
    });

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
        "id, business_id, owner_id, name, description, price, pricing_type, duration_minutes, is_active, sample_image_url, sample_caption, show_sample_on_booking_page, deleted_at, publish_at, unpublish_at, discount_type, discount_value, discount_label, discount_starts_at, discount_ends_at, deposits_enabled, deposit_required, deposit_collection_method, deposit_type, deposit_amount, deposit_policy, manual_deposit_instructions, cancellation_window_hours, late_cancellation_forfeits_deposit, no_show_forfeits_deposit",
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
    const initialServiceSettingsEdits: Record<string, ServiceSettingsEdit> = {};

    safeServices.forEach((service) => {
      initialSampleEdits[service.id] = {
        sample_image_url: service.sample_image_url || "",
        sample_caption: service.sample_caption || "",
        show_sample_on_booking_page:
          service.show_sample_on_booking_page || false,
      };

      initialServiceSettingsEdits[service.id] = {
        publish_at: toDateTimeLocalValue(service.publish_at),
        unpublish_at: toDateTimeLocalValue(service.unpublish_at),
        discount_type:
          service.discount_type === "percent" ||
          service.discount_type === "fixed"
            ? service.discount_type
            : "none",
        discount_value:
          service.discount_value !== null &&
          service.discount_value !== undefined
            ? String(service.discount_value)
            : "",
        discount_label: service.discount_label || "",
        discount_starts_at: toDateTimeLocalValue(service.discount_starts_at),
        discount_ends_at: toDateTimeLocalValue(service.discount_ends_at),
        deposits_enabled:
          service.deposits_enabled === true ||
          service.deposit_required === true,
        deposit_collection_method:
          service.deposit_collection_method === "stripe" ? "stripe" : "manual",
        deposit_type:
          service.deposit_type === "percentage" ? "percentage" : "fixed",
        deposit_amount:
          service.deposit_amount !== null &&
          service.deposit_amount !== undefined
            ? String(service.deposit_amount)
            : "0",
        deposit_policy: service.deposit_policy || "",
        manual_deposit_instructions: service.manual_deposit_instructions || "",
        cancellation_window_hours: String(
          service.cancellation_window_hours ?? 24,
        ),
        late_cancellation_forfeits_deposit:
          service.late_cancellation_forfeits_deposit !== false,
        no_show_forfeits_deposit: service.no_show_forfeits_deposit !== false,
      };
    });

    setSampleEdits(initialSampleEdits);
    setServiceSettingsEdits(initialServiceSettingsEdits);

    if (safeServices.length > 0) {
      const { data: sampleImagesData, error: sampleImagesError } =
        await supabase
          .from("service_sample_images")
          .select(
            "id, service_id, business_id, owner_id, image_url, caption, sort_order, is_visible, created_at, updated_at",
          )
          .eq("business_id", safeProfile.id)
          .in(
            "service_id",
            safeServices.map((service) => service.id),
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

    const parsedNewDiscountValue =
      newDiscountType === "none" || !newDiscountValue.trim()
        ? null
        : Number(newDiscountValue);

    if (
      newDiscountType !== "none" &&
      (parsedNewDiscountValue === null ||
        Number.isNaN(parsedNewDiscountValue) ||
        parsedNewDiscountValue <= 0)
    ) {
      setErrorMessage("Enter a valid discount amount.");
      return;
    }

    if (
      newDiscountType === "percent" &&
      parsedNewDiscountValue !== null &&
      parsedNewDiscountValue > 100
    ) {
      setErrorMessage("Percent discounts cannot be greater than 100%.");
      return;
    }

    const parsedNewDepositAmount = newDepositsEnabled
      ? Number(newDepositAmount)
      : 0;

    if (
      newDepositsEnabled &&
      (!newDepositAmount.trim() ||
        Number.isNaN(parsedNewDepositAmount) ||
        parsedNewDepositAmount <= 0)
    ) {
      setErrorMessage("Enter a valid deposit amount.");
      return;
    }

    if (
      newDepositsEnabled &&
      newDepositType === "percentage" &&
      parsedNewDepositAmount > 100
    ) {
      setErrorMessage("Percentage deposits cannot be greater than 100%.");
      return;
    }

    const parsedCancellationWindowHours = Number(newCancellationWindowHours);

    if (
      Number.isNaN(parsedCancellationWindowHours) ||
      parsedCancellationWindowHours < 0
    ) {
      setErrorMessage("Enter a valid cancellation window.");
      return;
    }

    if (newDepositsEnabled && !newDepositPolicy.trim()) {
      setErrorMessage("Add your custom business-written deposit policy.");
      return;
    }

    const parsedServicePrice =
      newPricingType === "quote" || newPricingType === "varies" || !price.trim()
        ? null
        : Number(price);

    if (
      price.trim() &&
      (Number.isNaN(parsedServicePrice) ||
        parsedServicePrice === null ||
        parsedServicePrice < 0)
    ) {
      setErrorMessage("Enter a valid price amount.");
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
      price: parsedServicePrice,
      pricing_type: newPricingType,
      duration_minutes: durationMinutes.trim() ? Number(durationMinutes) : null,
      is_active: true,
      publish_at: dateTimeLocalToIso(newPublishAt),
      unpublish_at: dateTimeLocalToIso(newUnpublishAt),
      discount_type: newDiscountType,
      discount_value: parsedNewDiscountValue,
      discount_label:
        newDiscountType === "none" ? null : newDiscountLabel.trim() || null,
      discount_starts_at: null,
      discount_ends_at: null,
      sample_image_url: null,
      sample_caption: null,
      show_sample_on_booking_page: false,
      deposits_enabled: newDepositsEnabled,
      deposit_required: newDepositsEnabled,
      deposit_collection_method: newDepositCollectionMethod,
      deposit_type: newDepositType,
      deposit_amount: newDepositsEnabled ? parsedNewDepositAmount : 0,
      deposit_policy: newDepositsEnabled ? newDepositPolicy.trim() : null,
      manual_deposit_instructions:
        newDepositsEnabled && newDepositCollectionMethod === "manual"
          ? newManualDepositInstructions.trim() || null
          : null,
      cancellation_window_hours: parsedCancellationWindowHours,
      late_cancellation_forfeits_deposit: newLateCancellationForfeitsDeposit,
      no_show_forfeits_deposit: newNoShowForfeitsDeposit,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setNewPricingType("fixed");
    setDurationMinutes("");
    setNewSampleImageUrl("");
    setNewSampleCaption("");
    setNewShowSample(false);
    setNewPublishAt("");
    setNewUnpublishAt("");
    setNewDiscountType("none");
    setNewDiscountValue("");
    setNewDiscountLabel("");
    setNewDepositsEnabled(false);
    setNewDepositCollectionMethod("manual");
    setNewDepositType("fixed");
    setNewDepositAmount("");
    setNewDepositPolicy("");
    setNewManualDepositInstructions("");
    setNewCancellationWindowHours("24");
    setNewLateCancellationForfeitsDeposit(true);
    setNewNoShowForfeitsDeposit(true);
    clearServiceCaptureAssistant();
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
        : "Service paused. It will not appear as active.",
    );

    await loadServices();
  }

  async function deleteService(service: Service) {
    const confirmed = window.confirm(
      `Delete "${service.name}" from your service menu? Existing booking history will stay safe.`,
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
    value: string | boolean,
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

  function updateServiceSettingsEdit(
    serviceId: string,
    field: keyof ServiceSettingsEdit,
    value: string | boolean,
  ) {
    setServiceSettingsEdits((current) => ({
      ...current,
      [serviceId]: {
        publish_at: current[serviceId]?.publish_at || "",
        unpublish_at: current[serviceId]?.unpublish_at || "",
        discount_type: current[serviceId]?.discount_type || "none",
        discount_value: current[serviceId]?.discount_value || "",
        discount_label: current[serviceId]?.discount_label || "",
        discount_starts_at: current[serviceId]?.discount_starts_at || "",
        discount_ends_at: current[serviceId]?.discount_ends_at || "",
        deposits_enabled: current[serviceId]?.deposits_enabled || false,
        deposit_collection_method:
          current[serviceId]?.deposit_collection_method || "manual",
        deposit_type: current[serviceId]?.deposit_type || "fixed",
        deposit_amount: current[serviceId]?.deposit_amount || "0",
        deposit_policy: current[serviceId]?.deposit_policy || "",
        manual_deposit_instructions:
          current[serviceId]?.manual_deposit_instructions || "",
        cancellation_window_hours:
          current[serviceId]?.cancellation_window_hours || "24",
        late_cancellation_forfeits_deposit:
          current[serviceId]?.late_cancellation_forfeits_deposit ?? true,
        no_show_forfeits_deposit:
          current[serviceId]?.no_show_forfeits_deposit ?? true,
        [field]: value,
      },
    }));
  }

  async function saveServiceSettings(service: Service) {
    const edit = serviceSettingsEdits[service.id];

    if (!edit) {
      setErrorMessage("Service settings not loaded yet.");
      return;
    }

    const discountType = edit.discount_type || "none";
    const discountValue =
      discountType === "none" || !edit.discount_value.trim()
        ? null
        : Number(edit.discount_value);

    if (
      discountType !== "none" &&
      (discountValue === null ||
        Number.isNaN(discountValue) ||
        discountValue <= 0)
    ) {
      setErrorMessage("Enter a valid discount amount.");
      return;
    }

    if (discountType === "percent" && discountValue && discountValue > 100) {
      setErrorMessage("Percent discounts cannot be greater than 100%.");
      return;
    }

    const depositsEnabled = edit.deposits_enabled === true;
    const depositType = edit.deposit_type || "fixed";
    const depositAmount = depositsEnabled ? Number(edit.deposit_amount) : 0;

    if (
      depositsEnabled &&
      (!edit.deposit_amount.trim() ||
        Number.isNaN(depositAmount) ||
        depositAmount <= 0)
    ) {
      setErrorMessage("Enter a valid deposit amount.");
      return;
    }

    if (
      depositsEnabled &&
      depositType === "percentage" &&
      depositAmount > 100
    ) {
      setErrorMessage("Percentage deposits cannot be greater than 100%.");
      return;
    }

    const cancellationWindowHours = Number(edit.cancellation_window_hours);

    if (Number.isNaN(cancellationWindowHours) || cancellationWindowHours < 0) {
      setErrorMessage("Enter a valid cancellation window.");
      return;
    }

    if (depositsEnabled && !edit.deposit_policy.trim()) {
      setErrorMessage("Add your custom business-written deposit policy.");
      return;
    }

    const publishAt = dateTimeLocalToIso(edit.publish_at);
    const unpublishAt = dateTimeLocalToIso(edit.unpublish_at);

    if (
      publishAt &&
      unpublishAt &&
      new Date(publishAt).getTime() >= new Date(unpublishAt).getTime()
    ) {
      setErrorMessage("The end date must be after the go-live date.");
      return;
    }

    setSavingServiceSettingsId(service.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("services")
      .update({
        publish_at: publishAt,
        unpublish_at: unpublishAt,
        discount_type: discountType,
        discount_value: discountValue,
        discount_label:
          discountType === "none" ? null : edit.discount_label.trim() || null,
        discount_starts_at:
          discountType === "none"
            ? null
            : dateTimeLocalToIso(edit.discount_starts_at),
        discount_ends_at:
          discountType === "none"
            ? null
            : dateTimeLocalToIso(edit.discount_ends_at),
        deposits_enabled: depositsEnabled,
        deposit_required: depositsEnabled,
        deposit_collection_method: edit.deposit_collection_method || "manual",
        deposit_type: depositType,
        deposit_amount: depositsEnabled ? depositAmount : 0,
        deposit_policy: depositsEnabled ? edit.deposit_policy.trim() : null,
        manual_deposit_instructions:
          depositsEnabled && edit.deposit_collection_method === "manual"
            ? edit.manual_deposit_instructions.trim() || null
            : null,
        cancellation_window_hours: cancellationWindowHours,
        late_cancellation_forfeits_deposit:
          edit.late_cancellation_forfeits_deposit,
        no_show_forfeits_deposit: edit.no_show_forfeits_deposit,
      })
      .eq("id", service.id)
      .eq("business_id", service.business_id);

    if (error) {
      setErrorMessage(error.message);
      setSavingServiceSettingsId(null);
      return;
    }

    setSuccessMessage(
      "Service publishing, promotion, deposit, and cancellation settings saved.",
    );
    await loadServices();
    setSavingServiceSettingsId(null);
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
            <p className="text-sm font-bold text-emerald-300">Public Samples</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : visibleSamples.length}
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-200">
                {t("manualPayments.title", "Manual payment methods")}
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                Add payment usernames and QR code.
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
                {t(
                  "manualPayments.description",
                  "Add the payment usernames, links, or QR code customers should use when a manual deposit is required.",
                )}
              </p>
            </div>

            <label className="flex w-fit items-center gap-3 rounded-2xl border border-yellow-400/20 bg-black/20 px-4 py-3 text-sm font-black text-yellow-100">
              <input
                type="checkbox"
                checked={manualPaymentSettings.manual_payments_enabled}
                onChange={(event) =>
                  updateManualPaymentSetting(
                    "manual_payments_enabled",
                    event.target.checked,
                  )
                }
                className="h-5 w-5 accent-emerald-400"
              />
              {t(
                "manualPayments.enabled",
                "Show manual payment methods on booking page",
              )}
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-300">
                {t("manualPayments.zelle", "Zelle")}
              </label>
              <input
                value={manualPaymentSettings.manual_payment_zelle}
                onChange={(event) =>
                  updateManualPaymentSetting(
                    "manual_payment_zelle",
                    event.target.value,
                  )
                }
                placeholder="Example: business@email.com"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                {t("manualPayments.cashApp", "Cash App")}
              </label>
              <input
                value={manualPaymentSettings.manual_payment_cash_app}
                onChange={(event) =>
                  updateManualPaymentSetting(
                    "manual_payment_cash_app",
                    event.target.value,
                  )
                }
                placeholder="Example: $BusinessName"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                {t("manualPayments.venmo", "Venmo")}
              </label>
              <input
                value={manualPaymentSettings.manual_payment_venmo}
                onChange={(event) =>
                  updateManualPaymentSetting(
                    "manual_payment_venmo",
                    event.target.value,
                  )
                }
                placeholder="Example: @BusinessName"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                {t("manualPayments.paypal", "PayPal")}
              </label>
              <input
                value={manualPaymentSettings.manual_payment_paypal}
                onChange={(event) =>
                  updateManualPaymentSetting(
                    "manual_payment_paypal",
                    event.target.value,
                  )
                }
                placeholder="Example: paypal.me/BusinessName or email"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-300">
              {t("manualPayments.other", "Other payment instructions")}
            </label>
            <textarea
              value={manualPaymentSettings.manual_payment_other}
              onChange={(event) =>
                updateManualPaymentSetting(
                  "manual_payment_other",
                  event.target.value,
                )
              }
              placeholder="Example: Apple Pay, bank transfer, or special instructions."
              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-black text-white">
                {t("manualPayments.qrCode", "Payment QR code")}
              </p>

              {manualPaymentSettings.manual_payment_qr_url ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white">
                  <img
                    src={manualPaymentSettings.manual_payment_qr_url}
                    alt={
                      manualPaymentSettings.manual_payment_qr_caption ||
                      t("manualPayments.qrCode", "Payment QR code")
                    }
                    className="max-h-72 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-6 text-gray-400">
                  No QR code uploaded yet.
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <label className="w-fit cursor-pointer rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300">
                  {isUploadingPaymentQr
                    ? "Uploading..."
                    : t("manualPayments.uploadQr", "Upload QR code")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUploadPaymentQr}
                    disabled={isUploadingPaymentQr}
                    className="hidden"
                  />
                </label>

                {manualPaymentSettings.manual_payment_qr_url && (
                  <button
                    type="button"
                    onClick={() =>
                      updateManualPaymentSetting("manual_payment_qr_url", "")
                    }
                    className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {t("manualPayments.removeQr", "Remove QR code")}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                {t("manualPayments.qrCaption", "QR code caption")}
              </label>
              <input
                value={manualPaymentSettings.manual_payment_qr_caption}
                onChange={(event) =>
                  updateManualPaymentSetting(
                    "manual_payment_qr_caption",
                    event.target.value,
                  )
                }
                placeholder="Example: Scan to pay deposit"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
              />

              <button
                type="button"
                onClick={saveManualPaymentSettings}
                disabled={isSavingManualPayments || isLoading}
                className="mt-4 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingManualPayments
                  ? t("manualPayments.saving", "Saving payment methods...")
                  : t("manualPayments.save", "Save payment methods")}
              </button>
            </div>
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
                  <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">
                          Service Capture Assistant
                        </p>

                        <h3 className="mt-3 text-xl font-black text-white">
                          Paste or upload a service promo.
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                          Use an Instagram caption, flyer, menu screenshot, or
                          promo post. SchedNest will pull out the likely service
                          name, description, price, duration, and discount.
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                        Review before saving
                      </span>
                    </div>

                    <textarea
                      value={serviceCaptureText}
                      onChange={(event) =>
                        setServiceCaptureText(event.target.value)
                      }
                      placeholder="Example: Summer Detail Package — $85 — exterior wash, interior vacuum, tire shine, 90 minutes. 20% off this week only."
                      className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                    />

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-white">
                            Or upload a screenshot
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-400">
                            Use this for Instagram posts, flyers, story promos,
                            or menu screenshots that cannot be copied.
                          </p>
                        </div>

                        <label className="w-fit cursor-pointer rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-200 transition hover:bg-white/10">
                          Choose screenshot
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleServiceCaptureImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {serviceCaptureImagePreviewUrl && (
                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                          <img
                            src={serviceCaptureImagePreviewUrl}
                            alt="Service screenshot preview"
                            className="max-h-80 w-full object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={handleExtractServiceCaptureText}
                        className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                      >
                        Extract service details
                      </button>

                      <button
                        type="button"
                        onClick={readServiceCaptureScreenshot}
                        disabled={
                          !serviceCaptureImageFile || isReadingServiceCapture
                        }
                        className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isReadingServiceCapture
                          ? "Reading screenshot..."
                          : "Read screenshot"}
                      </button>

                      <button
                        type="button"
                        onClick={clearServiceCaptureAssistant}
                        className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                      >
                        Clear assistant
                      </button>
                    </div>

                    {serviceCaptureMessage && (
                      <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-gray-300">
                        {serviceCaptureMessage}
                      </p>
                    )}
                  </div>

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

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Pricing type
                      </label>
                      <select
                        value={newPricingType}
                        onChange={(event) => {
                          const nextType = event.target.value as PricingType;
                          setNewPricingType(nextType);

                          if (nextType === "quote" || nextType === "varies") {
                            setPrice("");
                          }
                        }}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                      >
                        <option value="fixed">Fixed price</option>
                        <option value="hourly">Per hour</option>
                        <option value="starting_at">Starting at</option>
                        <option value="quote">Quote required</option>
                        <option value="varies">Price varies</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Amount
                      </label>
                      <input
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={
                          newPricingType === "quote" ||
                          newPricingType === "varies"
                        }
                        placeholder={
                          newPricingType === "hourly"
                            ? "Example: 85/hr"
                            : newPricingType === "starting_at"
                              ? "Example: 85"
                              : "25.00"
                        }
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300">
                        Duration minutes{" "}
                        <span className="font-normal text-gray-500">
                          (optional)
                        </span>
                      </label>
                      <input
                        value={durationMinutes}
                        onChange={(event) =>
                          setDurationMinutes(event.target.value)
                        }
                        type="number"
                        min="5"
                        step="5"
                        placeholder="Optional, example: 60"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                    <p className="text-sm font-black text-emerald-300">
                      New service publishing
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Leave go-live blank to publish immediately. Add an end
                      date if this is a temporary or seasonal service.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Go live later
                        </label>
                        <input
                          type="datetime-local"
                          value={newPublishAt}
                          onChange={(event) =>
                            setNewPublishAt(event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Stop showing after
                        </label>
                        <input
                          type="datetime-local"
                          value={newUnpublishAt}
                          onChange={(event) =>
                            setNewUnpublishAt(event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          New service discount
                        </label>
                        <select
                          value={newDiscountType}
                          onChange={(event) =>
                            setNewDiscountType(
                              event.target.value as
                                "none" | "percent" | "fixed",
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        >
                          <option value="none">No discount</option>
                          <option value="percent">Percent off</option>
                          <option value="fixed">Dollar amount off</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Discount amount
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newDiscountValue}
                          onChange={(event) =>
                            setNewDiscountValue(event.target.value)
                          }
                          placeholder="Example: 20"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-300">
                        Promo label
                      </label>
                      <input
                        value={newDiscountLabel}
                        onChange={(event) =>
                          setNewDiscountLabel(event.target.value)
                        }
                        placeholder="Example: Summer Special"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-5">
                    <p className="text-sm font-black text-yellow-200">
                      {t("deposit.title", "Deposits & business policy")}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-gray-300">
                      {t(
                        "deposit.policyHelper",
                        "Write the deposit rules your customers must agree to before requesting this service. This policy is created by your business, not SchedNest.",
                      )}
                    </p>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
                      <input
                        type="checkbox"
                        checked={newDepositsEnabled}
                        onChange={(event) =>
                          setNewDepositsEnabled(event.target.checked)
                        }
                        className="h-5 w-5 accent-emerald-400"
                      />
                      {t("deposit.requireToggle", "Require a deposit")}
                    </label>

                    {newDepositsEnabled && (
                      <div className="mt-4 grid gap-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t(
                                "deposit.collectionMethod",
                                "Collection method",
                              )}
                            </label>
                            <select
                              value={newDepositCollectionMethod}
                              onChange={(event) =>
                                setNewDepositCollectionMethod(
                                  event.target.value as "manual" | "stripe",
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                            >
                              <option value="manual">
                                {t("deposit.manual", "Manual payment")}
                              </option>
                              <option value="stripe">
                                {t("deposit.stripe", "Stripe checkout")}
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t("deposit.type", "Deposit type")}
                            </label>
                            <select
                              value={newDepositType}
                              onChange={(event) =>
                                setNewDepositType(
                                  event.target.value as "fixed" | "percentage",
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                            >
                              <option value="fixed">
                                {t("deposit.fixed", "Fixed amount")}
                              </option>
                              <option value="percentage">
                                {t(
                                  "deposit.percent",
                                  "Percent of service price",
                                )}
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t("deposit.amount", "Deposit amount")}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={
                                newDepositType === "percentage"
                                  ? 100
                                  : undefined
                              }
                              step={
                                newDepositType === "percentage" ? "1" : "0.01"
                              }
                              value={newDepositAmount}
                              onChange={(event) =>
                                setNewDepositAmount(event.target.value)
                              }
                              placeholder={t(
                                "deposit.amountPlaceholder",
                                "Example: 25",
                              )}
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                            />
                          </div>
                        </div>

                        {newDepositCollectionMethod === "stripe" && (
                          <p className="rounded-2xl border border-yellow-400/20 bg-black/20 px-4 py-3 text-sm leading-6 text-yellow-100">
                            {t(
                              "deposit.stripeComingSoon",
                              "Stripe checkout is coming soon. Manual deposits work now.",
                            )}
                          </p>
                        )}

                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            {t("deposit.policy", "Custom deposit policy")}
                          </label>
                          <textarea
                            value={newDepositPolicy}
                            onChange={(event) =>
                              setNewDepositPolicy(event.target.value)
                            }
                            placeholder={t(
                              "deposit.policyPlaceholder",
                              "Example: A $25 deposit is required to secure your appointment. Deposits go toward your final balance and are non-refundable for same-day cancellations.",
                            )}
                            className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                          />
                        </div>

                        {newDepositCollectionMethod === "manual" && (
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t(
                                "deposit.instructions",
                                "Manual payment instructions",
                              )}
                            </label>
                            <textarea
                              value={newManualDepositInstructions}
                              onChange={(event) =>
                                setNewManualDepositInstructions(
                                  event.target.value,
                                )
                              }
                              placeholder={t(
                                "deposit.instructionsPlaceholder",
                                "Example: Send deposit to Zelle: business@email.com or Cash App: $BusinessName.",
                              )}
                              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            {t(
                              "deposit.cancellationWindow",
                              "Cancellation window",
                            )}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={newCancellationWindowHours}
                            onChange={(event) =>
                              setNewCancellationWindowHours(event.target.value)
                            }
                            placeholder="24"
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            {t(
                              "deposit.cancellationWindowHelper",
                              "Hours before the appointment when cancellation is still considered on time.",
                            )}
                          </p>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
                          <input
                            type="checkbox"
                            checked={newLateCancellationForfeitsDeposit}
                            onChange={(event) =>
                              setNewLateCancellationForfeitsDeposit(
                                event.target.checked,
                              )
                            }
                            className="h-5 w-5 accent-emerald-400"
                          />
                          {t(
                            "deposit.lateCancellationForfeit",
                            "Late cancellations forfeit the deposit",
                          )}
                        </label>

                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
                          <input
                            type="checkbox"
                            checked={newNoShowForfeitsDeposit}
                            onChange={(event) =>
                              setNewNoShowForfeitsDeposit(event.target.checked)
                            }
                            className="h-5 w-5 accent-emerald-400"
                          />
                          {t(
                            "deposit.noShowForfeit",
                            "No-shows forfeit the deposit",
                          )}
                        </label>
                      </div>
                    )}
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
                (image) => image.is_visible !== false && image.image_url,
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
                            {visibleServiceImages.length === 1 ? "" : "s"}{" "}
                            visible
                          </span>
                        )}

                        {service.publish_at &&
                          new Date(service.publish_at) > new Date() && (
                            <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-200">
                              Scheduled
                            </span>
                          )}

                        {hasSavedDiscount(service) && (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-200">
                            Promo
                          </span>
                        )}

                        {(service.deposits_enabled ||
                          service.deposit_required) && (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-200">
                            {getDepositBadgeLabel(service)}
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
                          {formatServicePrice(service)}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1">
                          {formatDuration(service.duration_minutes)}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1">
                          {service.is_active !== false
                            ? "Visible for booking"
                            : "Hidden from active booking flow"}
                        </span>

                        <span className="rounded-full bg-white/5 px-3 py-1">
                          {getPublishLabel(service)}
                        </span>

                        {hasSavedDiscount(service) && (
                          <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-yellow-200">
                            {service.discount_label ||
                              (service.discount_type === "percent"
                                ? `${service.discount_value}% off`
                                : `${formatMoney(service.discount_value)} off`)}
                          </span>
                        )}
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
                          Publishing & promotion
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Publish immediately, schedule this service for later,
                          or run a limited-time discount.
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-gray-300">
                        {getPublishLabel(service)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Go live later
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            serviceSettingsEdits[service.id]?.publish_at || ""
                          }
                          onChange={(event) =>
                            updateServiceSettingsEdit(
                              service.id,
                              "publish_at",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Stop showing after
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            serviceSettingsEdits[service.id]?.unpublish_at || ""
                          }
                          onChange={(event) =>
                            updateServiceSettingsEdit(
                              service.id,
                              "unpublish_at",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Discount type
                        </label>
                        <select
                          value={
                            serviceSettingsEdits[service.id]?.discount_type ||
                            "none"
                          }
                          onChange={(event) =>
                            updateServiceSettingsEdit(
                              service.id,
                              "discount_type",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        >
                          <option value="none">No discount</option>
                          <option value="percent">Percent off</option>
                          <option value="fixed">Dollar amount off</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Discount amount
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            serviceSettingsEdits[service.id]?.discount_value ||
                            ""
                          }
                          onChange={(event) =>
                            updateServiceSettingsEdit(
                              service.id,
                              "discount_value",
                              event.target.value,
                            )
                          }
                          placeholder="Example: 20"
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-300">
                        Promo label
                      </label>
                      <input
                        value={
                          serviceSettingsEdits[service.id]?.discount_label || ""
                        }
                        onChange={(event) =>
                          updateServiceSettingsEdit(
                            service.id,
                            "discount_label",
                            event.target.value,
                          )
                        }
                        placeholder="Example: Summer Special"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Promo starts
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            serviceSettingsEdits[service.id]
                              ?.discount_starts_at || ""
                          }
                          onChange={(event) =>
                            updateServiceSettingsEdit(
                              service.id,
                              "discount_starts_at",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Promo ends
                        </label>
                        <input
                          type="datetime-local"
                          value={
                            serviceSettingsEdits[service.id]
                              ?.discount_ends_at || ""
                          }
                          onChange={(event) =>
                            updateServiceSettingsEdit(
                              service.id,
                              "discount_ends_at",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => saveServiceSettings(service)}
                      disabled={savingServiceSettingsId === service.id}
                      className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingServiceSettingsId === service.id
                        ? "Saving..."
                        : "Save publishing & promo"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-yellow-200">
                          {t("deposit.title", "Deposits & business policy")}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-300">
                          {t(
                            "deposit.policyHelper",
                            "Write the deposit rules your customers must agree to before requesting this service. This policy is created by your business, not SchedNest.",
                          )}
                        </p>
                      </div>

                      <span className="w-fit rounded-full border border-yellow-400/20 bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-yellow-100">
                        {serviceSettingsEdits[service.id]?.deposits_enabled
                          ? t("deposit.required", "Deposit required")
                          : t("deposit.notRequired", "No deposit required")}
                      </span>
                    </div>

                    <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
                      <input
                        type="checkbox"
                        checked={
                          serviceSettingsEdits[service.id]?.deposits_enabled ||
                          false
                        }
                        onChange={(event) =>
                          updateServiceSettingsEdit(
                            service.id,
                            "deposits_enabled",
                            event.target.checked,
                          )
                        }
                        className="h-5 w-5 accent-emerald-400"
                      />
                      {t("deposit.requireToggle", "Require a deposit")}
                    </label>

                    {serviceSettingsEdits[service.id]?.deposits_enabled && (
                      <div className="mt-4 grid gap-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t(
                                "deposit.collectionMethod",
                                "Collection method",
                              )}
                            </label>
                            <select
                              value={
                                serviceSettingsEdits[service.id]
                                  ?.deposit_collection_method || "manual"
                              }
                              onChange={(event) =>
                                updateServiceSettingsEdit(
                                  service.id,
                                  "deposit_collection_method",
                                  event.target.value,
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                            >
                              <option value="manual">
                                {t("deposit.manual", "Manual payment")}
                              </option>
                              <option value="stripe">
                                {t("deposit.stripe", "Stripe checkout")}
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t("deposit.type", "Deposit type")}
                            </label>
                            <select
                              value={
                                serviceSettingsEdits[service.id]
                                  ?.deposit_type || "fixed"
                              }
                              onChange={(event) =>
                                updateServiceSettingsEdit(
                                  service.id,
                                  "deposit_type",
                                  event.target.value,
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                            >
                              <option value="fixed">
                                {t("deposit.fixed", "Fixed amount")}
                              </option>
                              <option value="percentage">
                                {t(
                                  "deposit.percent",
                                  "Percent of service price",
                                )}
                              </option>
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t("deposit.amount", "Deposit amount")}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={
                                serviceSettingsEdits[service.id]
                                  ?.deposit_type === "percentage"
                                  ? 100
                                  : undefined
                              }
                              step={
                                serviceSettingsEdits[service.id]
                                  ?.deposit_type === "percentage"
                                  ? "1"
                                  : "0.01"
                              }
                              value={
                                serviceSettingsEdits[service.id]
                                  ?.deposit_amount || ""
                              }
                              onChange={(event) =>
                                updateServiceSettingsEdit(
                                  service.id,
                                  "deposit_amount",
                                  event.target.value,
                                )
                              }
                              placeholder={t(
                                "deposit.amountPlaceholder",
                                "Example: 25",
                              )}
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                            />
                          </div>
                        </div>

                        {serviceSettingsEdits[service.id]
                          ?.deposit_collection_method === "stripe" && (
                          <p className="rounded-2xl border border-yellow-400/20 bg-black/20 px-4 py-3 text-sm leading-6 text-yellow-100">
                            {t(
                              "deposit.stripeComingSoon",
                              "Stripe checkout is coming soon. Manual deposits work now.",
                            )}
                          </p>
                        )}

                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            {t("deposit.policy", "Custom deposit policy")}
                          </label>
                          <textarea
                            value={
                              serviceSettingsEdits[service.id]
                                ?.deposit_policy || ""
                            }
                            onChange={(event) =>
                              updateServiceSettingsEdit(
                                service.id,
                                "deposit_policy",
                                event.target.value,
                              )
                            }
                            placeholder={t(
                              "deposit.policyPlaceholder",
                              "Example: A $25 deposit is required to secure your appointment. Deposits go toward your final balance and are non-refundable for same-day cancellations.",
                            )}
                            className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                          />
                        </div>

                        {serviceSettingsEdits[service.id]
                          ?.deposit_collection_method === "manual" && (
                          <div>
                            <label className="text-sm font-medium text-gray-300">
                              {t(
                                "deposit.instructions",
                                "Manual payment instructions",
                              )}
                            </label>
                            <textarea
                              value={
                                serviceSettingsEdits[service.id]
                                  ?.manual_deposit_instructions || ""
                              }
                              onChange={(event) =>
                                updateServiceSettingsEdit(
                                  service.id,
                                  "manual_deposit_instructions",
                                  event.target.value,
                                )
                              }
                              placeholder={t(
                                "deposit.instructionsPlaceholder",
                                "Example: Send deposit to Zelle: business@email.com or Cash App: $BusinessName.",
                              )}
                              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium text-gray-300">
                            {t(
                              "deposit.cancellationWindow",
                              "Cancellation window",
                            )}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              serviceSettingsEdits[service.id]
                                ?.cancellation_window_hours || "24"
                            }
                            onChange={(event) =>
                              updateServiceSettingsEdit(
                                service.id,
                                "cancellation_window_hours",
                                event.target.value,
                              )
                            }
                            placeholder="24"
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            {t(
                              "deposit.cancellationWindowHelper",
                              "Hours before the appointment when cancellation is still considered on time.",
                            )}
                          </p>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
                          <input
                            type="checkbox"
                            checked={
                              serviceSettingsEdits[service.id]
                                ?.late_cancellation_forfeits_deposit ?? true
                            }
                            onChange={(event) =>
                              updateServiceSettingsEdit(
                                service.id,
                                "late_cancellation_forfeits_deposit",
                                event.target.checked,
                              )
                            }
                            className="h-5 w-5 accent-emerald-400"
                          />
                          {t(
                            "deposit.lateCancellationForfeit",
                            "Late cancellations forfeit the deposit",
                          )}
                        </label>

                        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white">
                          <input
                            type="checkbox"
                            checked={
                              serviceSettingsEdits[service.id]
                                ?.no_show_forfeits_deposit ?? true
                            }
                            onChange={(event) =>
                              updateServiceSettingsEdit(
                                service.id,
                                "no_show_forfeits_deposit",
                                event.target.checked,
                              )
                            }
                            className="h-5 w-5 accent-emerald-400"
                          />
                          {t(
                            "deposit.noShowForfeit",
                            "No-shows forfeit the deposit",
                          )}
                        </label>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => saveServiceSettings(service)}
                      disabled={savingServiceSettingsId === service.id}
                      className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm font-black text-yellow-100 transition hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingServiceSettingsId === service.id
                        ? "Saving..."
                        : t("deposit.saveSettings", "Save deposit settings")}
                    </button>
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
                                        event.target.value,
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
