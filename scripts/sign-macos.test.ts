import { sign as signApplication, type SignOptions } from "@electron/osx-sign";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import sign from "./sign-macos.ts";
import { verifyLocalSigningIdentity } from "./lib/local-macos-signing.ts";

vi.mock("@electron/osx-sign", () => ({ sign: vi.fn() }));
vi.mock("./lib/local-macos-signing.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/local-macos-signing.ts")>()),
  verifyLocalSigningIdentity: vi.fn(),
}));

const fingerprint = "0123456789ABCDEF0123456789ABCDEF01234567";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("T3CODE_DESKTOP_LOCAL_SIGNING_IDENTITY", undefined);
});
afterEach(() => vi.unstubAllEnvs());

it("batches codesign calls without changing existing signing options", async () => {
  const options = {
    app: "/tmp/T3 Code.app",
    identity: "Developer ID Application: T3 Tools, Inc.",
    keychain: "/tmp/t3code.keychain",
    provisioningProfile: "/tmp/t3code.provisionprofile",
    optionsForFile: () => ({
      entitlements: "/tmp/t3code.entitlements.plist",
      hardenedRuntime: true,
    }),
  } satisfies SignOptions;

  await sign(options);

  expect(signApplication).toHaveBeenCalledExactlyOnceWith({
    ...options,
    batchCodesignCalls: true,
  });
});

it("signs with the exact local identity after rechecking its availability", async () => {
  vi.stubEnv("T3CODE_DESKTOP_LOCAL_SIGNING_IDENTITY", fingerprint);
  const options = { app: "/tmp/T3 Compare.app", identity: fingerprint, identityValidation: false };
  await sign(options);
  expect(verifyLocalSigningIdentity).toHaveBeenCalledExactlyOnceWith(fingerprint);
  expect(signApplication).toHaveBeenCalledExactlyOnceWith({ ...options, batchCodesignCalls: true });
});

it("never signs when the builder selects an absent, ad-hoc, named or different identity", async () => {
  vi.stubEnv("T3CODE_DESKTOP_LOCAL_SIGNING_IDENTITY", fingerprint);
  for (const identity of [undefined, "-", "T3 Compare Local Development", "A".repeat(40)]) {
    await expect(
      sign({ app: "/tmp/T3 Compare.app", ...(identity === undefined ? {} : { identity }) }),
    ).rejects.toThrow("did not select");
  }
  expect(signApplication).not.toHaveBeenCalled();
});

it("never signs if the identity disappears after build preflight", async () => {
  vi.stubEnv("T3CODE_DESKTOP_LOCAL_SIGNING_IDENTITY", fingerprint);
  vi.mocked(verifyLocalSigningIdentity).mockRejectedValue(new Error("identity unavailable"));
  await expect(sign({ app: "/tmp/T3 Compare.app", identity: fingerprint })).rejects.toThrow(
    "identity unavailable",
  );
  expect(signApplication).not.toHaveBeenCalled();
});
