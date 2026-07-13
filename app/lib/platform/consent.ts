export type ConsentKey =
  | "analytics"
  | "personalization"
  | "birdy_learning"
  | "cross_product_context"
  | "sensitive_memory"
  | "usage_improvement"
  | "third_party_connectors";

export type ConsentStatus =
  | "granted"
  | "not_granted"
  | "withdrawn";

export const consentDefinitions = [
  {
    key: "analytics",
    title: "Analytics",
    description: "Allow SchedNest to measure product usage and performance.",
  },
  {
    key: "personalization",
    title: "Personalization",
    description: "Allow SchedNest to tailor suggestions and experiences.",
  },
  {
    key: "birdy_learning",
    title: "Birdy learning",
    description: "Allow Birdy to learn preferences and scheduling patterns.",
  },
  {
    key: "cross_product_context",
    title: "Cross-product context",
    description: "Allow Birdy to combine context across SchedNest products.",
  },
  {
    key: "sensitive_memory",
    title: "Sensitive memory",
    description: "Allow Birdy to store explicitly approved sensitive memories.",
  },
  {
    key: "usage_improvement",
    title: "Product improvement",
    description: "Allow de-identified usage data to improve SchedNest.",
  },
  {
    key: "third_party_connectors",
    title: "Third-party connectors",
    description: "Allow connected apps to import and sync approved data.",
  },
] as const;
