import { describe, expect, it } from "vitest";
import { assertSyntheticManifestIsComplete } from "./cleanup";
import {
  createEmptySyntheticManifest,
  type SyntheticTestManifest,
} from "./manifest";
import { SYNTHETIC_MARKER } from "./identities";

function completeManifest(): SyntheticTestManifest {
  return {
    ...createEmptySyntheticManifest(SYNTHETIC_MARKER),
    tenants: [
      {
        actor: "business-owner-a",
        userId: "user-a",
        email: "owner-a@example.test",
        businessId: "business-a",
        bookingSlug: "synthetic-a",
        serviceId: "service-a",
        customerId: "customer-a",
      },
      {
        actor: "business-owner-b",
        userId: "user-b",
        email: "owner-b@example.test",
        businessId: "business-b",
        bookingSlug: "synthetic-b",
        serviceId: "service-b",
        customerId: "customer-b",
      },
    ],
  };
}

describe("synthetic fixture manifest", () => {
  it("accepts two isolated synthetic tenants", () => {
    expect(() =>
      assertSyntheticManifestIsComplete(completeManifest()),
    ).not.toThrow();
  });

  it("rejects duplicate tenant ownership", () => {
    const manifest = completeManifest();
    manifest.tenants[1].userId = manifest.tenants[0].userId;

    expect(() =>
      assertSyntheticManifestIsComplete(manifest),
    ).toThrow(/users are not unique/);
  });

  it("rejects a non-synthetic marker", () => {
    const manifest = completeManifest();
    manifest.marker = "unexpected-marker";

    expect(() =>
      assertSyntheticManifestIsComplete(manifest),
    ).toThrow(/marker is invalid/);
  });
});
