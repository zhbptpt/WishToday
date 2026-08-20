export const AUTH_CONFIG = Symbol("AUTH_CONFIG");

export interface AuthConfig {
  tokenPepper: string;
  jwtPrivateKey: string;
  jwtPublicKey: string;
  jwtKeyId: string;
  frontendBaseUrl: string;
  allowedOrigins: string[];
}
