import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "../../lib/supabase/admin";

type NotificationEvent =
| "booking.requested"
| "booking.approved"
| "booking.declined";

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
};

type BusinessProfile = {
id: string;
business_name: string | null;
email: string | null;
slug: string | null;
owner_id: string;
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
startTime: string
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
dashboardUrl: string
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
startTime: string
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
`),
};
}

function customerDeclinedEmail(
businessName: string,
serviceName: string,
startTime: string,
bookingPageUrl: string
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

async function logNotification(params: {
booking: Booking;
eventType: NotificationEvent;
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
eventType: NotificationEvent;
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

return;
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

throw new Error("Missing RESEND_API_KEY.");
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

return;
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
{ status: 400 }
);
}

if (
!["booking.requested", "booking.approved", "booking.declined"].includes(
eventType
)
) {
return NextResponse.json({ error: "Invalid eventType." }, { status: 400 });
}

const supabase = createAdminClient();

const { data: booking, error: bookingError } = await supabase
.from("bookings")
.select(
"id, business_id, owner_id, customer_id, service_id, start_time, end_time, status, source, customer_name, customer_phone, customer_email, notes"
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
{ status: 500 }
);
}

if (!booking) {
return NextResponse.json({ error: "Booking not found." }, { status: 404 });
}

const typedBooking = booking as Booking;

if (eventType === "booking.requested") {
if (typedBooking.source !== "booking_page") {
return NextResponse.json(
{ error: "Only public booking page requests can trigger this event." },
{ status: 403 }
);
}
}

if (eventType === "booking.approved" || eventType === "booking.declined") {
const userId = await getAuthenticatedUserId(request);

if (!userId || typedBooking.owner_id !== userId) {
return NextResponse.json(
{ error: "Not authorized to send this notification." },
{ status: 403 }
);
}
}

const { data: business, error: businessError } = await supabase
.from("business_profiles")
.select("id, business_name, email, slug, owner_id")
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
{ status: 500 }
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
{ status: 500 }
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

if (eventType === "booking.requested") {
const customerEmail = customerPendingEmail(
businessName,
serviceName,
startTime
);

const ownerEmail = ownerNewRequestEmail(
customerName,
serviceName,
startTime,
dashboardUrl
);

await sendEmail({
booking: typedBooking,
eventType,
recipientType: "customer",
to: typedBooking.customer_email,
subject: customerEmail.subject,
html: customerEmail.html,
});

await sendEmail({
booking: typedBooking,
eventType,
recipientType: "owner",
to: typedBusiness?.email,
subject: ownerEmail.subject,
html: ownerEmail.html,
});
}

if (eventType === "booking.approved") {
const email = customerApprovedEmail(businessName, serviceName, startTime);

await sendEmail({
booking: typedBooking,
eventType,
recipientType: "customer",
to: typedBooking.customer_email,
subject: email.subject,
html: email.html,
});
}

if (eventType === "booking.declined") {
const email = customerDeclinedEmail(
businessName,
serviceName,
startTime,
bookingPageUrl
);

await sendEmail({
booking: typedBooking,
eventType,
recipientType: "customer",
to: typedBooking.customer_email,
subject: email.subject,
html: email.html,
});
}

return NextResponse.json({ ok: true });
} catch (error) {
const message =
error instanceof Error ? error.message : "Unable to send notification.";

return NextResponse.json({ error: message }, { status: 500 });
}
}