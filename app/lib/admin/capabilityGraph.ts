export type CapabilityStatus =
  | "active"
  | "internal"
  | "hidden"
  | "foundation"
  | "planned";

export type CapabilityNodeType =
  | "product"
  | "feature"
  | "platform"
  | "operation";

export type CapabilityNode = {
  id: string;
  name: string;
  description: string;
  type: CapabilityNodeType;
  status: CapabilityStatus;
  href?: string;
  routeFiles?: string[];
  apiRoutes?: string[];
  migrations?: string[];
  dependsOn?: string[];
  validation?: string[];
};

export const capabilityGraph: CapabilityNode[] = [
  {
    id: "product-business",
    name: "SchedNest Business",
    description: "Public scheduling and business operations product.",
    type: "product",
    status: "active",
    href: "/dashboard",
    dependsOn: [
      "platform-coordination",
      "platform-notifications",
      "platform-activity",
      "platform-settings",
      "platform-files",
      "platform-birdy",
    ],
    validation: ["production-build", "public-smoke", "dashboard-auth"],
  },
  {
    id: "business-bookings",
    name: "Bookings",
    description: "Create, manage, approve, and track business bookings.",
    type: "feature",
    status: "active",
    href: "/dashboard/bookings",
    routeFiles: [
      "app/dashboard/bookings/page.tsx",
      "app/book/[slug]/page.tsx",
    ],
    migrations: [
      "20260719000000_booking_domain_foundation.sql",
      "20260719000100_booking_integrity_v1.sql",
      "20260719000200_booking_creation_rpcs_v1.sql",
      "20260719000300_restrict_booking_rpc_permissions.sql",
      "20260719000400_enforce_business_hours.sql",
      "20260719000500_public_booking_availability.sql",
      "20260720000100_fast_booking_conflict_response.sql",
      "20260720000200_tune_booking_conflict_timeout.sql",
      "20260721234023_timezone_correct_booking_creation.sql",
      "20260722002819_booking_submission_idempotency.sql",
    ],
    dependsOn: ["platform-notifications", "platform-coordination"],
    validation: ["production-build", "public-smoke"],
  },
  {
    id: "business-requests",
    name: "Booking Requests",
    description: "Review and respond to incoming booking requests.",
    type: "feature",
    status: "active",
    href: "/dashboard/requests",
    routeFiles: ["app/dashboard/requests/page.tsx"],
    dependsOn: ["business-bookings", "platform-notifications"],
  },
  {
    id: "business-customers",
    name: "Customers",
    description: "Customer records and booking relationships.",
    type: "feature",
    status: "active",
    href: "/dashboard/customers",
    routeFiles: ["app/dashboard/customers/page.tsx"],
    dependsOn: ["business-bookings"],
  },
  {
    id: "business-services",
    name: "Services",
    description: "Service catalog, pricing, deposits, and availability.",
    type: "feature",
    status: "active",
    href: "/dashboard/services",
    routeFiles: ["app/dashboard/services/page.tsx"],
    dependsOn: ["business-bookings", "platform-files"],
  },
  {
    id: "business-booking-page",
    name: "Public Booking Page",
    description: "Customer-facing branded booking experience.",
    type: "feature",
    status: "active",
    href: "/dashboard/booking-page",
    routeFiles: [
      "app/dashboard/booking-page/page.tsx",
      "app/book/[slug]/page.tsx",
    ],
    dependsOn: ["business-services", "business-bookings"],
    validation: ["public-smoke"],
  },
  {
    id: "business-profile",
    name: "Business Profile",
    description: "Business identity and public profile configuration.",
    type: "feature",
    status: "active",
    href: "/dashboard/profile",
    routeFiles: ["app/dashboard/profile/page.tsx"],
  },
  {
    id: "business-settings",
    name: "Business Settings",
    description: "Business scheduling and account preferences.",
    type: "feature",
    status: "active",
    href: "/dashboard/settings",
    routeFiles: [
      "app/dashboard/settings/page.tsx",
      "app/dashboard/account/page.tsx",
    ],
    dependsOn: ["platform-settings"],
  },
  {
    id: "business-birdy",
    name: "Business Birdy",
    description: "AI-assisted business suggestions and decisions.",
    type: "feature",
    status: "active",
    href: "/dashboard/birdy",
    routeFiles: ["app/dashboard/birdy/page.tsx"],
    dependsOn: ["platform-birdy"],
  },
  {
    id: "business-revenue-impact",
    name: "Revenue Impact",
    description: "Founder view of customer revenue gained or missed.",
    type: "feature",
    status: "internal",
    href: "/dashboard/revenue-impact",
    routeFiles: ["app/dashboard/revenue-impact/page.tsx"],
    migrations: ["20260722150000_client_revenue_impact.sql"],
  },
  {
    id: "business-founder-time",
    name: "Founder Time",
    description: "Internal founder work and deferred compensation tracking.",
    type: "feature",
    status: "internal",
    href: "/dashboard/founder-time",
    routeFiles: ["app/dashboard/founder-time/page.tsx"],
    migrations: ["20260722150100_founder_time_entries.sql"],
  },
  {
    id: "product-student",
    name: "SchedNest Student",
    description: "Academic planning and scheduling foundation.",
    type: "product",
    status: "hidden",
    href: "/student/dashboard",
    routeFiles: [
      "app/student/dashboard/page.tsx",
      "app/student/dashboard/classes/page.tsx",
      "app/student/dashboard/assignments/page.tsx",
      "app/student/dashboard/exams/page.tsx",
      "app/student/dashboard/import/page.tsx",
    ],
    apiRoutes: ["app/api/student/imports/process/route.ts"],
    migrations: [
      "20260711000300_student_import_foundation.sql",
      "20260711000400_student_teams_data_foundation.sql",
    ],
    dependsOn: [
      "platform-coordination",
      "platform-notifications",
      "platform-files",
      "platform-birdy",
    ],
  },
  {
    id: "product-teams",
    name: "SchedNest Teams",
    description: "Team scheduling and collaboration foundation.",
    type: "product",
    status: "hidden",
    href: "/teams/dashboard",
    routeFiles: [
      "app/teams/dashboard/page.tsx",
      "app/teams/dashboard/members/page.tsx",
      "app/teams/dashboard/projects/page.tsx",
      "app/teams/dashboard/tasks/page.tsx",
      "app/teams/dashboard/requests/page.tsx",
      "app/teams/dashboard/schedule/page.tsx",
      "app/teams/dashboard/availability/page.tsx",
      "app/teams/dashboard/workload/page.tsx",
    ],
    migrations: [
      "20260711000000_fix_teams_rls_recursion.sql",
      "20260711000400_student_teams_data_foundation.sql",
      "20260712001400_teams_schedule_availability.sql",
      "20260712001500_teams_tasks_workload.sql",
      "20260721222757_reapply_teams_rls_after_foundation.sql",
    ],
    dependsOn: [
      "platform-coordination",
      "platform-notifications",
      "platform-activity",
      "platform-birdy",
    ],
  },
  {
    id: "product-med",
    name: "SchedNest Med",
    description: "Patient and caregiver coordination foundation.",
    type: "product",
    status: "hidden",
    href: "/med/dashboard",
    routeFiles: [
      "app/med/dashboard/page.tsx",
      "app/med/dashboard/appointments/page.tsx",
      "app/med/dashboard/medications/page.tsx",
      "app/med/dashboard/care-nests/page.tsx",
      "app/med/dashboard/tasks/page.tsx",
      "app/med/dashboard/questions/page.tsx",
      "app/med/dashboard/documents/page.tsx",
      "app/med/dashboard/caregivers/page.tsx",
      "app/med/dashboard/family/page.tsx",
      "app/med/dashboard/emergency-card/page.tsx",
      "app/med/dashboard/accessibility/page.tsx",
    ],
    migrations: [
      "20260711000100_med_document_storage.sql",
      "20260711000200_schednest_med_foundation.sql",
      "20260712000900_med_caregiver_first.sql",
      "20260712001000_med_emergency_accessibility.sql",
      "20260712001100_med_family_shared_dashboard.sql",
    ],
    dependsOn: [
      "platform-files",
      "platform-notifications",
      "platform-privacy",
      "platform-birdy",
    ],
  },
  {
    id: "product-life",
    name: "SchedNest Life",
    description: "Shared platform type reserved for a future product.",
    type: "product",
    status: "planned",
    dependsOn: [
      "platform-coordination",
      "platform-notifications",
      "platform-files",
      "platform-birdy",
    ],
  },
  {
    id: "platform-coordination",
    name: "Coordination Engine",
    description: "Cross-product coordination items and conflict handling.",
    type: "platform",
    status: "foundation",
    href: "/coordination",
    apiRoutes: [
      "app/api/platform/coordination/items/route.ts",
      "app/api/platform/coordination/conflicts/route.ts",
    ],
    migrations: [
      "20260712000000_coordination_engine_v1.sql",
      "20260721221401_harden_coordination_rpc_permissions.sql",
    ],
  },
  {
    id: "platform-birdy",
    name: "Birdy AI Platform",
    description: "Permissions, decisions, optimization, and memory.",
    type: "platform",
    status: "foundation",
    href: "/birdy/decisions",
    routeFiles: [
      "app/birdy/decisions/page.tsx",
      "app/birdy/permissions/page.tsx",
      "app/birdy/optimizer/page.tsx",
      "app/birdy/memory/page.tsx",
    ],
    apiRoutes: [
      "app/api/platform/birdy/decisions/route.ts",
      "app/api/platform/birdy/permissions/route.ts",
      "app/api/platform/birdy/optimizer/route.ts",
      "app/api/platform/birdy/memory/route.ts",
    ],
    migrations: [
      "20260712000100_birdy_permissions_v1.sql",
      "20260712000600_birdy_decision_center_v1.sql",
      "20260712000700_birdy_optimizer_v1.sql",
      "20260712000800_birdy_memory_v1.sql",
    ],
  },
  {
    id: "platform-notifications",
    name: "Notifications",
    description: "Cross-product notification delivery and activity alerts.",
    type: "platform",
    status: "foundation",
    href: "/notifications",
    apiRoutes: [
      "app/api/platform/notifications/route.ts",
      "app/api/booking-notifications/route.ts",
      "app/api/booking-reminders/route.ts",
    ],
    migrations: ["20260712001300_platform_notifications_v1.sql"],
  },
  {
    id: "platform-files",
    name: "Universal Files",
    description: "Shared file records and storage integrations.",
    type: "platform",
    status: "foundation",
    href: "/files",
    apiRoutes: ["app/api/platform/files/route.ts"],
    migrations: ["20260712000300_platform_universal_files_v1.sql"],
  },
  {
    id: "platform-settings",
    name: "Unified Settings",
    description: "Cross-product account and preference settings.",
    type: "platform",
    status: "foundation",
    href: "/settings",
    apiRoutes: ["app/api/platform/settings/route.ts"],
    migrations: ["20260712000200_platform_unified_settings_v1.sql"],
  },
  {
    id: "platform-privacy",
    name: "Privacy Controls",
    description: "Consent, data export, and privacy preferences.",
    type: "platform",
    status: "foundation",
    href: "/settings/privacy",
    apiRoutes: [
      "app/api/platform/privacy/consent/route.ts",
      "app/api/platform/privacy/export/route.ts",
    ],
    migrations: ["20260712000500_platform_privacy_controls_v1.sql"],
  },
  {
    id: "platform-activity",
    name: "Activity Feed",
    description: "Cross-product activity records.",
    type: "platform",
    status: "foundation",
    href: "/activity",
    apiRoutes: ["app/api/platform/activity/route.ts"],
    migrations: ["20260712001200_platform_activity_v1.sql"],
  },
  {
    id: "platform-connectors",
    name: "Connectors",
    description: "External provider connection registry.",
    type: "platform",
    status: "foundation",
    href: "/connectors",
    apiRoutes: ["app/api/platform/connectors/route.ts"],
    migrations: ["20260712000400_platform_connectors_v1.sql"],
  },
  {
    id: "operation-founder-os",
    name: "Founder OS",
    description: "Internal command center and operational oversight.",
    type: "operation",
    status: "internal",
    href: "/admin",
    routeFiles: [
      "app/admin/page.tsx",
      "app/admin/health/page.tsx",
      "app/admin/performance/page.tsx",
      "app/admin/support/page.tsx",
      "app/admin/subscriptions/page.tsx",
      "app/admin/incidents/page.tsx",
      "app/admin/audit/page.tsx",
      "app/admin/engineering/page.tsx",
    ],
    apiRoutes: [
      "app/api/admin/health/route.ts",
      "app/api/admin/performance/route.ts",
    ],
    migrations: [
      "20260713020000_founder_os_v1.sql",
      "20260713030000_founder_os_operations_v1_1.sql",
      "20260713100000_performance_center_core_v1.sql",
      "20260714100000_performance_load_thresholds_v1.sql",
    ],
    dependsOn: [
      "platform-activity",
      "platform-notifications",
      "platform-connectors",
    ],
    validation: [
      "production-build",
      "unit-health",
      "public-smoke",
      "dashboard-auth",
    ],
  },
];

export function capabilityCounts() {
  return capabilityGraph.reduce(
    (counts, node) => {
      counts.total += 1;
      counts[node.status] += 1;
      return counts;
    },
    {
      total: 0,
      active: 0,
      internal: 0,
      hidden: 0,
      foundation: 0,
      planned: 0,
    },
  );
}
