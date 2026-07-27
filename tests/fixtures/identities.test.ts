import { describe, expect, it } from "vitest";
import {
  createSyntheticIdentity,
  createSyntheticIdentitySet,
  SYNTHETIC_MARKER,
} from "./identities";

describe("synthetic identities", () => {
  it("creates deterministic identities", () => {
    const first = createSyntheticIdentity(
      "business-owner-a",
      "example.test",
    );
    const second = createSyntheticIdentity(
      "business-owner-a",
      "example.test",
    );

    expect(first).toEqual(second);
    expect(first.email).toContain(SYNTHETIC_MARKER);
  });

  it("creates unique identities for every actor", () => {
    const identities = Object.values(
      createSyntheticIdentitySet("example.test"),
    );

    expect(new Set(identities.map(({ email }) => email)).size).toBe(
      identities.length,
    );
  });
});
