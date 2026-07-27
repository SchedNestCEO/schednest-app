"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useLanguage, useT } from "../../lib/i18n/client";

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
  manual_payments_enabled: boolean | null;
  manual_payment_zelle: string | null;
  manual_payment_cash_app: string | null;
  manual_payment_venmo: string | null;
  manual_payment_paypal: string | null;
  manual_payment_other: string | null;
  manual_payment_qr_url: string | null;
  manual_payment_qr_caption: string | null;
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

type OccupiedBookingRange = {
  start_time: string;
  end_time: string;
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

const publicBookingCopy = {
  en: {
    schednestBooking: "SchedNest Booking",
    bookWith: "Book with",
    fallbackBusiness: "this business",
    fixedDescription:
      "Choose a service and available time. Your request is sent to the business for confirmation.",
    flexibleDescription:
      "Choose a service, request your preferred time, and the business will confirm or offer another time.",
    chooseService: "Choose service",
    requestTime: "Request time",
    pickTime: "Pick time",
    sendRequest: "Send request",
    pickWhatYouNeed: "Pick what you need",
    selectDateTime: "Select date and time",
    contactInfoReady: "Contact info ready",
    addContactInfo: "Add name and contact info",
    businessHours: "Business Hours",
    byAppointment: "By Appointment",
    closed: "Closed",
    flexibleScheduling: "Flexible scheduling",
    flexibleSchedulingDescription:
      "This business accepts preferred appointment times. Request a date and time, and the business will confirm or respond with a time that works.",
    requestAppointment: "Request Appointment",
    chooseBookingDetails: "Choose your booking details",
    noServicesTitle: "No services available yet.",
    noServicesDescription:
      "This business has not published any services for online booking yet. Use the contact information above to reach out directly.",
    service: "Service",
    pickService: "Pick the service you want to request.",
    selected: "Selected",
    chooseServiceButton: "Choose service",
    selectedServiceGallery: "Selected service gallery",
    yourName: "Your name",
    fullName: "Your full name",
    phone: "Phone",
    email: "Email",
    phoneOrEmailRequired: "or email required",
    emailOrPhoneRequired: "or phone required",
    phonePlaceholder: "Phone number",
    emailPlaceholder: "Email address",
    preferredDate: "Preferred date",
    date: "Date",
    preferredTime: "Preferred time",
    availableTime: "Available time",
    chooseDateFirst: "Choose a date first",
    choosePreferredTime: "Choose preferred time",
    chooseAvailableTime: "Choose an available time",
    noAvailableTimes: "No available times for this day",
    closedOn: "This business is closed on",
    noTimesForService:
      "No times are available for the selected service on this day.",
    flexibleTimeNotice:
      "This is a preferred time request. The business may confirm it or respond with another time.",
    requestSummary: "Request summary",
    pendingUntilConfirmed:
      "This appointment will be pending until the business confirms it.",
    preferredTimeSent:
      "This preferred time will be sent to the business for review.",
    intakeTitle: "A few details for this service",
    intakeDescription:
      "These questions help the business prepare before confirming your request.",
    chooseOption: "Choose an option",
    yes: "Yes",
    notes: "Notes",
    notesPlaceholder: "Anything the business should know?",
    sendingRequest: "Sending request...",
    sendPreferredTimeRequest: "Send preferred time request",
    sendBookingRequest: "Send booking request",
    noPaymentNotice:
      "No payment is collected here. The business will review your request and follow up using the contact information you provide.",
    requestReceived: "Request Received",
    thanks: "Thanks",
    requestAnotherTime: "Request another time",
    requestedTime: "Requested Time",
    noteSent: "Note Sent",
    whatHappensNext: "What happens next?",
    confirmationFixed:
      "This is not confirmed yet. Once the business approves or declines the request, you may receive an update from the business.",
    confirmationFlexible:
      "This is a preferred time request, not a confirmed appointment. The business may approve it or respond with a different time for that date.",
    days: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
  },
  es: {
    schednestBooking: "Reservas de SchedNest",
    bookWith: "Reserva con",
    fallbackBusiness: "este negocio",
    fixedDescription:
      "Elige un servicio y una hora disponible. Tu solicitud será enviada al negocio para confirmación.",
    flexibleDescription:
      "Elige un servicio, solicita tu horario preferido y el negocio confirmará o propondrá otra hora.",
    chooseService: "Elegir servicio",
    requestTime: "Solicitar hora",
    pickTime: "Elegir hora",
    sendRequest: "Enviar solicitud",
    pickWhatYouNeed: "Elige lo que necesitas",
    selectDateTime: "Selecciona fecha y hora",
    contactInfoReady: "Información lista",
    addContactInfo: "Agrega nombre y contacto",
    businessHours: "Horario del negocio",
    byAppointment: "Por cita",
    closed: "Cerrado",
    flexibleScheduling: "Horario flexible",
    flexibleSchedulingDescription:
      "Este negocio acepta horarios preferidos. Solicita una fecha y hora, y el negocio confirmará o responderá con una hora que funcione.",
    requestAppointment: "Solicitar cita",
    chooseBookingDetails: "Elige los detalles de tu reserva",
    noServicesTitle: "No hay servicios disponibles todavía.",
    noServicesDescription:
      "Este negocio aún no ha publicado servicios para reservar en línea. Usa la información de contacto para comunicarte directamente.",
    service: "Servicio",
    pickService: "Elige el servicio que quieres solicitar.",
    selected: "Seleccionado",
    chooseServiceButton: "Elegir servicio",
    selectedServiceGallery: "Galería del servicio seleccionado",
    yourName: "Tu nombre",
    fullName: "Tu nombre completo",
    phone: "Teléfono",
    email: "Correo electrónico",
    phoneOrEmailRequired: "o correo requerido",
    emailOrPhoneRequired: "o teléfono requerido",
    phonePlaceholder: "Número de teléfono",
    emailPlaceholder: "Correo electrónico",
    preferredDate: "Fecha preferida",
    date: "Fecha",
    preferredTime: "Hora preferida",
    availableTime: "Hora disponible",
    chooseDateFirst: "Elige una fecha primero",
    choosePreferredTime: "Elige una hora preferida",
    chooseAvailableTime: "Elige una hora disponible",
    noAvailableTimes: "No hay horarios disponibles para este día",
    closedOn: "Este negocio está cerrado el",
    noTimesForService:
      "No hay horarios disponibles para el servicio seleccionado en este día.",
    flexibleTimeNotice:
      "Esta es una solicitud de horario preferido. El negocio puede confirmarlo o responder con otra hora.",
    requestSummary: "Resumen de solicitud",
    pendingUntilConfirmed:
      "Esta cita quedará pendiente hasta que el negocio la confirme.",
    preferredTimeSent:
      "Este horario preferido será enviado al negocio para revisión.",
    intakeTitle: "Algunos detalles para este servicio",
    intakeDescription:
      "Estas preguntas ayudan al negocio a prepararse antes de confirmar tu solicitud.",
    chooseOption: "Elige una opción",
    yes: "Sí",
    notes: "Notas",
    notesPlaceholder: "¿Algo que el negocio deba saber?",
    sendingRequest: "Enviando solicitud...",
    sendPreferredTimeRequest: "Enviar solicitud de horario preferido",
    sendBookingRequest: "Enviar solicitud de reserva",
    noPaymentNotice:
      "No se cobra ningún pago aquí. El negocio revisará tu solicitud y te contactará usando la información que proporcionaste.",
    requestReceived: "Solicitud recibida",
    thanks: "Gracias",
    requestAnotherTime: "Solicitar otra hora",
    requestedTime: "Hora solicitada",
    noteSent: "Nota enviada",
    whatHappensNext: "¿Qué pasa después?",
    confirmationFixed:
      "Esto aún no está confirmado. Cuando el negocio apruebe o rechace la solicitud, podrías recibir una actualización.",
    confirmationFlexible:
      "Esta es una solicitud de horario preferido, no una cita confirmada. El negocio puede aprobarla o responder con otra hora para esa fecha.",
    days: [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ],
  },
};


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

function formatDateLabel(dateValue: string, language: "en" | "es" = "en") {
  if (!dateValue) return "";

  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function getZonedDateTimeParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function getTodayDateValue(timeZone: string) {
  const parts = getZonedDateTimeParts(new Date(), timeZone);

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function getCurrentMinutesInTimeZone(timeZone: string) {
  const parts = getZonedDateTimeParts(new Date(), timeZone);
  return parts.hour * 60 + parts.minute;
}

function getLocalTimelineValue(value: string, timeZone: string) {
  const parts = getZonedDateTimeParts(new Date(value), timeZone);

  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute
  );
}

function getDateDayIndex(dateValue: string) {
  if (!dateValue) return null;

  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function normalizeQuestionOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function getManualPaymentRows(business: PublicBusiness | null | undefined) {
  if (!business) return [];

  return [
    {
      label: "Zelle",
      value: business.manual_payment_zelle,
    },
    {
      label: "Cash App",
      value: business.manual_payment_cash_app,
    },
    {
      label: "Venmo",
      value: business.manual_payment_venmo,
    },
    {
      label: "PayPal",
      value: business.manual_payment_paypal,
    },
    {
      label: "Other",
      value: business.manual_payment_other,
    },
  ].filter((item) => item.value && item.value.trim());
}

function hasManualPaymentDetails(business: PublicBusiness | null | undefined) {
  if (!business || business.manual_payments_enabled === false) return false;

  return (
    getManualPaymentRows(business).length > 0 ||
    Boolean(getSafeImageUrl(business.manual_payment_qr_url))
  );
}

function isIntakeAnswerMissing(value: string | boolean | undefined) {
  if (typeof value === "boolean") return value !== true;
  return !value || !value.trim();
}

type PublicServiceDepositRow = {
  id: string;
  deposit_required?: boolean | null;
  deposit_collection_method?: string | null;
  deposit_type?: string | null;
  deposit_amount?: number | string | null;
  deposit_policy?: string | null;
  manual_deposit_instructions?: string | null;
};

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const supabase = useMemo(() => createClient(), []);
  const bookingDateInputRef = useRef<HTMLInputElement | null>(null);
  const t = useT();
  const { language } = useLanguage();
  const copy = publicBookingCopy[language];

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
  const [occupiedRanges, setOccupiedRanges] = useState<
    OccupiedBookingRange[]
  >([]);
  const [notes, setNotes] = useState("");
  const [intakeAnswers, setIntakeAnswers] = useState<
    Record<string, string | boolean>
  >({});
  const [depositPolicyAccepted, setDepositPolicyAccepted] = useState(false);
  const bookingSubmissionRef = useRef<{
    key: string;
    fingerprint: string;
  } | null>(null);

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
    "#27b8ae"
  );
  const accentColor = normalizeColor(
    pageData?.business.brand_accent_color || null,
    "#f47b3b"
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
      ? "torogoz-public-page min-h-screen px-4 py-6 text-white sm:px-6 sm:py-10"
      : "torogoz-public-page min-h-screen px-4 py-6 text-white sm:px-6 sm:py-10";

  const cardClass = isCleanTheme
    ? "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6";

  const heroCardClass = isCleanTheme
    ? "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    : isPremiumTheme
      ? "rounded-[2rem] border border-edition-primary/20 bg-white/[0.05] p-6 shadow-[0_0_60px_rgb(var(--edition-glow)/0.08)] sm:p-8"
      : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8";

  const mutedTextClass = isCleanTheme ? "text-slate-600" : "text-gray-400";
  const softTextClass = isCleanTheme ? "text-slate-500" : "text-gray-500";
  const titleTextClass = isCleanTheme ? "text-slate-950" : "text-white";
  const inputClass = isCleanTheme
    ? "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400"
    : "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-edition-primary";

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

    const businessTimeZone =
      pageData?.business.timezone || "America/Los_Angeles";
    const todayValue = getTodayDateValue(businessTimeZone);
    const currentMinutes = getCurrentMinutesInTimeZone(businessTimeZone);

    const [bookingYear, bookingMonth, bookingDay] = bookingDate
      .split("-")
      .map(Number);

    const slots: { value: string; label: string }[] = [];

    for (let minutes = openMinutes; minutes <= latestStartTime; minutes += 30) {
      if (bookingDate === todayValue && minutes <= currentMinutes) {
        continue;
      }

      const value = minutesToTimeValue(minutes);
      const slotStart = Date.UTC(
        bookingYear,
        bookingMonth - 1,
        bookingDay,
        Math.floor(minutes / 60),
        minutes % 60
      );
      const slotEnd = slotStart + serviceDuration * 60 * 1000;

      const overlapsExistingBooking = occupiedRanges.some((range) => {
        const occupiedStart = getLocalTimelineValue(
          range.start_time,
          businessTimeZone
        );
        const occupiedEnd = getLocalTimelineValue(
          range.end_time,
          businessTimeZone
        );

        return slotStart < occupiedEnd && occupiedStart < slotEnd;
      });

      if (overlapsExistingBooking) {
        continue;
      }

      slots.push({
        value,
        label: formatTime12Hour(value),
      });
    }

    return slots;
  }, [
    bookingDate,
    selectedDayHours,
    selectedService,
    isFlexibleRequest,
    occupiedRanges,
    pageData?.business.timezone,
  ]);

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

    const { data: manualPaymentData, error: manualPaymentError } =
      await supabase.rpc("get_public_manual_payment_methods", {
        p_business_id: typedData.business.id,
      });

    const businessWithManualPayments =
      !manualPaymentError &&
      manualPaymentData &&
      typeof manualPaymentData === "object"
        ? {
            ...typedData.business,
            ...(manualPaymentData as Partial<PublicBusiness>),
          }
        : typedData.business;

    if (manualPaymentError) {
      console.warn(
        "Manual payment methods could not load:",
        manualPaymentError.message
      );
    }

    const baseServices = Array.isArray(typedData.services)
      ? typedData.services
      : [];

    let servicesWithDeposits: PublicService[] = baseServices.map((service) => ({
      ...service,
      deposit_required: service.deposit_required || false,
      deposit_collection_method: service.deposit_collection_method || "manual",
      deposit_type: service.deposit_type || "none",
      deposit_amount:
        service.deposit_amount === null || service.deposit_amount === undefined
          ? null
          : Number(service.deposit_amount),
      deposit_policy: service.deposit_policy || null,
      manual_deposit_instructions:
        service.manual_deposit_instructions || null,
    }));

    const { data: depositData, error: depositError } = await supabase.rpc(
      "get_public_service_deposits",
      {
        p_business_id: typedData.business.id,
      }
    );

    if (!depositError && Array.isArray(depositData)) {
      const depositByServiceId = new Map(
        depositData.map((row: PublicServiceDepositRow) => [row.id, row])
      );

      servicesWithDeposits = baseServices.map((service) => {
        const deposit = depositByServiceId.get(service.id);

        return {
          ...service,
          deposit_required: deposit?.deposit_required || service.deposit_required || false,
          deposit_collection_method:
            deposit?.deposit_collection_method ||
            service.deposit_collection_method ||
            "manual",
          deposit_type: deposit?.deposit_type || service.deposit_type || "none",
          deposit_amount:
            deposit?.deposit_amount === null ||
            deposit?.deposit_amount === undefined
              ? service.deposit_amount === null ||
                service.deposit_amount === undefined
                ? null
                : Number(service.deposit_amount)
              : Number(deposit.deposit_amount),
          deposit_policy:
            deposit?.deposit_policy || service.deposit_policy || null,
          manual_deposit_instructions:
            deposit?.manual_deposit_instructions ||
            service.manual_deposit_instructions ||
            null,
        };
      });
    } else if (depositError) {
      console.warn("Deposit settings could not load:", depositError.message);
    }

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
      business: businessWithManualPayments,
      services: servicesWithDeposits,
      business_hours: Array.isArray(typedData.business_hours)
        ? typedData.business_hours
        : [],
      booking_questions: safeQuestions,
    });

    if (servicesWithDeposits.length > 0) {
      setSelectedServiceId(servicesWithDeposits[0].id);
    } else {
      setSelectedServiceId("");
    }

    setIsLoading(false);
  }


  function openBookingDatePicker() {
    const dateInput = bookingDateInputRef.current;

    if (!dateInput) return;

    dateInput.focus();

    const pickerInput = dateInput as HTMLInputElement & {
      showPicker?: () => void;
    };

    pickerInput.showPicker?.();
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

    const submissionFingerprint = JSON.stringify({
      businessId: pageData.business.id,
      serviceId: selectedServiceId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      bookingDate,
      bookingTime,
      notes: requestNotes,
      intakeAnswers: intakePayload,
    });

    if (
      !bookingSubmissionRef.current ||
      bookingSubmissionRef.current.fingerprint !== submissionFingerprint
    ) {
      bookingSubmissionRef.current = {
        key: crypto.randomUUID(),
        fingerprint: submissionFingerprint,
      };
    }

    const { data, error } = await supabase.rpc(
      "create_public_booking_with_intake_local_idempotent",
      {
        p_business_id: pageData.business.id,
        p_service_id: selectedServiceId,
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_email: customerEmail,
        p_local_date: bookingDate,
        p_local_time: bookingTime,
        p_submission_key: bookingSubmissionRef.current.key,
        p_notes: requestNotes,
        p_intake_answers: intakePayload,
      }
    );

    if (error) {
      setErrorMessage(
        error.code === "23P01"
          ? "That time is no longer available. Please choose another time."
          : error.message
      );
      setIsSubmitting(false);
      return;
    }

    const bookingResult = data as {
      id?: string;
      start_time?: string;
      end_time?: string;
    } | null;

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

    if (
      !isFlexibleRequest &&
      bookingResult?.start_time &&
      bookingResult?.end_time
    ) {
      const bookedStartTime = bookingResult.start_time;
      const bookedEndTime = bookingResult.end_time;

      setOccupiedRanges((currentRanges) => [
        ...currentRanges,
        {
          start_time: bookedStartTime,
          end_time: bookedEndTime,
        },
      ]);
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

    bookingSubmissionRef.current = null;
    setIsSubmitting(false);
  }

  useEffect(() => {
    if (!slug) return;

    const timeoutId = window.setTimeout(() => {
      void loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (
      !pageData?.business.id ||
      !bookingDate ||
      isFlexibleRequest
    ) {
      return;
    }

    const businessId = pageData.business.id;
    let isCurrentRequest = true;

    async function loadOccupiedRanges() {
      const { data, error } = await supabase.rpc(
        "get_public_booking_occupied_ranges",
        {
          p_business_id: businessId,
          p_local_date: bookingDate,
        }
      );

      if (!isCurrentRequest) return;

      if (error) {
        setOccupiedRanges([]);
        setErrorMessage(error.message);
        return;
      }

      setOccupiedRanges(
        Array.isArray(data) ? (data as OccupiedBookingRange[]) : []
      );
    }

    void loadOccupiedRanges();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    bookingDate,
    isFlexibleRequest,
    pageData?.business.id,
    supabase,
  ]);

  useEffect(() => {
    if (!bookingTime || isFlexibleRequest) return;

    const stillAvailable = availableTimes.some(
      (time) => time.value === bookingTime
    );

    if (stillAvailable) return;

    const timeoutId = window.setTimeout(() => {
      setBookingTime("");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [availableTimes, bookingTime, isFlexibleRequest]);

  if (isLoading) {
    return (
      <main className="torogoz-public-page min-h-screen px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm text-gray-400">Loading booking page...</p>
        </div>
      </main>
    );
  }

  if (!pageData) {
    return (
      <main className="torogoz-public-page min-h-screen px-6 py-10 text-white">
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
        {/* Public booking language switcher */}
        <div className="flex justify-end">
          <div
            className={`rounded-2xl border p-2 ${
              isCleanTheme
                ? "border-slate-200 bg-white"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <LanguageSwitcher />
          </div>
        </div>

        <section className={heroCardClass}>
          <div
            className="h-2 w-24 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />

          <p className="mt-6 text-sm font-black uppercase tracking-[0.28em]">
            <span style={{ color: primaryColor }}>{copy.schednestBooking}</span>
          </p>

          <h1 className={`mt-3 text-4xl font-black ${titleTextClass} md:text-5xl`}>
            {copy.bookWith} {pageData.business.business_name || copy.fallbackBusiness}
          </h1>

          <p className={`mt-4 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
            {pageData.business.business_description ||
              (isFlexibleRequest
                ? copy.flexibleDescription
                : copy.fixedDescription)}
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["1", copy.chooseService, selectedService ? selectedService.name : copy.pickWhatYouNeed],
              [
                "2",
                isFlexibleRequest ? copy.requestTime : copy.pickTime,
                bookingDate && bookingTime
                  ? `${formatDateLabel(bookingDate, language)} · ${formatTime12Hour(bookingTime)}`
                  : copy.selectDateTime,
              ],
              [
                "3",
                copy.sendRequest,
                hasContactInfo
                  ? copy.contactInfoReady
                  : copy.addContactInfo,
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
            className="rounded-[2rem] border p-8 shadow-[0_0_40px_rgb(var(--edition-glow)/0.08)]"
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
                  {copy.requestReceived}
                </p>

                <h2 className={`mt-3 text-3xl font-black ${titleTextClass}`}>
                  {copy.thanks}, {confirmationSummary.customerName}.
                </h2>

                <p className={`mt-3 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
                  {copy.sendRequest}{" "}
                  {confirmationSummary.businessName}.{" "}
                  {confirmationSummary.isFlexibleRequest
                    ? copy.flexibleDescription
                    : copy.fixedDescription}
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
                {copy.requestAnotherTime}
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
                    ? copy.preferredTime
                    : copy.requestedTime}
                </p>
                <p className={`mt-2 text-lg font-black ${titleTextClass}`}>
                  {formatDateLabel(confirmationSummary.bookingDate, language)}
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
                  {copy.noteSent}
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
                {copy.whatHappensNext}
              </p>
              <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                {confirmationSummary.isFlexibleRequest
                  ? copy.confirmationFlexible
                  : copy.confirmationFixed}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className={cardClass}>
            <p className="text-sm font-black" style={{ color: primaryColor }}>
              {businessHoursEnabled ? copy.businessHours : copy.byAppointment}
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
                      {copy.days[hour.day_of_week]}
                    </span>
                    <span className={mutedTextClass}>
                      {hour.is_open
                        ? formatBusinessHourRange(
                            hour.open_time,
                            hour.close_time
                          )
                        : copy.closed}
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
                  {copy.flexibleScheduling}
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  {copy.flexibleSchedulingDescription}
                </p>
              </div>
            )}
          </div>

          <div className={cardClass}>
            <p className="text-sm font-black" style={{ color: primaryColor }}>
              {copy.requestAppointment}
            </p>
            <h2 className={`mt-3 text-2xl font-black ${titleTextClass}`}>
              {copy.chooseBookingDetails}
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
                  {copy.noServicesTitle}
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  {copy.noServicesDescription}
                </p>
              </div>
            ) : (
            <form onSubmit={submitBooking} className="mt-6 grid gap-4">
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                      {copy.service}
                    </label>
                    <p className={`mt-1 text-xs ${softTextClass}`}>
                      {copy.pickService}
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
                            ? "border-edition-primary/40 bg-edition-primary/10"
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
                              ? "bg-edition-primary text-black"
                              : isCleanTheme
                                ? "bg-white text-slate-600"
                                : "bg-white/10 text-gray-300"
                          }`}
                        >
                          {isSelected ? copy.selected : copy.chooseServiceButton}
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
                        {copy.selectedServiceGallery}
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
                  {copy.yourName}
                </label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder={copy.fullName}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {copy.phone} <span className="font-normal opacity-70">{copy.phoneOrEmailRequired}</span>
                  </label>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder={copy.phonePlaceholder}
                    className={`${inputClass} cursor-pointer`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {copy.email} <span className="font-normal opacity-70">{copy.emailOrPhoneRequired}</span>
                  </label>
                  <input
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    type="email"
                    placeholder={copy.emailPlaceholder}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openBookingDatePicker}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openBookingDatePicker();
                    }
                  }}
                  className="cursor-pointer"
                >
                  <label className={`cursor-pointer text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {isFlexibleRequest ? copy.preferredDate : copy.date}
                  </label>
                  <input
                    ref={bookingDateInputRef}
                    value={bookingDate}
                    onChange={(event) => {
                      setBookingDate(event.target.value);
                      setBookingTime("");
                      setOccupiedRanges([]);
                      setErrorMessage("");
                      setConfirmationSummary(null);
                    }}
                    type="date"
                    min={getTodayDateValue(pageData?.business.timezone || "America/Los_Angeles")}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {isFlexibleRequest ? copy.preferredTime : copy.availableTime}
                  </label>

                  {isFlexibleRequest ? (
                    <select
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      disabled={!bookingDate}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {!bookingDate && (
                        <option value="">{copy.chooseDateFirst}</option>
                      )}

                      {bookingDate && (
                        <option value="">{copy.choosePreferredTime}</option>
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
                        <option value="">{copy.chooseDateFirst}</option>
                      )}

                      {bookingDate && availableTimes.length === 0 && (
                        <option value="">{copy.noAvailableTimes}</option>
                      )}

                      {bookingDate && availableTimes.length > 0 && (
                        <option value="">{copy.chooseAvailableTime}</option>
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
                        {copy.closedOn}{" "}
                        {copy.days[selectedDayHours.day_of_week]}.
                      </p>
                    )}

                  {!isFlexibleRequest &&
                    bookingDate &&
                    selectedDayHours &&
                    selectedDayHours.is_open &&
                    availableTimes.length === 0 && (
                      <p className={`mt-2 text-xs ${softTextClass}`}>
                        {copy.noTimesForService}
                      </p>
                    )}

                  {isFlexibleRequest && bookingDate && (
                    <p className={`mt-2 text-xs ${softTextClass}`}>
                      {copy.flexibleTimeNotice}
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
                    {copy.requestSummary}
                  </p>
                  <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                    {selectedService.name} on {formatDateLabel(bookingDate, language)} at{" "}
                    {formatTime12Hour(bookingTime)}.
                  </p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>
                    {isFlexibleRequest
                      ? copy.preferredTimeSent
                      : copy.pendingUntilConfirmed}
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
                    {copy.intakeTitle}
                  </p>
                  <p className={`mt-2 text-xs leading-5 ${softTextClass}`}>
                    {copy.intakeDescription}
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
                            <option value="">{copy.chooseOption}</option>
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
                              className="h-5 w-5 accent-[var(--edition-primary)]"
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
                        {t("deposit.businessPolicy", "Business-written deposit policy")}
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

                  {selectedService.deposit_collection_method === "manual" &&
                    hasManualPaymentDetails(pageData.business) && (
                      <div
                        className={`mt-4 rounded-2xl border p-4 ${
                          isCleanTheme
                            ? "border-yellow-200 bg-white"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <p className={`text-xs font-black uppercase tracking-[0.2em] ${softTextClass}`}>
                          {t(
                            "manualPayments.publicTitle",
                            "Ways to send your manual deposit"
                          )}
                        </p>

                        <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                          {t(
                            "manualPayments.publicDescription",
                            "Use one of the payment methods below, then the business will mark your deposit as received."
                          )}
                        </p>

                        {getManualPaymentRows(pageData.business).length > 0 && (
                          <div className="mt-4 grid gap-2">
                            {getManualPaymentRows(pageData.business).map(
                              (paymentMethod) => (
                                <div
                                  key={paymentMethod.label}
                                  className={`rounded-2xl border px-4 py-3 ${
                                    isCleanTheme
                                      ? "border-yellow-200 bg-yellow-50"
                                      : "border-white/10 bg-black/30"
                                  }`}
                                >
                                  <p className={`text-xs font-black uppercase tracking-[0.18em] ${softTextClass}`}>
                                    {paymentMethod.label}
                                  </p>
                                  <p className={`mt-1 break-words text-sm font-black ${titleTextClass}`}>
                                    {paymentMethod.value}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {getSafeImageUrl(pageData.business.manual_payment_qr_url) && (
                          <div
                            className={`mt-4 overflow-hidden rounded-2xl border ${
                              isCleanTheme
                                ? "border-yellow-200 bg-white"
                                : "border-white/10 bg-white"
                            }`}
                          >
                            <img
                              src={getSafeImageUrl(
                                pageData.business.manual_payment_qr_url
                              )}
                              alt={
                                pageData.business.manual_payment_qr_caption ||
                                t("manualPayments.qrCode", "Payment QR code")
                              }
                              className="max-h-80 w-full object-contain"
                            />

                            {pageData.business.manual_payment_qr_caption && (
                              <p className="border-t border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700">
                                {pageData.business.manual_payment_qr_caption}
                              </p>
                            )}
                          </div>
                        )}
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
                      className="mt-0.5 h-5 w-5 accent-[var(--edition-primary)]"
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
                  {copy.notes}
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={copy.notesPlaceholder}
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
                  ? copy.sendingRequest
                  : isFlexibleRequest
                    ? copy.sendPreferredTimeRequest
                    : copy.sendBookingRequest}
              </button>

              <p className={`text-center text-xs leading-5 ${softTextClass}`}>
                {copy.noPaymentNotice}
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