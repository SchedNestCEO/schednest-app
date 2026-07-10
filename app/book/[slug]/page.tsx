"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { useT } from "../../lib/i18n/client";

type BookingTimeMode = "fixed_hours" | "flexible_requests";

type PublicBusiness = {
  id: string;
  business_name: string | null;
  slug: string | null;
  timezone: string | null;
  booking_time_mode: BookingTimeMode | null;
  business_hours_enabled: boolean | null;
  business_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  booking_page_theme: string | null;
};

type PublicServiceSampleImage = {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
};

type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  pricing_type: string | null;
  duration_minutes: number | null;
  sample_image_url: string | null;
  sample_caption: string | null;
  show_sample_on_booking_page: boolean | null;
  sample_images: PublicServiceSampleImage[];
  publish_at: string | null;
  unpublish_at: string | null;
  discount_type: string | null;
  discount_value: number | null;
  discount_label: string | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  discount_is_active: boolean | null;
  discounted_price: number | null;
  deposit_required: boolean | null;
  deposit_collection_method: string | null;
  deposit_type: string | null;
  deposit_amount: number | null;
  deposit_policy: string | null;
  manual_deposit_instructions: string | null;
};

type PublicHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

type PublicBookingQuestion = {
  id: string;
  business_id: string;
  service_id: string | null;
  question_label: string;
  question_type: "short_text" | "long_text" | "select" | "checkbox";
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

type PublicBookingPageData = {
  business: PublicBusiness;
  services: PublicService[];
  business_hours: PublicHour[];
  booking_questions: PublicBookingQuestion[];
};

type ConfirmationSummary = {
  bookingId: string | null;
  customerName: string;
  businessName: string;
  serviceName: string;
  servicePrice: number | null;
  servicePricingType: string | null;
  serviceDuration: number | null;
  bookingDate: string;
  bookingTime: string;
  notes: string;
  isFlexibleRequest: boolean;
  depositRequired: boolean;
  depositAmount: number | null;
  depositPolicy: string | null;
  manualDepositInstructions: string | null;
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

const preferredTimeOptions = Array.from({ length: 36 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0"
  )}`;

  return {
    value,
    label: formatTime12Hour(value),
  };
});

function normalizeTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function normalizeColor(value: string | null, fallback: string) {
  if (!value) return fallback;

  const trimmedValue = value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return fallback;
}

function getSafeImageUrl(value: string | null | undefined) {
  if (!value) return "";

  const cleanValue = value.trim();

  if (
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("/")
  ) {
    return cleanValue;
  }

  return "";
}

function getServiceSampleImages(service: PublicService | null) {
  if (!service) return [];

  const uploadedImages = (service.sample_images || []).filter(
    (image) => image.is_visible !== false && getSafeImageUrl(image.image_url)
  );

  if (uploadedImages.length > 0) {
    return uploadedImages;
  }

  const legacyImageUrl = getSafeImageUrl(service.sample_image_url);

  if (service.show_sample_on_booking_page && legacyImageUrl) {
    return [
      {
        id: `legacy-${service.id}`,
        image_url: legacyImageUrl,
        caption: service.sample_caption,
        sort_order: 0,
        is_visible: true,
      },
    ];
  }

  return [];
}

function timeToMinutes(value: string | null) {
  if (!value) return null;

  const [hourString, minuteString] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return hour * 60 + minute;
}

function minutesToTimeValue(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTime12Hour(value: string | null) {
  if (!value) return "";

  const cleanValue = normalizeTime(value);
  const [hourString, minuteString] = cleanValue.split(":");
  const hour24 = Number(hourString);
  const minutes = minuteString || "00";

  if (Number.isNaN(hour24)) return cleanValue;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${minutes.padStart(2, "0")} ${period}`;
}

function formatBusinessHourRange(
  openTime: string | null,
  closeTime: string | null
) {
  if (!openTime || !closeTime) return "Closed";

  return `${formatTime12Hour(openTime)} - ${formatTime12Hour(closeTime)}`;
}

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "Price not listed";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPriceFromType(
  value: number | null,
  pricingType: string | null | undefined
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

function formatServicePrice(service: PublicService, useDiscount = false) {
  const priceToShow =
    useDiscount && hasActiveDiscount(service)
      ? service.discounted_price
      : service.price;

  return formatPriceFromType(priceToShow, service.pricing_type);
}


function getServiceDepositAmount(service: PublicService | null) {
  if (!service?.deposit_required) return null;

  if (service.deposit_type === "fixed") {
    return service.deposit_amount || null;
  }

  if (
    service.deposit_type === "percent" &&
    service.deposit_amount &&
    service.price
  ) {
    return Math.round(service.price * service.deposit_amount) / 100;
  }

  return service.deposit_amount || null;
}

function formatDuration(value: number | null) {
  if (!value) return "Duration varies";

  return `${value} min`;
}

function hasActiveDiscount(service: PublicService) {
  return Boolean(
    service.discount_is_active &&
      service.discounted_price !== null &&
      service.discounted_price !== undefined &&
      service.price !== null &&
      service.price !== undefined &&
      service.discounted_price < service.price
  );
}

function getServiceDisplayPrice(service: PublicService) {
  if (hasActiveDiscount(service)) {
    return service.discounted_price;
  }

  return service.price;
}

function formatDateLabel(dateValue: string) {
  if (!dateValue) return "";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateDayIndex(dateValue: string) {
  if (!dateValue) return null;

  const date = new Date(`${dateValue}T00:00:00`);
  return date.getDay();
}

function normalizeQuestionOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function isIntakeAnswerMissing(value: string | boolean | undefined) {
  if (typeof value === "boolean") return value !== true;
  return !value || !value.trim();
}

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const supabase = useMemo(() => createClient(), []);
  const t = useT();

  const [pageData, setPageData] = useState<PublicBookingPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationSummary, setConfirmationSummary] =
    useState<ConfirmationSummary | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [intakeAnswers, setIntakeAnswers] = useState<
    Record<string, string | boolean>
  >({});
  const [depositPolicyAccepted, setDepositPolicyAccepted] = useState(false);

  const selectedService = useMemo(() => {
    if (!pageData) return null;

    return (
      pageData.services.find((service) => service.id === selectedServiceId) ||
      null
    );
  }, [pageData, selectedServiceId]);

  const selectedServiceImages = useMemo(() => {
    return getServiceSampleImages(selectedService);
  }, [selectedService]);

  const selectedBookingQuestions = useMemo(() => {
    if (!pageData || !selectedServiceId) return [];

    return pageData.booking_questions.filter(
      (question) =>
        question.is_active !== false &&
        (!question.service_id || question.service_id === selectedServiceId)
    );
  }, [pageData, selectedServiceId]);

  const bookingTimeMode = pageData?.business.booking_time_mode || "fixed_hours";
  const businessHoursEnabled =
    pageData?.business.business_hours_enabled !== false;
  const isFlexibleRequest =
    bookingTimeMode === "flexible_requests" || !businessHoursEnabled;
  const usesFixedHours = !isFlexibleRequest;

  const primaryColor = normalizeColor(
    pageData?.business.brand_primary_color || null,
    "#34d399"
  );
  const accentColor = normalizeColor(
    pageData?.business.brand_accent_color || null,
    "#34d399"
  );
  const bookingPageTheme =
    pageData?.business.booking_page_theme || "schednest_dark";
  const isCleanTheme =
    bookingPageTheme === "clean_light" || bookingPageTheme === "brand_clean";
  const isPremiumTheme = bookingPageTheme === "premium_dark";
  const hasContactInfo = Boolean(
    customerName.trim() && (customerPhone.trim() || customerEmail.trim())
  );

  const pageClass = isCleanTheme
    ? "min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 sm:py-10"
    : isPremiumTheme
      ? "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_32%),#050807] px-4 py-6 text-white sm:px-6 sm:py-10"
      : "min-h-screen bg-[#050807] px-4 py-6 text-white sm:px-6 sm:py-10";

  const cardClass = isCleanTheme
    ? "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6";

  const heroCardClass = isCleanTheme
    ? "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    : isPremiumTheme
      ? "rounded-[2rem] border border-emerald-400/20 bg-white/[0.05] p-6 shadow-[0_0_60px_rgba(52,211,153,0.08)] sm:p-8"
      : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8";

  const mutedTextClass = isCleanTheme ? "text-slate-600" : "text-gray-400";
  const softTextClass = isCleanTheme ? "text-slate-500" : "text-gray-500";
  const titleTextClass = isCleanTheme ? "text-slate-950" : "text-white";
  const inputClass = isCleanTheme
    ? "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400"
    : "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400";

  const selectedDayHours = useMemo(() => {
    if (!pageData || !bookingDate) return null;

    const dayIndex = getDateDayIndex(bookingDate);

    if (dayIndex === null) return null;

    return (
      pageData.business_hours.find((hour) => hour.day_of_week === dayIndex) ||
      null
    );
  }, [pageData, bookingDate]);

  const availableTimes = useMemo(() => {
    if (
      isFlexibleRequest ||
      !bookingDate ||
      !selectedDayHours ||
      !selectedDayHours.is_open
    ) {
      return [];
    }

    const openMinutes = timeToMinutes(selectedDayHours.open_time);
    const closeMinutes = timeToMinutes(selectedDayHours.close_time);

    if (openMinutes === null || closeMinutes === null) return [];

    const serviceDuration = selectedService?.duration_minutes || 60;
    const latestStartTime = closeMinutes - serviceDuration;

    if (latestStartTime < openMinutes) return [];

    const todayValue = getTodayDateValue();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const slots: { value: string; label: string }[] = [];

    for (let minutes = openMinutes; minutes <= latestStartTime; minutes += 30) {
      if (bookingDate === todayValue && minutes <= currentMinutes) {
        continue;
      }

      const value = minutesToTimeValue(minutes);

      slots.push({
        value,
        label: formatTime12Hour(value),
      });
    }

    return slots;
  }, [bookingDate, selectedDayHours, selectedService, isFlexibleRequest]);

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

    const { data: depositData } = await supabase.rpc(
      "get_public_service_deposits",
      {
        p_business_id: typedData.business.id,
      }
    );

    const depositRows = Array.isArray(depositData) ? depositData : [];
    const depositByServiceId = new Map(
      depositRows.map((row: any) => [row.id, row])
    );

    const servicesWithDeposits = typedData.services.map((service) => {
      const deposit = depositByServiceId.get(service.id);

      return {
        ...service,
        deposit_required: deposit?.deposit_required || false,
        deposit_collection_method: deposit?.deposit_collection_method || "manual",
        deposit_type: deposit?.deposit_type || "none",
        deposit_amount:
          deposit?.deposit_amount === null || deposit?.deposit_amount === undefined
            ? null
            : Number(deposit.deposit_amount),
        deposit_policy: deposit?.deposit_policy || null,
        manual_deposit_instructions:
          deposit?.manual_deposit_instructions || null,
      };
    });

    const { data: questionData } = await supabase
      .from("booking_questions")
      .select(
        "id, business_id, service_id, question_label, question_type, options, is_required, is_active, sort_order"
      )
      .eq("business_id", typedData.business.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const safeQuestions = ((questionData || []) as PublicBookingQuestion[]).map(
      (question) => ({
        ...question,
        options: normalizeQuestionOptions(question.options),
      })
    );

    setPageData({
      ...typedData,
      services: servicesWithDeposits,
      booking_questions: safeQuestions,
    });

    if (servicesWithDeposits.length > 0) {
      setSelectedServiceId(servicesWithDeposits[0].id);
    }

    setIsLoading(false);
  }

  function resetFormForAnotherRequest() {
    setConfirmationSummary(null);
    setErrorMessage("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setBookingDate("");
    setBookingTime("");
    setNotes("");
    setIntakeAnswers({});
    setDepositPolicyAccepted(false);
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pageData) {
      setErrorMessage("Booking page not loaded.");
      return;
    }

    if (!selectedServiceId || !selectedService) {
      setErrorMessage("Please select a service.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!customerPhone.trim() && !customerEmail.trim()) {
      setErrorMessage("Please enter a phone number or email so the business can follow up.");
      return;
    }

    if (!bookingDate || !bookingTime) {
      setErrorMessage(
        isFlexibleRequest
          ? "Please choose your preferred date and time."
          : "Please choose an available date and time."
      );
      return;
    }

    if (selectedService.deposit_required && !depositPolicyAccepted) {
      setErrorMessage(
        t(
          "deposit.customerMustAgree",
          "Please agree to the business deposit policy before sending your request."
        )
      );
      return;
    }

    const missingRequiredQuestion = selectedBookingQuestions.find(
      (question) =>
        question.is_required && isIntakeAnswerMissing(intakeAnswers[question.id])
    );

    if (missingRequiredQuestion) {
      setErrorMessage(`Please answer: ${missingRequiredQuestion.question_label}`);
      return;
    }

    if (usesFixedHours) {
      const selectedTimeIsAvailable = availableTimes.some(
        (time) => time.value === bookingTime
      );

      if (!selectedTimeIsAvailable) {
        setErrorMessage("Please choose one of the available times.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setConfirmationSummary(null);

    const startDateTime = new Date(`${bookingDate}T${bookingTime}`);

    const requestNotes = isFlexibleRequest
      ? [
          notes.trim(),
          "Flexible request: customer selected a preferred time. Business may confirm this time or respond with another time that works.",
        ]
          .filter(Boolean)
          .join("\n\n")
      : notes.trim();

    const intakePayload = selectedBookingQuestions.reduce<
      Record<string, string | boolean>
    >((answers, question) => {
      const value = intakeAnswers[question.id];

      if (!isIntakeAnswerMissing(value)) {
        answers[question.question_label] = value;
      }

      return answers;
    }, {});

    const { data, error } = await supabase.rpc(
      "create_public_booking_with_intake",
      {
        p_business_id: pageData.business.id,
        p_service_id: selectedServiceId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_email: customerEmail,
        p_start_time: startDateTime.toISOString(),
        p_notes: requestNotes,
        p_intake_answers: intakePayload,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const bookingResult = data as { id?: string } | null;

    if (bookingResult?.id) {
      await supabase.rpc("apply_public_booking_deposit_snapshot", {
        p_booking_id: bookingResult.id,
        p_deposit_policy_accepted: selectedService.deposit_required
          ? depositPolicyAccepted
          : false,
      });

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

    setConfirmationSummary({
      bookingId: bookingResult?.id || null,
      customerName: customerName.trim(),
      businessName: pageData.business.business_name || "this business",
      serviceName: selectedService.name,
      servicePrice: getServiceDisplayPrice(selectedService),
      servicePricingType: selectedService.pricing_type,
      serviceDuration: selectedService.duration_minutes,
      bookingDate,
      bookingTime,
      notes: notes.trim(),
      isFlexibleRequest,
      depositRequired: selectedService.deposit_required === true,
      depositAmount: getServiceDepositAmount(selectedService),
      depositPolicy: selectedService.deposit_policy,
      manualDepositInstructions: selectedService.manual_deposit_instructions,
    });

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

  useEffect(() => {
    if (!bookingTime || isFlexibleRequest) return;

    const stillAvailable = availableTimes.some(
      (time) => time.value === bookingTime
    );

    if (!stillAvailable) {
      setBookingTime("");
    }
  }, [availableTimes, bookingTime, isFlexibleRequest]);

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
    <main className={pageClass}>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className={heroCardClass}>
          <div
            className="h-2 w-24 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />

          <p className="mt-6 text-sm font-black uppercase tracking-[0.28em]">
            <span style={{ color: primaryColor }}>SchedNest Booking</span>
          </p>

          <h1 className={`mt-3 text-4xl font-black ${titleTextClass} md:text-5xl`}>
            Book with {pageData.business.business_name || "this business"}
          </h1>

          <p className={`mt-4 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
            {pageData.business.business_description ||
              (isFlexibleRequest
                ? "Choose a service, request your preferred time, and the business will confirm or offer another time."
                : "Choose a service and available time. Your request is sent to the business for confirmation.")}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["1", "Choose service", selectedService ? selectedService.name : "Pick what you need"],
              [
                "2",
                isFlexibleRequest ? "Request time" : "Pick time",
                bookingDate && bookingTime
                  ? `${formatDateLabel(bookingDate)} · ${formatTime12Hour(bookingTime)}`
                  : "Select date and time",
              ],
              [
                "3",
                "Send request",
                hasContactInfo
                  ? "Contact info ready"
                  : "Add name and contact info",
              ],
            ].map(([step, title, description]) => (
              <div
                key={step}
                className={`rounded-2xl border p-4 ${
                  isCleanTheme
                    ? "border-slate-200 bg-slate-50"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-black"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {step}
                  </span>
                  <p className={`text-sm font-black ${titleTextClass}`}>
                    {title}
                  </p>
                </div>
                <p className={`mt-2 line-clamp-2 text-xs leading-5 ${mutedTextClass}`}>
                  {description}
                </p>
              </div>
            ))}
          </div>

          {(pageData.business.contact_email ||
            pageData.business.contact_phone) && (
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              {pageData.business.contact_email && (
                <a
                  href={`mailto:${pageData.business.contact_email}`}
                  className={`rounded-full px-4 py-2 font-bold ${
                    isCleanTheme
                      ? "border border-slate-200 bg-slate-50 text-slate-700"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  {pageData.business.contact_email}
                </a>
              )}

              {pageData.business.contact_phone && (
                <a
                  href={`tel:${pageData.business.contact_phone}`}
                  className={`rounded-full px-4 py-2 font-bold ${
                    isCleanTheme
                      ? "border border-slate-200 bg-slate-50 text-slate-700"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  {pageData.business.contact_phone}
                </a>
              )}
            </div>
          )}
        </section>

        {confirmationSummary && (
          <section
            className="rounded-[2rem] border p-8 shadow-[0_0_40px_rgba(52,211,153,0.08)]"
            style={{
              borderColor: `${primaryColor}40`,
              backgroundColor: `${primaryColor}18`,
            }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-black"
                  style={{ backgroundColor: accentColor }}
                >
                  ✓
                </div>

                <p
                  className="mt-5 text-sm font-black uppercase tracking-[0.28em]"
                  style={{ color: primaryColor }}
                >
                  Request Received
                </p>

                <h2 className={`mt-3 text-3xl font-black ${titleTextClass}`}>
                  Thanks, {confirmationSummary.customerName}.
                </h2>

                <p className={`mt-3 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
                  Your booking request was sent to{" "}
                  {confirmationSummary.businessName}.{" "}
                  {confirmationSummary.isFlexibleRequest
                    ? "The business will review your preferred time and confirm or respond with a time that works."
                    : "The business will review your request and confirm your appointment soon."}
                </p>
              </div>

              <button
                type="button"
                onClick={resetFormForAnotherRequest}
                className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
                  isCleanTheme
                    ? "border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                Request another time
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div
                className={`rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-slate-200 bg-white"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
                  Service
                </p>
                <p className={`mt-2 text-lg font-black ${titleTextClass}`}>
                  {confirmationSummary.serviceName}
                </p>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  {formatPriceFromType(
                    confirmationSummary.servicePrice,
                    confirmationSummary.servicePricingType
                  )}
                  {" · "}
                  {formatDuration(confirmationSummary.serviceDuration)}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-slate-200 bg-white"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
                  {confirmationSummary.isFlexibleRequest
                    ? "Preferred Time"
                    : "Requested Time"}
                </p>
                <p className={`mt-2 text-lg font-black ${titleTextClass}`}>
                  {formatDateLabel(confirmationSummary.bookingDate)}
                </p>
                <p className="mt-1 text-sm font-bold" style={{ color: primaryColor }}>
                  {formatTime12Hour(confirmationSummary.bookingTime)}
                </p>
              </div>
            </div>

            {confirmationSummary.depositRequired && (
              <div
                className={`mt-4 rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-yellow-200 bg-white"
                    : "border-yellow-400/20 bg-black/20"
                }`}
              >
                <p className={`text-sm font-black ${titleTextClass}`}>
                  {t("deposit.pending", "Deposit pending")}
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  {confirmationSummary.depositAmount
                    ? `${formatMoney(confirmationSummary.depositAmount)} ${
                        t("deposit.shortTitle", "Deposit").toLowerCase()
                      }`
                    : t("deposit.required", "Deposit required")}
                </p>

                {confirmationSummary.depositPolicy && (
                  <p className={`mt-3 whitespace-pre-line text-sm leading-6 ${mutedTextClass}`}>
                    {confirmationSummary.depositPolicy}
                  </p>
                )}

                {confirmationSummary.manualDepositInstructions && (
                  <p className={`mt-3 whitespace-pre-line text-sm leading-6 ${mutedTextClass}`}>
                    {confirmationSummary.manualDepositInstructions}
                  </p>
                )}
              </div>
            )}

            {confirmationSummary.notes && (
              <div
                className={`mt-4 rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-slate-200 bg-white"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
                  Note Sent
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  {confirmationSummary.notes}
                </p>
              </div>
            )}

            <div
              className={`mt-5 rounded-2xl border p-5 ${
                isCleanTheme
                  ? "border-slate-200 bg-white"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <p className={`text-sm font-black ${titleTextClass}`}>
                What happens next?
              </p>
              <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                {confirmationSummary.isFlexibleRequest
                  ? "This is a preferred time request, not a confirmed appointment. The business may approve it or respond with a different time for that date."
                  : "This is not confirmed yet. Once the business approves or declines the request, you may receive an update from the business."}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className={cardClass}>
            <p className="text-sm font-black" style={{ color: primaryColor }}>
              {businessHoursEnabled ? "Business Hours" : "By Appointment"}
            </p>

            {businessHoursEnabled && pageData.business_hours.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pageData.business_hours.map((hour) => (
                  <div
                    key={hour.day_of_week}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                      isCleanTheme ? "bg-slate-50" : "bg-black/20"
                    }`}
                  >
                    <span
                      className={`font-bold ${
                        isCleanTheme ? "text-slate-800" : "text-gray-200"
                      }`}
                    >
                      {days[hour.day_of_week]}
                    </span>
                    <span className={mutedTextClass}>
                      {hour.is_open
                        ? formatBusinessHourRange(
                            hour.open_time,
                            hour.close_time
                          )
                        : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="mt-4 rounded-2xl border p-5"
                style={{
                  borderColor: `${primaryColor}35`,
                  backgroundColor: `${primaryColor}12`,
                }}
              >
                <p className="text-sm font-black" style={{ color: primaryColor }}>
                  Flexible scheduling
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  This business accepts preferred appointment times. Request a
                  date and time, and the business will confirm or respond with a
                  time that works.
                </p>
              </div>
            )}
          </div>

          <div className={cardClass}>
            <p className="text-sm font-black" style={{ color: primaryColor }}>
              Request Appointment
            </p>
            <h2 className={`mt-3 text-2xl font-black ${titleTextClass}`}>
              Choose your booking details
            </h2>

            {pageData.services.length === 0 ? (
              <div
                className="mt-6 rounded-2xl border p-5"
                style={{
                  borderColor: `${primaryColor}35`,
                  backgroundColor: `${primaryColor}12`,
                }}
              >
                <p className="text-sm font-black" style={{ color: primaryColor }}>
                  No services available yet.
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  This business has not published any services for online booking yet. Use the contact information above to reach out directly.
                </p>
              </div>
            ) : (
            <form onSubmit={submitBooking} className="mt-6 grid gap-4">
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                      Service
                    </label>
                    <p className={`mt-1 text-xs ${softTextClass}`}>
                      Pick the service you want to request.
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                      isCleanTheme
                        ? "border border-slate-200 bg-slate-50 text-slate-600"
                        : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {pageData.services.length} service
                    {pageData.services.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-3 grid gap-3">
                  {pageData.services.map((service) => {
                    const isSelected = service.id === selectedServiceId;

                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setBookingTime("");
                          setErrorMessage("");
                          setConfirmationSummary(null);
                          setIntakeAnswers({});
                          setDepositPolicyAccepted(false);
                        }}
                        className={`rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? "border-emerald-400/40 bg-emerald-400/10"
                            : isCleanTheme
                              ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                              : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className={`text-sm font-black ${titleTextClass}`}>
                              {service.name}
                            </p>
                            {service.description && (
                              <p className={`mt-2 text-xs leading-5 ${softTextClass}`}>
                                {service.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-left sm:text-right">
                            {hasActiveDiscount(service) ? (
                              <div>
                                <p className={`text-sm font-black ${titleTextClass}`}>
                                  {formatServicePrice(service, true)}
                                </p>
                                <p className={`mt-1 text-xs line-through ${softTextClass}`}>
                                  {formatServicePrice(service)}
                                </p>
                              </div>
                            ) : (
                              <p className={`text-sm font-black ${titleTextClass}`}>
                                {formatServicePrice(service)}
                              </p>
                            )}

                            <p className={`mt-1 text-xs ${softTextClass}`}>
                              {formatDuration(service.duration_minutes)}
                            </p>

                            {hasActiveDiscount(service) && (
                              <p className="mt-2 rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-black">
                                {service.discount_label || "Promotion"}
                              </p>
                            )}

                            {service.deposit_required && (
                              <p className="mt-2 rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-black">
                                {t("deposit.required", "Deposit required")}
                              </p>
                            )}

                          </div>
                        </div>

                        <span
                          className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            isSelected
                              ? "bg-emerald-400 text-black"
                              : isCleanTheme
                                ? "bg-white text-slate-600"
                                : "bg-white/10 text-gray-300"
                          }`}
                        >
                          {isSelected ? "Selected" : "Choose service"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedServiceImages.length > 0 && selectedService && (
                  <div
                    className={`mt-4 overflow-hidden rounded-2xl border ${
                      isCleanTheme
                        ? "border-slate-200 bg-slate-50"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <img
                      src={getSafeImageUrl(selectedServiceImages[0].image_url)}
                      alt={
                        selectedServiceImages[0].caption ||
                        selectedService.name ||
                        "Service sample"
                      }
                      className="h-52 w-full object-cover"
                    />

                    {selectedServiceImages.length > 1 && (
                      <div className="grid grid-cols-4 gap-2 p-3">
                        {selectedServiceImages.slice(0, 5).map((image) => (
                          <img
                            key={image.id}
                            src={getSafeImageUrl(image.image_url)}
                            alt={image.caption || selectedService.name}
                            className="h-14 w-full rounded-xl object-cover"
                          />
                        ))}
                      </div>
                    )}

                    <div className="p-4">
                      <p
                        className="text-xs font-black uppercase tracking-[0.2em]"
                        style={{ color: primaryColor }}
                      >
                        Selected service gallery
                      </p>

                      <p className={`mt-2 text-sm font-bold ${titleTextClass}`}>
                        {selectedServiceImages[0].caption ||
                          selectedService.description ||
                          selectedService.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                  Your name
                </label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    Phone <span className="font-normal opacity-70">or email required</span>
                  </label>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Phone number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    Email <span className="font-normal opacity-70">or phone required</span>
                  </label>
                  <input
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    type="email"
                    placeholder="Email address"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {isFlexibleRequest ? "Preferred date" : "Date"}
                  </label>
                  <input
                    value={bookingDate}
                    onChange={(event) => {
                      setBookingDate(event.target.value);
                      setBookingTime("");
                      setErrorMessage("");
                      setConfirmationSummary(null);
                    }}
                    type="date"
                    min={getTodayDateValue()}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {isFlexibleRequest ? "Preferred time" : "Available time"}
                  </label>

                  {isFlexibleRequest ? (
                    <select
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      disabled={!bookingDate}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {!bookingDate && (
                        <option value="">Choose a date first</option>
                      )}

                      {bookingDate && (
                        <option value="">Choose preferred time</option>
                      )}

                      {preferredTimeOptions.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      disabled={!bookingDate || availableTimes.length === 0}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {!bookingDate && (
                        <option value="">Choose a date first</option>
                      )}

                      {bookingDate && availableTimes.length === 0 && (
                        <option value="">No available times for this day</option>
                      )}

                      {bookingDate && availableTimes.length > 0 && (
                        <option value="">Choose an available time</option>
                      )}

                      {availableTimes.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {!isFlexibleRequest &&
                    bookingDate &&
                    selectedDayHours &&
                    !selectedDayHours.is_open && (
                      <p className={`mt-2 text-xs ${softTextClass}`}>
                        This business is closed on{" "}
                        {days[selectedDayHours.day_of_week]}.
                      </p>
                    )}

                  {!isFlexibleRequest &&
                    bookingDate &&
                    selectedDayHours &&
                    selectedDayHours.is_open &&
                    availableTimes.length === 0 && (
                      <p className={`mt-2 text-xs ${softTextClass}`}>
                        No times are available for the selected service on this
                        day.
                      </p>
                    )}

                  {isFlexibleRequest && bookingDate && (
                    <p className={`mt-2 text-xs ${softTextClass}`}>
                      This is a preferred time request. The business may confirm
                      it or respond with another time.
                    </p>
                  )}
                </div>
              </div>

              {selectedService && bookingDate && bookingTime && (
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${primaryColor}35`,
                    backgroundColor: `${primaryColor}12`,
                  }}
                >
                  <p className="text-sm font-black" style={{ color: primaryColor }}>
                    Request summary
                  </p>
                  <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                    {selectedService.name} on {formatDateLabel(bookingDate)} at{" "}
                    {formatTime12Hour(bookingTime)}.
                  </p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>
                    {isFlexibleRequest
                      ? "This preferred time will be sent to the business for review."
                      : "This appointment will be pending until the business confirms it."}
                  </p>
                </div>
              )}

              {selectedBookingQuestions.length > 0 && (
                <div
                  className={`rounded-2xl border p-5 ${
                    isCleanTheme
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <p className={`text-sm font-black ${titleTextClass}`}>
                    A few details for this service
                  </p>
                  <p className={`mt-2 text-xs leading-5 ${softTextClass}`}>
                    These questions help the business prepare before confirming
                    your request.
                  </p>

                  <div className="mt-4 grid gap-4">
                    {selectedBookingQuestions.map((question) => (
                      <div key={question.id}>
                        <label
                          className={`text-sm font-bold ${
                            isCleanTheme ? "text-slate-700" : "text-gray-300"
                          }`}
                        >
                          {question.question_label}
                          {question.is_required && (
                            <span className="ml-1 text-red-300">*</span>
                          )}
                        </label>

                        {question.question_type === "long_text" ? (
                          <textarea
                            value={
                              typeof intakeAnswers[question.id] === "string"
                                ? String(intakeAnswers[question.id])
                                : ""
                            }
                            onChange={(event) =>
                              setIntakeAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value,
                              }))
                            }
                            className={`${inputClass} min-h-24`}
                          />
                        ) : question.question_type === "select" ? (
                          <select
                            value={
                              typeof intakeAnswers[question.id] === "string"
                                ? String(intakeAnswers[question.id])
                                : ""
                            }
                            onChange={(event) =>
                              setIntakeAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          >
                            <option value="">Choose an option</option>
                            {question.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : question.question_type === "checkbox" ? (
                          <label
                            className={`mt-2 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                              isCleanTheme
                                ? "border-slate-200 bg-white text-slate-700"
                                : "border-white/10 bg-black/30 text-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={intakeAnswers[question.id] === true}
                              onChange={(event) =>
                                setIntakeAnswers((current) => ({
                                  ...current,
                                  [question.id]: event.target.checked,
                                }))
                              }
                              className="h-5 w-5 accent-emerald-400"
                            />
                            Yes
                          </label>
                        ) : (
                          <input
                            value={
                              typeof intakeAnswers[question.id] === "string"
                                ? String(intakeAnswers[question.id])
                                : ""
                            }
                            onChange={(event) =>
                              setIntakeAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value,
                              }))
                            }
                            className={inputClass}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedService?.deposit_required && (
                <div
                  className={`rounded-2xl border p-5 ${
                    isCleanTheme
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-yellow-400/20 bg-yellow-400/10"
                  }`}
                >
                  <p className={`text-sm font-black ${titleTextClass}`}>
                    {t("deposit.required", "Deposit required")}
                  </p>

                  <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                    {getServiceDepositAmount(selectedService)
                      ? `${formatMoney(getServiceDepositAmount(selectedService))} ${
                          selectedService.deposit_collection_method === "manual"
                            ? t("deposit.manual", "Manual payment")
                            : t("deposit.stripe", "Stripe checkout")
                        }`
                      : t("deposit.required", "Deposit required")}
                  </p>

                  {selectedService.deposit_policy && (
                    <div
                      className={`mt-4 rounded-2xl border p-4 ${
                        isCleanTheme
                          ? "border-yellow-200 bg-white"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <p className={`text-xs font-black uppercase tracking-[0.2em] ${softTextClass}`}>
                        {t("deposit.businessPolicy", "Business deposit policy")}
                      </p>
                      <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${mutedTextClass}`}>
                        {selectedService.deposit_policy}
                      </p>
                    </div>
                  )}

                  {selectedService.deposit_collection_method === "manual" &&
                    selectedService.manual_deposit_instructions && (
                      <div
                        className={`mt-4 rounded-2xl border p-4 ${
                          isCleanTheme
                            ? "border-yellow-200 bg-white"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <p className={`text-xs font-black uppercase tracking-[0.2em] ${softTextClass}`}>
                          {t("deposit.manualInstructions", "Manual deposit instructions")}
                        </p>
                        <p className={`mt-2 whitespace-pre-line text-sm leading-6 ${mutedTextClass}`}>
                          {selectedService.manual_deposit_instructions}
                        </p>
                      </div>
                    )}

                  <label
                    className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                      isCleanTheme
                        ? "border-yellow-200 bg-white text-slate-700"
                        : "border-white/10 bg-black/20 text-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={depositPolicyAccepted}
                      onChange={(event) =>
                        setDepositPolicyAccepted(event.target.checked)
                      }
                      className="mt-0.5 h-5 w-5 accent-emerald-400"
                    />
                    <span>
                      {t(
                        "deposit.customerAgreement",
                        "I have read and agree to this business's deposit policy."
                      )}
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything the business should know?"
                  className={`${inputClass} min-h-24`}
                />
              </div>

              {errorMessage && (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || pageData.services.length === 0}
                className="rounded-2xl px-5 py-3 text-sm font-black text-black transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting
                  ? "Sending request..."
                  : isFlexibleRequest
                    ? "Send preferred time request"
                    : "Send booking request"}
              </button>

              <p className={`text-center text-xs leading-5 ${softTextClass}`}>
                No payment is collected here. The business will review your request and follow up using the contact information you provide.
              </p>
            </form>
            )}
          </div>
        </section>

        <section
          className={`rounded-[2rem] border p-5 text-center ${
            isCleanTheme
              ? "border-slate-200 bg-white text-slate-500"
              : "border-white/10 bg-white/[0.03] text-gray-500"
          }`}
        >
          <p className="text-xs font-bold">
            Powered by SchedNest · From first client to full company.
          </p>
        </section>
      </div>
    </main>
  );
}