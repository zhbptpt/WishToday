export interface PublicEnv {
  apiBaseUrl: string;
  cloudFeaturesEnabled: boolean;
}

type PublicEnvSource = Partial<
  Record<"VITE_API_BASE_URL" | "VITE_CLOUD_FEATURES_ENABLED", string>
>;

function parseCloudFeaturesEnabled(value: string | undefined): boolean {
  if (value === undefined || value === "" || value === "false") {
    return false;
  }
  if (value === "true") {
    return true;
  }
  throw new Error("VITE_CLOUD_FEATURES_ENABLED must be true or false");
}

function parseApiBaseUrl(value: string | undefined): string {
  const candidate = value?.trim() ?? "";
  if (!candidate) {
    return "";
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("VITE_API_BASE_URL must be a valid HTTP(S) URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_API_BASE_URL must be a valid HTTP(S) URL");
  }

  return url.toString().replace(/\/$/, "");
}

export function getPublicEnv(
  source: PublicEnvSource = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_CLOUD_FEATURES_ENABLED:
      import.meta.env.VITE_CLOUD_FEATURES_ENABLED,
  },
): PublicEnv {
  const cloudFeaturesEnabled = parseCloudFeaturesEnabled(
    source.VITE_CLOUD_FEATURES_ENABLED,
  );
  const apiBaseUrl = parseApiBaseUrl(source.VITE_API_BASE_URL);

  if (cloudFeaturesEnabled && !apiBaseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is required when cloud features are enabled",
    );
  }

  return { apiBaseUrl, cloudFeaturesEnabled };
}
