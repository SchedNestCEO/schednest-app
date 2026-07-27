import {
  SYNTHETIC_MARKER,
  type SyntheticIdentity,
} from "./identities";

export type SyntheticCustomerDefinition = {
  identity: SyntheticIdentity;
  full_name: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  source: "synthetic_test";
  status: "active";
  preferred_language: "en";
};

export function createSyntheticCustomerDefinition(
  identity: SyntheticIdentity,
  label: "a" | "b",
): SyntheticCustomerDefinition {
  return {
    identity,
    full_name: `Synthetic Customer ${label.toUpperCase()}`,
    name: `Synthetic Customer ${label.toUpperCase()}`,
    email: identity.email,
    phone: label === "a" ? "+15555550101" : "+15555550102",
    notes: SYNTHETIC_MARKER,
    source: "synthetic_test",
    status: "active",
    preferred_language: "en",
  };
}
