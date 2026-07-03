export type SchedNestAccountType = "business" | "student" | "team";

export const schedNestFeatureFlags = {
  businessPublicLaunch: true,
  studentPublicLaunch: false,
  teamsPublicLaunch: false,
  studentSignupEnabled: false,
  teamsSignupEnabled: false,
};

export const schedNestProducts = {
  business: {
    name: "SchedNest Business",
    accountType: "business" as SchedNestAccountType,
    tagline: "From first client to full company.",
    description:
      "For service providers managing bookings, customers, services, requests, and business growth.",
  },
  student: {
    name: "SchedNest Student",
    accountType: "student" as SchedNestAccountType,
    tagline: "Organize school before school organizes you.",
    description:
      "For college students managing classes, assignments, due dates, exams, study blocks, and academic schedules.",
  },
  team: {
    name: "SchedNest Teams",
    accountType: "team" as SchedNestAccountType,
    tagline: "Shared scheduling for growing teams.",
    description:
      "For companies with multiple workers, team calendars, shared schedules, roles, and business operations.",
  },
};

export const studentPricing = {
  founder: {
    name: "Student Founder Pricing",
    monthlyCents: 499,
    monthlyLabel: "$4.99/month",
    eligibleSpots: 10000,
    description:
      "Available to the first 10,000 eligible student accounts while their student subscription remains paid, active, and in good standing.",
  },
  standard: {
    name: "Student Standard Pricing",
    monthlyCents: 699,
    monthlyLabel: "$6.99/month",
    description:
      "Standard student pricing after the first 10,000 eligible student accounts.",
  },
};

export const teamPricing = {
  placeholder: true,
  message:
    "SchedNest Teams pricing is not public yet. Teams will be built after the business product proves traction.",
};