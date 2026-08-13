import {
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from "node:crypto";

export type NodeEnvironment = "development" | "test" | "production";

export interface ServerEnv {
  nodeEnv: NodeEnvironment;
  databaseUrl: string;
  databaseSslMode: "require";
  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtKeyId: string;
  tokenPepper: string;
  allowedOrigins: string[];
  port: number;
  resendApiKey?: string;
}

type EnvSource = Record<string, string | undefined>;

function requireValue(source: EnvSource, name: string): string {
  const value = source[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function decodePem(
  source: EnvSource,
  name: "JWT_PRIVATE_KEY_BASE64" | "JWT_PUBLIC_KEY_BASE64",
): { pem: string; key: KeyObject } {
  const encoded = requireValue(source, name);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new Error(`${name} must contain valid Base64 PEM data`);
  }

  const pem = Buffer.from(encoded, "base64").toString("utf8");
  try {
    const key =
      name === "JWT_PRIVATE_KEY_BASE64"
        ? createPrivateKey(pem)
        : createPublicKey(pem);
    if (key.asymmetricKeyType !== "rsa") {
      throw new Error("not RSA");
    }
    return { pem, key };
  } catch {
    throw new Error(`${name} must contain a valid RSA PEM key`);
  }
}

function validateRsaKeyPair(privateKey: KeyObject, publicKey: KeyObject): void {
  const privateBits = privateKey.asymmetricKeyDetails?.modulusLength ?? 0;
  const publicBits = publicKey.asymmetricKeyDetails?.modulusLength ?? 0;
  if (privateBits < 2048 || publicBits < 2048) {
    throw new Error("JWT RSA keys must be at least 2048 bits");
  }

  const derivedPublicKey = createPublicKey(privateKey).export({
    format: "der",
    type: "spki",
  });
  const suppliedPublicKey = publicKey.export({ format: "der", type: "spki" });
  if (!derivedPublicKey.equals(suppliedPublicKey)) {
    throw new Error("JWT keys must be a matching RSA key pair");
  }
}

function parseOrigins(value: string, nodeEnv: NodeEnvironment): string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length || origins.includes("*")) {
    throw new Error("ALLOWED_ORIGINS must be an exact, non-wildcard allowlist");
  }

  return origins.map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
    }

    if (url.origin !== origin || (url.protocol !== "http:" && url.protocol !== "https:")) {
      throw new Error(`ALLOWED_ORIGINS must contain exact HTTP(S) origins: ${origin}`);
    }
    if (nodeEnv === "production" && url.protocol !== "https:") {
      throw new Error("ALLOWED_ORIGINS must use HTTPS in production");
    }
    return url.origin;
  });
}

export function getServerEnv(source: EnvSource = process.env): ServerEnv {
  const rawNodeEnv = source.NODE_ENV?.trim() || "development";
  if (!["development", "test", "production"].includes(rawNodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const nodeEnv = rawNodeEnv as NodeEnvironment;

  const databaseUrl = requireValue(source, "DATABASE_URL");
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("wrong protocol");
    }
    const forbiddenTlsParameters = [
      "sslmode",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "sslcrl",
    ];
    if (forbiddenTlsParameters.some((name) => url.searchParams.has(name))) {
      throw new Error("TLS parameters must not be overridden");
    }
  } catch {
    throw new Error(
      "DATABASE_URL must be a valid PostgreSQL URL without TLS override parameters",
    );
  }

  const databaseSslMode = requireValue(source, "DATABASE_SSL_MODE");
  if (databaseSslMode !== "require") {
    throw new Error("DATABASE_SSL_MODE must be require");
  }

  const portValue = source.PORT?.trim() || "3000";
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  const jwtPrivate = decodePem(source, "JWT_PRIVATE_KEY_BASE64");
  const jwtPublic = decodePem(source, "JWT_PUBLIC_KEY_BASE64");
  validateRsaKeyPair(jwtPrivate.key, jwtPublic.key);

  const tokenPepper = requireValue(source, "TOKEN_PEPPER");
  if (Buffer.byteLength(tokenPepper, "utf8") < 32) {
    throw new Error("TOKEN_PEPPER must contain at least 32 UTF-8 bytes");
  }

  return {
    nodeEnv,
    databaseUrl,
    databaseSslMode: "require",
    jwtPrivateKey: jwtPrivate.pem,
    jwtPublicKey: jwtPublic.pem,
    jwtKeyId: requireValue(source, "JWT_KEY_ID"),
    tokenPepper,
    allowedOrigins: parseOrigins(
      requireValue(source, "ALLOWED_ORIGINS"),
      nodeEnv,
    ),
    port,
    resendApiKey: source.RESEND_API_KEY?.trim() || undefined,
  };
}
