import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "../../lib/supabase/admin";

type ReminderEvent = "booking.reminder.customer" | "booking.reminder.owner";

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
  customer_reminder_sent_at: string | null;
  owner_reminder_sent_at: string | null;
  deposit_reminder_sent_at: string | null;
};

type BusinessProfile = {
  id: string;
  business_name: string | null;
  email: string | null;
  contact_email: string | null;
  slug: string | null;
  owner_id: string;
  reminder_emails_enabled: boolean | null;
  reminder_hours_before: number | null;
  deposit_reminder_enabled: boolean | null;
  owner_reminder_enabled: boolean | null;
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

function depositReminderHtml(booking: Booking, business: BusinessProfile | null) {
  if (!booking.deposit_required) return "";

  const depositIsPending =
    booking.deposit_status !== "paid" && booking.deposit_status !== "waived";

  if (!depositIsPending) return "";

  const paymentRows = getManualPaymentRows(business);
  const qrUrl = getSafeImageUrl(business?.manual_payment_qr_url);
  const qrCaption = business?.manual_payment_qr_caption || "Payment QR code";

  const paymentRowsHtml =
    paymentRows.length > 0
      ? `
<div style="margin-top:14px;">
  <p style="font-size:13px; font-weight:700; color:#111827; margin:0 0 8px;">Manual payment methods</p>
  ${paymentRows
    .map(
      (paymentMethod) => `
  <div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-top:8px;">
    <p style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; margin:0 0 4px;">${escapeHtml(
      paymentMethod.label
    )}</p>
    <p style="font-size:14px; font-weight:700; color:#111827; margin:0; word-break:break-word;">${escapeHtml(
      paymentMethod.value || ""
    )}</p>
  </div>`
    )
    .join("")}
</div>`
      : "";

  const qrHtml = qrUrl
    ? `
<div style="margin-top:14px;">
  <p style="font-size:13px; font-weight:700; color:#111827; margin:0 0 8px;">Payment QR code</p>
  <div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; text-align:center;">
    <img src="${qrUrl}" alt="${escapeHtml(
        qrCaption
      )}" style="max-width:220px; width:100%; height:auto; border-radius:10px;" />
    <p style="font-size:12px; color:#374151; margin:8px 0 0;">${escapeHtml(
      qrCaption
    )}</p>
  </div>
</div>`
    : "";

  return `
<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:14px; padding:16px; margin-top:18px;">
  <p style="font-size:14px; font-weight:700; color:#92400e; margin:0 0 8px;">Deposit still pending</p>
  <p style="margin:0 0 8px; color:#111827;"><strong>Deposit amount:</strong> ${
    booking.deposit_amount ? formatMoney(booking.deposit_amount) : "Required"
  }</p>
  <p style="margin:0 0 8px; color:#111827;"><strong>Deposit status:</strong> ${formatDepositStatus(
    booking.deposit_status
  )}</p>
  ${
    booking.deposit_policy
      ? `<p style="margin:12px 0 6px; color:#111827;"><strong>Business-written deposit policy:</strong></p>
<p style="white-space:pre-line; margin:0; color:#374151; line-height:1.6;">${escapeHtml(
          booking.deposit_policy
        )}</p>`
      : ""
  }
  ${
    booking.manual_deposit_instructions
      ? `<p style="margin:12px 0 6px; color:#111827;"><strong>Manual deposit instructions:</strong></p>
<p style="white-space:pre-line; margin:0; color:#374151; line-height:1.6;">${escapeHtml(
          booking.manual_deposit_instructions
        )}</p>`
      : ""
  }
  ${paymentRowsHtml}
  ${qrHtml}
</div>`;
}

function customerReminderEmail(params: {
  businessName: string;
  serviceName: string;
  startTime: string;
  booking: Booking;
  business: BusinessProfile | null;
}) {
  const depositHtml = depositReminderHtml(params.booking, params.business);

  return {
    subject: `Reminder: your appointment with ${params.businessName}`,
    html: baseEmailHtml(`
<h1 style="font-size:24px; margin:0 0 12px; color:#111827;">Appointment reminder</h1>
<p style="font-size:15px; line-height:1.7; color:#374151;">
This is a reminder for your upcoming appointment with <strong>${escapeHtml(
      params.businessName
    )}</strong>.
</p>
<div style="background:#f3f4f6; border-radius:14px; padding:16px; margin-top:18px;">
  <p style="margin:0 0 8px; color:#111827;"><strong>Service:</strong> ${escapeHtml(
    params.serviceName
  )}</p>
  <p style="margin:0; color:#111827;"><strong>Time:</strong> ${params.startTime}</p>
</div>
${depositHtml}
<p style="font-size:15px; line-height:1.7; color:#374151; margin-top:18px;">
Please contact the business directly if you need to reschedule.
</p>
`),
  };
}

function ownerReminderEmail(params: {
  customerName: string;
  serviceName: string;
  startTime: string;
  dashboardUrl: string;
  booking: Booking;
}) {
  const depositLine = params.booking.deposit_required
    ? `<p style="margin:8px 0 0; color:#111827;"><strong>Deposit:</strong> ${formatDepositStatus(
        params.booking.deposit_status
      )}</p>`
    : "";

  return {
    subject: `Upcoming appointment: ${params.customerName}`,
    html: baseEmailHtml(`
<h1 style="font-size:24px; margin:0 0 12px; color:#111827;">Upcoming appointment</h1>
<p style="font-size:15px; line-height:1.7; color:#374151;">
You have an upcoming appointment.
</p>
<div style="background:#f3f4f6; border-radius:14px; padding:16px; margin-top:18px;">
  <p style="margin:0 0 8px; color:#111827;"><strong>Customer:</strong> ${escapeHtml(
    params.customerName
  )}</p>
  <p style="margin:0 0 8px; color:#111827;"><strong>Service:</strong> ${escapeHtml(
    params.serviceName
  )}</p>
  <p style="margin:0; color:#111827;"><strong>Time:</strong> ${params.startTime}</p>
  ${depositLine}
</div>
<p style="margin-top:24px;">
  <a href="${params.dashboardUrl}" style="background:#34d399; color:#000000; padding:12px 18px; border-radius:12px; text-decoration:none; font-weight:700;">
    View schedule
  </a>
</p>
`),
  };
}

async function logNotification(params: {
  booking: Booking;
  eventType: ReminderEvent;
  recipientType: string;
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  errorMessage?: string | null;
}) {
  const supabase = createAdminClient();

  await supabase.from("booking_notifications").insert({
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
  });
}

async function sendEmail(params: {
  booking: Booking;
  eventType: ReminderEvent;
  recipientType: string;
  to: string | null | undefined;
  subject: string;
  html: string;
}) {
  if (!params.to) {
    await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail: "missing",
      subject: params.subject,
      status: "skipped",
      errorMessage: "Missing recipient email.",
    });

    return false;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.NOTIFICATION_FROM_EMAIL || "SchedNest <onboarding@resend.dev>";

  if (!resendApiKey) {
    await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail: params.to,
      subject: params.subject,
      status: "failed",
      errorMessage: "Missing RESEND_API_KEY.",
    });

    return false;
  }

  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    await logNotification({
      booking: params.booking,
      eventType: params.eventType,
      recipientType: params.recipientType,
      recipientEmail: params.to,
      subject: params.subject,
      status: "failed",
      errorMessage: error.message,
    });

    return false;
  }

  await logNotification({
    booking: params.booking,
    eventType: params.eventType,
    recipientType: params.recipientType,
    recipientEmail: params.to,
    subject: params.subject,
    status: "sent",
    providerMessageId: data?.id || null,
  });

  return true;
}

function requestIsAuthorized(request: Request) {
  const secret = process.env.REMINDER_CRON_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  return authHeader === `Bearer ${secret}` || querySecret === secret;
}

export async function GET(request: Request) {
  if (!requestIsAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const maxStartTime = new Date(now.getTime() + 49 * 60 * 60 * 1000);

  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, business_id, owner_id, customer_id, service_id, start_time, end_time, status, source, customer_name, customer_phone, customer_email, notes, deposit_required, deposit_collection_method, deposit_status, deposit_amount, deposit_policy, manual_deposit_instructions, customer_reminder_sent_at, owner_reminder_sent_at, deposit_reminder_sent_at"
    )
    .in("status", ["confirmed", "approved"])
    .gte("start_time", now.toISOString())
    .lte("start_time", maxStartTime.toISOString())
    .order("start_time", { ascending: true })
    .limit(100);

  if (bookingError) {
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 }
    );
  }

  let checked = 0;
  let remindedCustomers = 0;
  let remindedOwners = 0;
  let skipped = 0;

  for (const rawBooking of bookings || []) {
    const booking = rawBooking as Booking;
    checked += 1;

    const { data: businessData } = await supabase
      .from("business_profiles")
      .select(
        "id, business_name, email, contact_email, slug, owner_id, reminder_emails_enabled, reminder_hours_before, deposit_reminder_enabled, owner_reminder_enabled, manual_payments_enabled, manual_payment_zelle, manual_payment_cash_app, manual_payment_venmo, manual_payment_paypal, manual_payment_other, manual_payment_qr_url, manual_payment_qr_caption"
      )
      .eq("id", booking.business_id)
      .maybeSingle();

    const business = businessData as BusinessProfile | null;

    if (!business || business.reminder_emails_enabled === false) {
      skipped += 1;
      continue;
    }

    const reminderHoursBefore = Math.max(
      1,
      Number(business.reminder_hours_before || 24)
    );

    const startDate = new Date(booking.start_time);
    const reminderDueAt = new Date(
      startDate.getTime() - reminderHoursBefore * 60 * 60 * 1000
    );

    if (Number.isNaN(startDate.getTime()) || reminderDueAt > now) {
      skipped += 1;
      continue;
    }

    const { data: serviceData } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("id", booking.service_id)
      .maybeSingle();

    const service = serviceData as Service | null;
    const businessName = business.business_name || "this business";
    const serviceName = service?.name || "Service";
    const customerName = booking.customer_name || "Customer";
    const startTime = formatDateTime(booking.start_time);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://schednest.com";
    const dashboardUrl = `${siteUrl}/dashboard/bookings`;

    const depositIsPending =
      booking.deposit_required &&
      booking.deposit_status !== "paid" &&
      booking.deposit_status !== "waived";

    if (!booking.customer_reminder_sent_at) {
      const email = customerReminderEmail({
        businessName,
        serviceName,
        startTime,
        booking,
        business,
      });

      const sent = await sendEmail({
        booking,
        eventType: "booking.reminder.customer",
        recipientType: "customer",
        to: booking.customer_email,
        subject: email.subject,
        html: email.html,
      });

      if (sent || !booking.customer_email) {
        await supabase
          .from("bookings")
          .update({
            customer_reminder_sent_at: new Date().toISOString(),
            deposit_reminder_sent_at:
              depositIsPending && business.deposit_reminder_enabled !== false
                ? new Date().toISOString()
                : booking.deposit_reminder_sent_at,
          })
          .eq("id", booking.id);
      }

      if (sent) remindedCustomers += 1;
    }

    if (
      business.owner_reminder_enabled !== false &&
      !booking.owner_reminder_sent_at
    ) {
      const email = ownerReminderEmail({
        customerName,
        serviceName,
        startTime,
        dashboardUrl,
        booking,
      });

      const sent = await sendEmail({
        booking,
        eventType: "booking.reminder.owner",
        recipientType: "owner",
        to: business.email || business.contact_email,
        subject: email.subject,
        html: email.html,
      });

      if (sent || (!business.email && !business.contact_email)) {
        await supabase
          .from("bookings")
          .update({
            owner_reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", booking.id);
      }

      if (sent) remindedOwners += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    checked,
    remindedCustomers,
    remindedOwners,
    skipped,
  });
}
