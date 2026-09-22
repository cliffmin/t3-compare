import { EnvironmentId } from "@t3tools/contracts";
import { Atom, AtomRegistry } from "effect/unstable/reactivity";
import { describe, expect, it, vi } from "vite-plus/test";

const inputs = vi.hoisted(() => ({
  source: "live" as "live" | "cache",
  phase: "connected",
  failed: false,
}));
vi.mock("./server", async () => {
  const { Atom, AsyncResult } = await import("effect/unstable/reactivity");
  const { DEFAULT_SERVER_SETTINGS } = await import("@t3tools/contracts");
  return {
    serverEnvironment: {
      configProjection: () =>
        Atom.make(
          inputs.failed
            ? AsyncResult.initial()
            : AsyncResult.success(
                {
                  source: inputs.source,
                  config: { providers: [], settings: DEFAULT_SERVER_SETTINGS },
                },
                { waiting: true },
              ),
        ),
    },
  };
});
vi.mock("./presentation", () => ({
  environmentPresentations: {
    presentationAtom: () => Atom.make({ connection: { phase: inputs.phase } }),
  },
}));
import { comparisonCatalogAtom } from "./comparisonCatalog";

describe("comparison live catalog stream", () => {
  it.each([
    { source: "live", phase: "connected", failed: false, expected: true },
    { source: "cache", phase: "connected", failed: false, expected: false },
    { source: "live", phase: "reconnecting", failed: false, expected: false },
    { source: "live", phase: "offline", failed: false, expected: false },
    { source: "live", phase: "connected", failed: true, expected: false },
  ] as const)(
    "uses $source/$phase readiness while a stream awaits its next event",
    ({ expected, ...state }) => {
      Object.assign(inputs, state);
      const registry = AtomRegistry.make();
      const catalog = registry.get(
        comparisonCatalogAtom(EnvironmentId.make(JSON.stringify(state))),
      );
      expect(catalog.authoritative).toBe(expected);
      registry.dispose();
    },
  );
});
