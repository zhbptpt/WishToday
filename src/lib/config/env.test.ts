import { describe, expect, it } from "vitest";

import { getPublicEnv } from "./env";

describe("getPublicEnv", () => {
  it("keeps cloud features disabled by default", () => {
    expect(getPublicEnv({})).toEqual({
      apiBaseUrl: "",
      cloudFeaturesEnabled: false,
    });
  });

  it("requires an API URL when cloud features are enabled", () => {
    expect(() =>
      getPublicEnv({ VITE_CLOUD_FEATURES_ENABLED: "true" }),
    ).toThrow("VITE_API_BASE_URL");
  });

  it("rejects non-boolean cloud feature values", () => {
    expect(() =>
      getPublicEnv({ VITE_CLOUD_FEATURES_ENABLED: "yes" }),
    ).toThrow("VITE_CLOUD_FEATURES_ENABLED");
  });

  it("normalizes a valid API URL", () => {
    expect(
      getPublicEnv({
        VITE_API_BASE_URL: "https://api.example.com/v1/",
        VITE_CLOUD_FEATURES_ENABLED: "true",
      }),
    ).toEqual({
      apiBaseUrl: "https://api.example.com/v1",
      cloudFeaturesEnabled: true,
    });
  });
});
