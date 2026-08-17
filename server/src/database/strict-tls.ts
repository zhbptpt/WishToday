type TlsStreamState = {
  encrypted?: boolean;
  authorized?: boolean;
};

export function assertStrictTlsStream(stream: unknown): void {
  const tls = stream as TlsStreamState | undefined;
  if (tls?.encrypted !== true || tls.authorized !== true) {
    throw new Error("PostgreSQL client connection is not using authorized TLS");
  }
}
