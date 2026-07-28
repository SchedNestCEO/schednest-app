import { createSyntheticSupabaseClients } from "./supabase";
import type {
  SyntheticTenantManifest,
} from "./manifest";

type SeedSyntheticPendingBookingOptions = {
  tenant: SyntheticTenantManifest;
  note: string;
  daysAhead?: number;
};

export async function seedSyntheticPendingBooking({
  tenant,
  note,
  daysAhead = 35,
}: SeedSyntheticPendingBookingOptions): Promise<string> {
  const { admin } = createSyntheticSupabaseClients();

  const start = new Date();
  start.setDate(start.getDate() + daysAhead);
  start.setHours(13, 17, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const { data, error } = await admin
    .from("bookings")
    .insert({
      business_id: tenant.businessId,
      owner_id: tenant.userId,
      customer_id: tenant.customerId,
      service_id: tenant.serviceId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "pending",
      source: "booking_page",
      notes: note,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      `Unable to seed synthetic pending booking: ${
        error?.message ?? "missing booking id"
      }`,
    );
  }

  return data.id as string;
}
