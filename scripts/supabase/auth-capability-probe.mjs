import { pathToFileURL } from "node:url";

export const CAPABILITY_NAMES = Object.freeze([
  "recoveryContinuation",
  "customAccessTokenClaims",
  "immediateRlsAccessTokenRejection",
  "globalRefreshTokenRevocation",
  "passwordUpdateTerminalState",
]);

const PASSING_STATUS = "contractual-and-observed";

export const CURRENT_EVIDENCE = Object.freeze({
  recoveryContinuation: "unknown",
  customAccessTokenClaims: "unknown",
  immediateRlsAccessTokenRejection: "unknown",
  globalRefreshTokenRevocation: "unknown",
  passwordUpdateTerminalState: "unsupported",
});

export function evaluateCapabilityGate(evidence = {}) {
  const blockingCapabilities = CAPABILITY_NAMES.filter(
    (name) => evidence[name] !== PASSING_STATUS,
  );

  return {
    decision: blockingCapabilities.length === 0 ? "GO" : "NO-GO",
    blockingCapabilities,
  };
}

export function buildProbeReport(evidence = CURRENT_EVIDENCE) {
  const gate = evaluateCapabilityGate(evidence);

  return {
    probe: "supabase-auth-capability-gate",
    decision: gate.decision,
    capabilities: CAPABILITY_NAMES.map((name) => ({
      name,
      status: evidence[name] ?? "unknown",
    })),
    blockingCapabilities: gate.blockingCapabilities,
  };
}

function isDirectExecution() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectExecution()) {
  const result = buildProbeReport();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.decision === "GO" ? 0 : 1;
}
