import { createHash } from "node:crypto";

export const SYNTHETIC_MARKER = "schednest-sprint7-synthetic";
export const SYNTHETIC_PASSWORD = "SchedNest-Test-Only-2026!";

export type SyntheticActorName =
  | "business-owner-a"
  | "business-owner-b"
  | "public-customer-a"
  | "public-customer-b"
  | "platform-admin"
  | "medical-user"
  | "caregiver"
  | "student"
  | "team-admin"
  | "team-member";

export type SyntheticIdentity = {
  actor: SyntheticActorName;
  email: string;
  password: string;
  marker: string;
  deterministicKey: string;
};

function deterministicKey(actor: SyntheticActorName): string {
  return createHash("sha256")
    .update(`${SYNTHETIC_MARKER}:${actor}`)
    .digest("hex")
    .slice(0, 20);
}

export function createSyntheticIdentity(
  actor: SyntheticActorName,
  emailDomain: string,
): SyntheticIdentity {
  const key = deterministicKey(actor);

  return {
    actor,
    email: `${SYNTHETIC_MARKER}+${actor}+${key}@${emailDomain}`,
    password: SYNTHETIC_PASSWORD,
    marker: SYNTHETIC_MARKER,
    deterministicKey: key,
  };
}

export function createSyntheticIdentitySet(
  emailDomain: string,
): Record<SyntheticActorName, SyntheticIdentity> {
  const actors: SyntheticActorName[] = [
    "business-owner-a",
    "business-owner-b",
    "public-customer-a",
    "public-customer-b",
    "platform-admin",
    "medical-user",
    "caregiver",
    "student",
    "team-admin",
    "team-member",
  ];

  return Object.fromEntries(
    actors.map((actor) => [
      actor,
      createSyntheticIdentity(actor, emailDomain),
    ]),
  ) as Record<SyntheticActorName, SyntheticIdentity>;
}
