import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { EnvironmentId, type OrchestrationShellSnapshot } from "@t3tools/contracts";
const harness = vi.hoisted(() => ({
  current: null as unknown,
  notify: null as ((snapshot: unknown) => void) | null,
  unsubscribe: vi.fn(),
}));
vi.mock("./state/shell", () => ({ environmentSnapshotAtom: () => "fixture-atom" }));
vi.mock("./rpc/atomRegistry", () => ({
  appAtomRegistry: {
    get: () => harness.current,
    subscribe: (_atom: unknown, notify: (snapshot: unknown) => void) => {
      harness.notify = notify;
      return harness.unsubscribe;
    },
  },
}));
import { waitForComparisonReceipt } from "./comparisonActionReceipt";
const snapshot = (sequence: number): OrchestrationShellSnapshot => ({
  snapshotSequence: sequence,
  updatedAt: "2026-09-23T00:00:00.000Z",
  projects: [],
  threads: [],
});
afterEach(() => {
  harness.current = null;
  harness.notify = null;
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe("comparison receipt barrier", () => {
  it("waits for the authoritative receipt instead of capturing optimistic state", async () => {
    harness.current = snapshot(2);
    let done = false;
    const pending = waitForComparisonReceipt(EnvironmentId.make("fixture"), 4).then((value) => {
      done = true;
      return value;
    });
    harness.notify?.(snapshot(3));
    await Promise.resolve();
    expect(done).toBe(false);
    harness.notify?.(snapshot(4));
    expect((await pending).snapshotSequence).toBe(4);
    expect(harness.unsubscribe).toHaveBeenCalled();
  });
  it("accepts an already received receipt", async () => {
    harness.current = snapshot(7);
    expect(
      (await waitForComparisonReceipt(EnvironmentId.make("fixture"), 4)).snapshotSequence,
    ).toBe(7);
  });
  it("reports a lost stream without treating its optimistic state as confirmation", async () => {
    vi.useFakeTimers();
    harness.current = snapshot(1);
    const pending = expect(
      waitForComparisonReceipt(EnvironmentId.make("fixture"), 4),
    ).rejects.toThrow("confirmed state has not arrived");
    await vi.advanceTimersByTimeAsync(10_000);
    await pending;
    expect(harness.unsubscribe).toHaveBeenCalled();
  });
});
