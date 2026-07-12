export type SchedNestProductKey =
  | "business"
  | "student"
  | "teams"
  | "med";

export type SchedNestProduct = {
  key: SchedNestProductKey;
  name: string;
  description: string;
  href: string;
  publicLaunch: boolean;
  accent: "emerald" | "sky" | "violet" | "rose";
};

export const schedNestProducts: SchedNestProduct[] = [
  {
    key: "business",
    name: "SchedNest Business",
    description:
      "Scheduling, services, staff, bookings, payments, and business operations.",
    href: "/dashboard",
    publicLaunch: true,
    accent: "emerald",
  },
  {
    key: "student",
    name: "SchedNest Student",
    description:
      "Classes, assignments, exams, study sessions, projects, and academic planning.",
    href: "/student/dashboard",
    publicLaunch: false,
    accent: "sky",
  },
  {
    key: "teams",
    name: "SchedNest Teams",
    description:
      "Shared schedules, members, requests, projects, workload, and collaboration.",
    href: "/teams/dashboard",
    publicLaunch: false,
    accent: "violet",
  },
  {
    key: "med",
    name: "SchedNest Med",
    description:
      "Patient-side appointments, medications, care tasks, documents, and family coordination.",
    href: "/med/dashboard",
    publicLaunch: false,
    accent: "rose",
  },
];

export function getSchedNestProduct(key: SchedNestProductKey) {
  return schedNestProducts.find((product) => product.key === key);
}
