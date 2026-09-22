import { sign as signApplication, type SignOptions } from "@electron/osx-sign";
import {
  normalizeLocalSigningIdentity,
  verifyLocalSigningIdentity,
} from "./lib/local-macos-signing.ts";

/** Sign files with matching options together instead of spawning codesign for each file. */
export default async function sign(options: SignOptions): Promise<void> {
  const configuredIdentity = process.env.T3CODE_DESKTOP_LOCAL_SIGNING_IDENTITY;
  if (configuredIdentity !== undefined) {
    const identity = normalizeLocalSigningIdentity(configuredIdentity);
    // A custom hook can otherwise bypass electron-builder's missing-identity failure.
    if (options.identity?.toUpperCase() !== identity) {
      throw new Error(
        "Local signing refused: electron-builder did not select the requested certificate fingerprint.",
      );
    }
    await verifyLocalSigningIdentity(identity);
  }
  await signApplication({ ...options, batchCodesignCalls: true });
}
