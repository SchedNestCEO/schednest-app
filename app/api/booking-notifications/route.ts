import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "../../lib/supabase/admin";

type NotificationEvent =
  "booking.requested" | "booking.approved" | "booking.declined";

type Booking = {
  id: string;
  business_id: string;
  owner_id: string;
  customer_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  source: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  deposit_required: boolean | null;
  deposit_collection_method: string | null;
  deposit_status: string | null;
  deposit_amount: number | null;
  deposit_policy: string | null;
  manual_deposit_instructions: string | null;
  deposit_policy_accepted: boolean | null;
};

type BusinessProfile = {
  id: string;
  business_name: string | null;
  email: string | null;
  contact_email: string | null;
  slug: string | null;
  owner_id: string;
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
  name: string;
  price: number | null;
  duration_minutes: number | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "Not set";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDepositStatus(value: string | null | undefined) {
  if (!value || value === "not_required") return "Not required";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function getManualPaymentRows(business: BusinessProfile | null | undefined) {
  if (!business || business.manual_payments_enabled === false) return [];

  return [
    { label: "Zelle", value: business.manual_payment_zelle },
    { label: "Cash App", value: business.manual_payment_cash_app },
    { label: "Venmo", value: business.manual_payment_venmo },
    { label: "PayPal", value: business.manual_payment_paypal },
    { label: "Other", value: business.manual_payment_other },
  ].filter((item) => item.value && item.value.trim());
}

function depositEmailHtml(booking: Booking, business: BusinessProfile | null) {
  if (!booking.deposit_required) return "";

  const paymentRows = getManualPaymentRows(business);
  const qrUrl = getSafeImageUrl(business?.manual_payment_qr_url);
  const qrCaption = business?.manual_payment_qr_caption || "Payment QR code";

  const paymentMethodsHtml =
    paymentRows.length > 0
      ? `
<div style="margin-top:14px;">
<p style="font-size:13px; font-weight:700; color:#111827; margin:0 0 8px;">Manual payment methods</p>
${paymentRows
  .map(
    (paymentMethod) => `
<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-top:8px;">
<p style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; margin:0 0 4px;">${escapeHtml(paymentMethod.label)}</p>
<p style="font-size:14px; font-weight:700; color:#111827; margin:0; word-break:break-word;">${escapeHtml(paymentMethod.value || "")}</p>
</div>
`,
  )
  .join("")}
</div>
`
      : "";

  const qrHtml = qrUrl
    ? `
<div style="margin-top:14px;">
<p style="font-size:13px; font-weight:700; color:#111827; margin:0 0 8px;">Payment QR code</p>
<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; text-align:center;">
<img src="${qrUrl}" alt="${escapeHtml(qrCaption)}" style="max-width:220px; width:100%; height:auto; border-radius:10px;" />
<p style="font-size:12px; color:#374151; margin:8px 0 0;">${escapeHtml(qrCaption)}</p>
</div>
</div>
`
    : "";

  return `
<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:14px; padding:16px; margin-top:18px;">
<p style="font-size:14px; font-weight:700; color:#92400e; margin:0 0 8px;">Deposit required</p>
<p style="margin:0 0 8px; color:#111827;"><strong>Deposit amount:</strong> ${
    booking.deposit_amount ? formatMoney(booking.deposit_amount) : "Required"
  }</p>
<p style="margin:0 0 8px; color:#111827;"><strong>Deposit status:</strong> ${formatDepositStatus(
    booking.deposit_status,
  )}</p>
${
  booking.deposit_policy
    ? `<p style="margin:12px 0 6px; color:#111827;"><strong>Business-written deposit policy:</strong></p>
<p style="white-space:pre-line; margin:0; color:#374151; line-height:1.6;">${escapeHtml(
        booking.deposit_policy,
      )}</p>`
    : ""
}
${
  booking.manual_deposit_instructions
    ? `<p style="margin:12px 0 6px; color:#111827;"><strong>Manual deposit instructions:</strong></p>
<p style="white-space:pre-line; margin:0; color:#374151; line-height:1.6;">${escapeHtml(
        booking.manual_deposit_instructions,
      )}</p>`
    : ""
}
${paymentMethodsHtml}
${qrHtml}
<p style="font-size:12px; color:#92400e; line-height:1.6; margin:14px 0 0;">
SchedNest cannot automatically verify manual payments. The business will mark the deposit as received after reviewing payment.
</p>
</div>
`;
}

function baseEmailHtml(content: string) {
  return `
<div style="font-family: Arial, sans-serif; background:#f6f8f7; padding:32px;">
<div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:18px; padding:28px; border:1px solid #e5e7eb;">
<div style="font-size:14px; font-weight:700; color:#047857; margin-bottom:16px;">
SchedNest
</div>
${content}
<hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;" />
<p style="font-size:12px; color:#6b7280; line-height:1.6;">
Sent by SchedNest. From first client to full company.
</p>
</div>
</div>
`;
}

function customerPendingEmail(
  businessName: string,
  serviceName: string,
  startTime: string,
  depositHtml = "",
) {
  return {
    subject: `Your booking request was received by ${businessName}`,
    html: baseEmailHtml(`
<h1 style="font-size:24px; margin:0 0 12px; color:#111827;">Booking request received</h1>
<p style="font-size:15px; line-height:1.7; color:#374151;">
Your request with <strong>${businessName}</strong> has been received and is pending approval.
</p>
<div style="background:#f3f4f6; border-radius:14px; padding:16px; margin-top:18px;">
<p style="margin:0 0 8px; color:#111827;"><strong>Service:</strong> ${serviceName}</p>
<p style="margin:0; color:#111827;"><strong>Requested time:</strong> ${startTime}</p>
</div>
${depositHtml}
<p style="font-size:15px; line-height:1.7; color:#374151; margin-top:18px;">
The business will confirm your appointment soon.
</p>
`),
  };
}

function ownerNewRequestEmail(
  customerName: string,
  serviceName: string,
  startTime: string,
  dashboardUrl: string,
  depositHtml = "",
) {
  return {
    subject: `New booking request from ${customerName}`,
    html: baseEmailHtml(`
<h1 style="font-size:24px; margin:0 0 12px; color:#111827;">New booking request</h1>
<p style="font-size:15px; line-height:1.7; color:#374151;">
<strong>${customerName}</strong> requested an appointment.
</p>
<div style="background:#f3f4f6; border-radius:14px; padding:16px; margin-top:18px;">
<p style="margin:0 0 8px; color:#111827;"><strong>Service:</strong> ${serviceName}</p>
<p style="margin:0; color:#111827;"><strong>Requested time:</strong> ${startTime}</p>
</div>
${depositHtml}
<p style="margin-top:24px;">
<a href="${dashboardUrl}" style="background:#34d399; color:#000000; padding:12px 18px; border-radius:12px; text-decoration:none; font-weight:700;">
Review request
</a>
</p>
`),
  };
}

function customerApprovedEmail(
  businessName: string,
  serviceName: string,
  startTime: string,
  depositHtml = "",
) {
  return {
    subject: `Your appointment with ${businessName} is confirmed`,
    html: baseEmailHtml(`
<h1 style="font-size:24px; margin:0 0 12px; color:#111827;">Appointment confirmed</h1>
<p style="font-size:15px; line-height:1.7; color:#374151;">
Your appointment with <strong>${businessName}</strong> has been confirmed.
</p>
<div style="background:#f3f4f6; border-radius:14px; padding:16px; margin-top:18px;">
<p style="margin:0 0 8px; color:#111827;"><strong>Service:</strong> ${serviceName}</p>
<p style="margin:0; color:#111827;"><strong>Time:</strong> ${startTime}</p>
</div>
${depositHtml}
`),
  };
}

function customerDeclinedEmail(
  businessName: string,
  serviceName: string,
  startTime: string,
  bookingPageUrl: string,
) {
  return {
    subject: `Your booking request with ${businessName} was declined`,
    html: baseEmailHtml(`
<h1 style="font-size:24px; margin:0 0 12px; color:#111827;">Booking request declined</h1>
<p style="font-size:15px; line-height:1.7; color:#374151;">
Your request with <strong>${businessName}</strong> was declined.
</p>
<div style="background:#f3f4f6; border-radius:14px; padding:16px; margin-top:18px;">
<p style="margin:0 0 8px; color:#111827;"><strong>Service:</strong> ${serviceName}</p>
<p style="margin:0; color:#111827;"><strong>Requested time:</strong> ${startTime}</p>
</div>
<p style="font-size:15px; line-height:1.7; color:#374151; margin-top:18px;">
You can request another time using the booking page.
</p>
<p style="margin-top:24px;">
<a href="${bookingPageUrl}" style="background:#34d399; color:#000000; padding:12px 18px; border-radius:12px; text-decoration:none; font-weight:700;">
Request another time
</a>
</p>
`),
  };
}

type DeliveryStatus = "sent" | "failed" | "skipped";

type DeliveryOutcome = {
  recipientType: string;
  recipientEmail: string;
  delivery: DeliveryStatus;
  logged: boolean;
  providerMessageId: string | null;
};

async function logNotification(params: {
  booking: Booking;
  eventType: NotificationEvent;
  recipientType: string;
  recipientEmail: string;
  subject: string;
  status: DeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("booking_notifications").insert({
    booking_id: params.booking.id,
    business_id: params.booking.business_id,
    owner_id: params.booking.owner_id,
    event_type: params.eventType,
    recipient_type: params.recipientType,
    recipient_email: params.recipientEmail,
    subject: params.subject,
    status: params.status,
    provider: "resend",
    provider_message_id: params.providerMessageId || null,
    error_message: params.errorMessage || null,
    sent_at: params.status === "sent" ? new Date().toISOString() : null,
    last_attempt_at: new Date().toISOString(),
  });

  if (error) {
    console.error("booking_notification_log_failed", {
      bookingId: params.booking.id,
      eventType: params.eventType,
      recipientType: params.recipientType,
      deliveryStatus: params.status,
      error: error.message,
      code: error.code,
    });

    return false;
  }

  return true;
}

async function sendEmail(params: {
  booking: Booking;
  eventType: NotificationEvent;
  recipientType: string;
  to: string | null | undefined;
  subject: string;
  html: string;
}): Promise<DeliveryOutcome> {
  const recipientEmail = params.to || "missing";

  if (!params.to) {
    const logged = await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail,
      subject: params.subject,
      status: "skipped",
      errorMessage: "Missing recipient email.",
    });

    return {
      recipientType: params.recipientType,
      recipientEmail,
      delivery: "skipped",
      logged,
      providerMessageId: null,
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.NOTIFICATION_FROM_EMAIL || "SchedNest <onboarding@resend.dev>";

  if (!resendApiKey) {
    const logged = await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail,
      subject: params.subject,
      status: "failed",
      errorMessage: "Missing email provider configuration.",
    });

    return {
      recipientType: params.recipientType,
      recipientEmail,
      delivery: "failed",
      logged,
      providerMessageId: null,
    };
  }

  try {
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      const logged = await logNotification({
        booking: params.booking,
        eventType: params.eventType,
        recipientType: params.recipientType,
        recipientEmail,
        subject: params.subject,
        status: "failed",
        errorMessage: error.message,
      });

      return {
        recipientType: params.recipientType,
        recipientEmail,
        delivery: "failed",
        logged,
        providerMessageId: null,
      };
    }

    const providerMessageId = data?.id || null;

    const logged = await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail,
      subject: params.subject,
      status: "sent",
      providerMessageId,
    });

    return {
      recipientType: params.recipientType,
      recipientEmail,
      delivery: "sent",
      logged,
      providerMessageId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email provider request failed.";

    const logged = await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail,
      subject: params.subject,
      status: "failed",
      errorMessage: message,
    });

    return {
      recipientType: params.recipientType,
      recipientEmail,
      delivery: "failed",
      logged,
      providerMessageId: null,
    };
  }
}

async function getAuthenticatedUserId(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const bookingId = body.bookingId as string | undefined;
    const eventType = body.eventType as NotificationEvent | undefined;

    if (!bookingId || !eventType) {
      return NextResponse.json(
        { error: "bookingId and eventType are required." },
        { status: 400 },
      );
    }

    if (
      !["booking.requested", "booking.approved", "booking.declined"].includes(
        eventType,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid eventType." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, business_id, owner_id, customer_id, service_id, start_time, end_time, status, source, customer_name, customer_phone, customer_email, notes, deposit_required, deposit_collection_method, deposit_status, deposit_amount, deposit_policy, manual_deposit_instructions, deposit_policy_accepted",
      )
      .eq("id", bookingId)
      .single();

    if (bookingError) {
      return NextResponse.json(
        {
          error: "Booking lookup failed.",
          details: bookingError.message,
          code: bookingError.code,
          hint: bookingError.hint,
        },
        { status: 500 },
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    const typedBooking = booking as Booking;

    if (eventType === "booking.requested") {
      if (typedBooking.source !== "booking_page") {
        return NextResponse.json(
          {
            error: "Only public booking page requests can trigger this event.",
          },
          { status: 403 },
        );
      }
    }

    if (eventType === "booking.approved" || eventType === "booking.declined") {
      const userId = await getAuthenticatedUserId(request);

      if (!userId || typedBooking.owner_id !== userId) {
        return NextResponse.json(
          { error: "Not authorized to send this notification." },
          { status: 403 },
        );
      }
    }

    const { data: business, error: businessError } = await supabase
      .from("business_profiles")
      .select(
        "id, business_name, email, contact_email, slug, owner_id, manual_payments_enabled, manual_payment_zelle, manual_payment_cash_app, manual_payment_venmo, manual_payment_paypal, manual_payment_other, manual_payment_qr_url, manual_payment_qr_caption",
      )
      .eq("id", typedBooking.business_id)
      .single();

    if (businessError) {
      return NextResponse.json(
        {
          error: "Business lookup failed.",
          details: businessError.message,
          code: businessError.code,
          hint: businessError.hint,
        },
        { status: 500 },
      );
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("id", typedBooking.service_id)
      .single();

    if (serviceError) {
      return NextResponse.json(
        {
          error: "Service lookup failed.",
          details: serviceError.message,
          code: serviceError.code,
          hint: serviceError.hint,
        },
        { status: 500 },
      );
    }

    const typedBusiness = business as BusinessProfile | null;
    const typedService = service as Service | null;

    const businessName = typedBusiness?.business_name || "this business";
    const serviceName = typedService?.name || "Service";
    const customerName = typedBooking.customer_name || "Customer";
    const startTime = formatDateTime(typedBooking.start_time);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardUrl = `${siteUrl}/dashboard/requests`;
    const bookingPageUrl = typedBusiness?.slug
      ? `${siteUrl}/book/${typedBusiness.slug}`
      : siteUrl;
    const sharedDepositHtml = depositEmailHtml(typedBooking, typedBusiness);

    const outcomes: DeliveryOutcome[] = [];

    if (eventType === "booking.requested") {
      const customerEmail = customerPendingEmail(
        businessName,
        serviceName,
        startTime,
        sharedDepositHtml,
      );

      const ownerEmail = ownerNewRequestEmail(
        customerName,
        serviceName,
        startTime,
        dashboardUrl,
        sharedDepositHtml,
      );

      outcomes.push(
        await sendEmail({
          booking: typedBooking,
          eventType,
          recipientType: "customer",
          to: typedBooking.customer_email,
          subject: customerEmail.subject,
          html: customerEmail.html,
        }),
      );

      outcomes.push(
        await sendEmail({
          booking: typedBooking,
          eventType,
          recipientType: "owner",
          to: typedBusiness?.email || typedBusiness?.contact_email,
          subject: ownerEmail.subject,
          html: ownerEmail.html,
        }),
      );
    }

    if (eventType === "booking.approved") {
      const email = customerApprovedEmail(
        businessName,
        serviceName,
        startTime,
        sharedDepositHtml,
      );

      outcomes.push(
        await sendEmail({
          booking: typedBooking,
          eventType,
          recipientType: "customer",
          to: typedBooking.customer_email,
          subject: email.subject,
          html: email.html,
        }),
      );
    }

    if (eventType === "booking.declined") {
      const email = customerDeclinedEmail(
        businessName,
        serviceName,
        startTime,
        bookingPageUrl,
      );

      outcomes.push(
        await sendEmail({
          booking: typedBooking,
          eventType,
          recipientType: "customer",
          to: typedBooking.customer_email,
          subject: email.subject,
          html: email.html,
        }),
      );
    }

    const deliverySummary = {
      attempted: outcomes.length,
      sent: outcomes.filter(({ delivery }) => delivery === "sent").length,
      failed: outcomes.filter(({ delivery }) => delivery === "failed").length,
      skipped: outcomes.filter(({ delivery }) => delivery === "skipped").length,
      loggingFailures: outcomes.filter(({ logged }) => !logged).length,
      outcomes: outcomes.map(({ recipientType, delivery, logged }) => ({
        recipientType,
        delivery,
        logged,
      })),
    };

    const deliveryIncomplete = outcomes.some(
      ({ delivery, logged }) => delivery !== "sent" || !logged,
    );

    if (deliveryIncomplete) {
      console.error("booking_notification_delivery_incomplete", {
        bookingId: typedBooking.id,
        eventType,
        outcomes,
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            "The booking was updated, but one or more notifications were not delivered.",
          code: "BOOKING_NOTIFICATION_DELIVERY_INCOMPLETE",
          deliverySummary,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      deliverySummary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send notification.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
