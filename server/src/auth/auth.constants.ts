export const AUTH_CONFIG = Symbol("AUTH_CONFIG");

export interface AuthConfig {
  tokenPepper: string;
  jwtPrivateKey: string;
  jwtKeyId: string;
  frontendBaseUrl: string;
}
