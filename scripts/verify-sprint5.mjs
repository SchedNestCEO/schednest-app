import { access, readFile } from "node:fs/promises";
import process from "node:process";

const requiredFiles = [
  "docs/engineering/SPRINT_5.md",
  "supabase/migrations/20260719000100_booking_integrity_v1.sql",
  "supabase/migrations/20260719000200_booking_creation_rpcs_v1.sql",
  "supabase/migrations/20260719000300_restrict_booking_rpc_permissions.sql",
  "supabase/migrations/20260719000400_enforce_business_hours.sql",
  "supabase/migrations/20260719000500_public_booking_availability.sql",
  "app/book/[slug]/page.tsx",
  "app/dashboard/bookings/page.tsx",
  "app/dashboard/requests/page.tsx",
];

const missingFiles = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  for (const file of missingFiles) {
    console.error(`Missing ${file}`);
  }

  process.exit(1);
}

const integrityMigration = await readFile(
  "supabase/migrations/20260719000100_booking_integrity_v1.sql",
  "utf8"
);

const creationMigration = await readFile(
  "supabase/migrations/20260719000200_booking_creation_rpcs_v1.sql",
  "utf8"
);

const permissionsMigration = await readFile(
  "supabase/migrations/20260719000300_restrict_booking_rpc_permissions.sql",
  "utf8"
);

const businessHoursMigration = await readFile(
  "supabase/migrations/20260719000400_enforce_business_hours.sql",
  "utf8"
);

const availabilityMigration = await readFile(
  "supabase/migrations/20260719000500_public_booking_availability.sql",
  "utf8"
);

const publicBookingPage = await readFile(
  "app/book/[slug]/page.tsx",
  "utf8"
);

const dashboardBookings = await readFile(
  "app/dashboard/bookings/page.tsx",
  "utf8"
);

const dashboardRequests = await readFile(
  "app/dashboard/requests/page.tsx",
  "utf8"
);

const checks = [
  [
    integrityMigration,
    "bookings_no_active_overlap",
    "Missing active-booking overlap constraint.",
  ],
  [
    integrityMigration,
    "bookings_time_order_check",
    "Missing booking time-order constraint.",
  ],
  [
    integrityMigration,
    "booking_status_blocks_time",
    "Missing reusable blocking-status logic.",
  ],
  [
    integrityMigration,
    "assert_booking_slot_available",
    "Missing reusable slot-availability function.",
  ],
  [
    creationMigration,
    "create_manual_booking",
    "Missing protected manual-booking RPC.",
  ],
  [
    creationMigration,
    "create_public_booking_with_intake",
    "Missing protected public-booking RPC.",
  ],
  [
    creationMigration,
    "approve_booking_request",
    "Missing protected approval RPC.",
  ],
  [
    permissionsMigration,
    "from anon",
    "Missing anonymous-role permission restriction.",
  ],
  [
    businessHoursMigration,
    "assert_booking_within_business_hours",
    "Missing business-hours validation function.",
  ],
  [
    businessHoursMigration,
    "enforce_booking_business_hours_trigger",
    "Missing business-hours enforcement trigger.",
  ],
  [
    availabilityMigration,
    "get_public_booking_occupied_ranges",
    "Missing public occupied-range RPC.",
  ],
  [
    publicBookingPage,
    "get_public_booking_occupied_ranges",
    "Public booking page does not load occupied ranges.",
  ],
  [
    publicBookingPage,
    "That time is no longer available",
    "Public booking conflict message is missing.",
  ],
  [
    dashboardBookings,
    'supabase.rpc("create_manual_booking"',
    "Dashboard booking creation bypasses the protected RPC.",
  ],
  [
    dashboardRequests,
    'supabase.rpc("approve_booking_request"',
    "Booking approval bypasses the protected RPC.",
  ],
];

for (const [content, marker, message] of checks) {
  if (!content.includes(marker)) {
    console.error(message);
    process.exit(1);
  }
}

if (
  dashboardBookings.includes('.from("bookings").insert') ||
  dashboardBookings.includes(".from('bookings').insert")
) {
  console.error("Direct dashboard booking inserts are still present.");
  process.exit(1);
}

console.log("Engineering Phase 1 Sprint 5 verification passed.");
