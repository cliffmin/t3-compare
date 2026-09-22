import { expect, it } from "vite-plus/test";
import {
  assertLocalSigningIdentityAvailable,
  normalizeLocalSigningIdentity,
} from "./local-macos-signing.ts";

const fingerprint = "0123456789ABCDEF0123456789ABCDEF01234567";

it("accepts only a full certificate fingerprint", () => {
  expect(normalizeLocalSigningIdentity(` ${fingerprint.toLowerCase()} `)).toBe(fingerprint);
  for (const invalid of [
    "",
    "-",
    "T3 Compare Local Development",
    fingerprint.slice(1),
    "Z".repeat(40),
  ]) {
    expect(() => normalizeLocalSigningIdentity(invalid)).toThrow("exact 40-character");
  }
});

it("requires the requested certificate in valid code-signing identity output", () => {
  expect(() =>
    assertLocalSigningIdentityAvailable(
      fingerprint,
      `  1) ${fingerprint} "T3 Compare Local Development"\n     1 valid identities found`,
    ),
  ).not.toThrow();
  for (const output of [
    "0 valid identities found",
    `1) ${"A".repeat(40)} "T3 Compare Local Development"`,
    `error: ${fingerprint}`,
    `1) ${fingerprint} "T3 Compare Local Development" (CSSMERR_TP_NOT_TRUSTED)`,
  ]) {
    expect(() => assertLocalSigningIdentityAvailable(fingerprint, output)).toThrow(
      "unavailable or invalid",
    );
  }
});
