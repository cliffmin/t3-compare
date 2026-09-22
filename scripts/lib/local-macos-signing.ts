// @effect-diagnostics nodeBuiltinImport:off - Shared with electron-builder's Promise-based signing hook, outside an Effect runtime.
import * as NodeChildProcess from "node:child_process";
import * as NodeUtil from "node:util";

const execFileAsync = NodeUtil.promisify(NodeChildProcess.execFile);

export function normalizeLocalSigningIdentity(identity: string): string {
  const fingerprint = identity.trim().toUpperCase();
  if (!/^[A-F0-9]{40}$/.test(fingerprint)) {
    throw new Error(
      "Local signing requires the exact 40-character SHA-1 certificate fingerprint, not a name or ad-hoc identity.",
    );
  }
  return fingerprint;
}

/** Read only: a valid identity includes a certificate and its matching private key. */
export async function verifyLocalSigningIdentity(identity: string): Promise<void> {
  const fingerprint = normalizeLocalSigningIdentity(identity);
  const { stdout } = await execFileAsync("/usr/bin/security", [
    "find-identity",
    "-v",
    "-p",
    "codesigning",
  ]);
  assertLocalSigningIdentityAvailable(fingerprint, stdout);
}

export function assertLocalSigningIdentityAvailable(identity: string, stdout: string): void {
  const fingerprint = normalizeLocalSigningIdentity(identity);
  const identities = [...stdout.matchAll(/^\s*\d+\) ([A-Fa-f0-9]{40}) "[^"\r\n]*"[ \t]*$/gm)];
  if (!identities.some((match) => match[1]?.toUpperCase() === fingerprint)) {
    throw new Error(
      `Local signing identity ${fingerprint} is unavailable or invalid for code signing. Check the certificate, matching private key, expiry, and Code Signing policy in Keychain Access. No fallback signing was attempted.`,
    );
  }
}
