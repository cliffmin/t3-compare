import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { EnvironmentId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import type { CompareRun } from "./compareRunStore";

const run = (id = "one"): CompareRun => ({
  id,
  createdAt: "2026-09-22T00:00:00.000Z",
  environmentId: EnvironmentId.make("test"),
  prompt: "Compare",
  entries: [
    {
      threadId: ThreadId.make("child"),
      instanceId: ProviderInstanceId.make("fixture"),
      model: "fixture",
      launch: "pending",
    },
  ],
});
let memory: Map<string, string>;
let blocked: boolean;
beforeEach(() => {
  vi.resetModules();
  memory = new Map();
  blocked = false;
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error("quota");
      memory.set(key, value);
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("comparison record actions", () => {
  it("trims rename, rejects empty, persists and leaves child identity unchanged", async () => {
    const api = await import("./compareRunStore");
    const store = api.useCompareRunStore.getState();
    store.recordRun(run());
    expect(store.renameRun("one", "   ")).toBe("failed");
    expect(store.renameRun("one", "  Explicit title  ")).toBe("saved");
    expect(store.getRun("one")?.entries).toEqual(run().entries);
    vi.resetModules();
    expect(
      (await import("./compareRunStore")).useCompareRunStore.getState().getRun("one")?.title,
    ).toBe("Explicit title");
  });
  it("removes only selected record using latest durable state, including legacy metadata", async () => {
    const api = await import("./compareRunStore");
    const store = api.useCompareRunStore.getState();
    store.recordRun(run());
    memory.set(
      api.COMPARE_RUN_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { runs: [run(), run("other-tab")] } }),
    );
    expect(store.removeRun("one")).toBe("saved");
    expect(api.useCompareRunStore.getState().runs.map((r) => r.id)).toEqual(["other-tab"]);
    expect(api.readDurableComparison("one")).toBeNull();
  });
  it("late in-flight outcomes and snapshot updates cannot recreate a removed record", async () => {
    const api = await import("./compareRunStore");
    const store = api.useCompareRunStore.getState();
    store.recordRun(run());
    store.recordRun(run("other"));
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const late = pending.then(() =>
      api.settleComparisonEntry("one", 0, { ...run().entries[0]!, launch: "started" }),
    );
    store.removeRun("one");
    finish();
    await late;
    store.updateRun("one", (current) => ({ ...current, title: "Late snapshot" }));
    expect(store.getRun("one")).toBeNull();
    expect(api.readDurableComparison("one")).toBeNull();
    expect(store.getRun("other")).toEqual(run("other"));
  });
  it("fails durably blocked rename/delete without changing memory or disk", async () => {
    const api = await import("./compareRunStore");
    const store = api.useCompareRunStore.getState();
    store.recordRun(run());
    const before = memory.get(api.COMPARE_RUN_STORAGE_KEY);
    blocked = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(store.renameRun("one", "Lost title")).toBe("failed");
    expect(store.removeRun("one")).toBe("failed");
    expect(store.getRun("one")).toEqual(run());
    expect(memory.get(api.COMPARE_RUN_STORAGE_KEY)).toBe(before);
    log.mockRestore();
  });
  it("explicitly reports session-only actions when storage was unavailable initially", async () => {
    vi.stubGlobal("localStorage", undefined);
    const api = await import("./compareRunStore");
    const store = api.useCompareRunStore.getState();
    store.recordRun(run());
    expect(store.renameRun("one", "Session")).toBe("session-only");
    expect(store.removeRun("one")).toBe("session-only");
  });
  it("records confirmed deletion for only the matching environment and retains entry identity across reload", async () => {
    const api = await import("./compareRunStore");
    const store = api.useCompareRunStore.getState();
    store.recordRun(run());
    store.recordRun({ ...run("other"), environmentId: EnvironmentId.make("elsewhere") });
    api.markComparisonThreadDeleted(EnvironmentId.make("test"), ThreadId.make("child"));
    expect(store.getRun("one")?.entries[0]).toEqual({ ...run().entries[0], deleted: true });
    expect(store.getRun("other")?.entries[0]?.deleted).toBeUndefined();
    vi.resetModules();
    expect(
      (await import("./compareRunStore")).useCompareRunStore.getState().getRun("one")?.entries[0]
        ?.deleted,
    ).toBe(true);
  });
});

it("late start receipt preserves an already-confirmed native child deletion", async () => {
  const api = await import("./compareRunStore");
  const store = api.useCompareRunStore.getState();
  store.recordRun(run());
  api.markComparisonThreadDeleted(EnvironmentId.make("test"), ThreadId.make("child"));
  api.settleComparisonEntry("one", 0, { ...run().entries[0]!, launch: "started" });
  expect(api.readDurableComparison("one")?.entries[0]?.deleted).toBe(true);
  api.settleComparisonEntry("one", 0, {
    ...run().entries[0]!,
    launch: "failed",
    threadId: null,
    startError: "late failure",
  });
  expect(api.readDurableComparison("one")?.entries[0]?.deleted).toBe(true);
  expect(api.readDurableComparison("one")?.entries[0]?.threadId).toBe("child");
});
