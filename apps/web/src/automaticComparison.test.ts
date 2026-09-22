import { beforeEach, afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  EnvironmentId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import type { CompareRun } from "./compareRunStore";

const at = "2026-09-22T00:00:00.000Z";
function run(): CompareRun {
  return {
    id: "comparison-one",
    environmentId: EnvironmentId.make("test"),
    createdAt: at,
    prompt: "Which approach?",
    automatic: {
      config: {
        modelSelection: { instanceId: ProviderInstanceId.make("merger"), model: "model" },
        direction: "Be concise",
      },
      status: "waiting",
    },
    entries: ["a", "b", "c"].map((id) => ({
      threadId: ThreadId.make(id),
      instanceId: ProviderInstanceId.make(id),
      model: "model",
      launch: "started",
      original: {
        status: "completed",
        projectId: ProjectId.make("project"),
        branch: null,
        worktreePath: null,
        messages: [
          {
            id: MessageId.make(id),
            turnId: null,
            role: "assistant",
            text: `Original ${id}`,
            streaming: false,
            createdAt: at,
            updatedAt: at,
          },
        ],
      },
    })),
  };
}
let memory: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  memory = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  });
  let tail = Promise.resolve();
  vi.stubGlobal("navigator", {
    userAgent: "test",
    platform: "MacIntel",
    locks: {
      request: (_key: string, action: () => Promise<void>) => {
        const next = tail.then(action);
        tail = next.catch(() => undefined);
        return next;
      },
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function setup(value = run()) {
  const store = await import("./compareRunStore");
  const automatic = await import("./automaticComparison");
  store.useCompareRunStore.getState().recordRun(value);
  return { ...store, ...automatic };
}
describe("automatic comparison", () => {
  it("freezes three original sources and an exact command payload", async () => {
    const { prepareAutomaticMerge, automaticMergeCommand } = await setup();
    const prepared = prepareAutomaticMerge(run(), at);
    expect(prepared.merges?.[0]?.sources).toHaveLength(3);
    expect(automaticMergeCommand(prepared)?.message.text).toContain("Original a");
    expect(automaticMergeCommand(prepared)?.modelSelection?.instanceId).toBe("merger");
    expect(prepareAutomaticMerge(prepared, at)).toBe(prepared);
  });
  it("waits for pending originals and skips interrupted/failed answers", async () => {
    const { prepareAutomaticMerge } = await setup();
    const pending = {
      ...run(),
      entries: run().entries.map((entry, i) =>
        i === 2
          ? { threadId: entry.threadId, instanceId: entry.instanceId, model: entry.model }
          : entry,
      ),
    };
    expect(prepareAutomaticMerge(pending, at)).toBe(pending);
    const failed = {
      ...run(),
      entries: run().entries.map((entry, i) =>
        i === 2
          ? { ...entry, original: { ...entry.original!, status: "interrupted" as const } }
          : entry,
      ),
    };
    expect(prepareAutomaticMerge(failed, at).merges?.[0]?.sources).toHaveLength(2);
    const insufficient = { ...failed, excludedThreadIds: [ThreadId.make("a")] };
    expect(prepareAutomaticMerge(insufficient, at).automatic?.status).toBe("insufficient");
    expect(prepareAutomaticMerge(insufficient, at).merges).toBeUndefined();
  });
  it("does not activate legacy runs", async () => {
    const { prepareAutomaticMerge } = await setup();
    const { automatic: _automatic, ...legacy } = run();
    expect(prepareAutomaticMerge(legacy, at)).toBe(legacy);
  });
  it("serializes competing tabs and recovers the same frozen ledger after stale grouping writes", async () => {
    const api = await setup();
    const send = vi.fn(async () => undefined);
    await Promise.all([
      api.dispatchAutomaticComparison(run().id, send),
      api.dispatchAutomaticComparison(run().id, send),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    const frozen = send.mock.calls[0];
    expect(frozen).toBeDefined();
    api.useCompareRunStore.getState().recordRun({
      ...run(),
      prompt: "Changed by stale tab",
      excludedThreadIds: [ThreadId.make("a")],
    });
    await api.dispatchAutomaticComparison(run().id, send);
    expect(send).toHaveBeenCalledTimes(1);
    const restored = api.useCompareRunStore.getState().getRun(run().id)!;
    expect(restored.prompt).toBe("Which approach?");
    expect(restored.merges?.[0]?.sources).toHaveLength(3);
    expect(restored.automatic?.status).toBe("uncertain");
  });
  it("never resends after uncertain delivery or a reload", async () => {
    const api = await setup();
    const send = vi.fn(async () => {
      throw new Error("Connection lost");
    });
    await api.dispatchAutomaticComparison(run().id, send);
    vi.resetModules();
    const reopened = await import("./automaticComparison");
    await reopened.dispatchAutomaticComparison(run().id, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(api.readDurableComparison(run().id)?.automatic?.status).toBe("uncertain");
  });
  it("does not dispatch without durable storage", async () => {
    const api = await setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: () => {
        throw new Error("Quota");
      },
    });
    const send = vi.fn(async () => undefined);
    await api.dispatchAutomaticComparison(run().id, send);
    expect(send).not.toHaveBeenCalled();
  });
  it("retains pending attempts beyond the normal history cap", async () => {
    const api = await setup();
    const { automatic: _automatic, ...legacy } = run();
    for (let i = 0; i < 30; i++)
      api.useCompareRunStore.getState().recordRun({ ...legacy, id: `new-${i}` });
    expect(api.readDurableComparison(run().id)).not.toBeNull();
  });
  it("safe explicit retry preserves selected input sources despite later checkbox changes", async () => {
    const api = await setup();
    const first = api.prepareAutomaticMerge(run(), at);
    const retry = {
      ...first,
      excludedThreadIds: [ThreadId.make("a")],
      automatic: { ...first.automatic!, status: "waiting" as const, attempt: 1 },
    };
    const next = api.prepareAutomaticMerge(retry, at);
    expect(next.merges?.at(-1)?.sources).toEqual(first.merges?.[0]?.sources);
    expect(next.merges?.at(-1)?.threadId).not.toBe(first.merges?.[0]?.threadId);
  });
});

it("does not let an old failed attempt cancel a new explicit retry", async () => {
  const api = await setup();
  const { captureComparisonThread } = await import("./comparisonSnapshots");
  const first = api.prepareAutomaticMerge(run(), at);
  const retry = {
    ...first,
    automatic: { ...first.automatic!, status: "waiting" as const, attempt: 1 },
  };
  const old = first.merges![0]!;
  const thread = {
    id: old.threadId,
    title: "Failed",
    projectId: ProjectId.make("project"),
    branch: null,
    worktreePath: null,
    messages: [
      {
        id: old.messageId!,
        turnId: null,
        role: "user" as const,
        text: old.prompt!,
        streaming: false,
        createdAt: at,
        updatedAt: at,
      },
    ],
    latestTurn: {
      turnId: (await import("@t3tools/contracts")).TurnId.make("turn"),
      state: "error" as const,
      requestedAt: at,
      startedAt: at,
      completedAt: at,
      assistantMessageId: null,
    },
  };
  expect(captureComparisonThread(retry, thread)).toBe(retry);
});

it("missing or rejected browser locks keeps originals and prevents dispatch", async () => {
  const api = await setup();
  const send = vi.fn(async () => undefined);
  vi.stubGlobal("navigator", { userAgent: "test", platform: "MacIntel" });
  await api.dispatchAutomaticComparison(run().id, send);
  expect(send).not.toHaveBeenCalled();
  expect(api.useCompareRunStore.getState().getRun(run().id)?.entries).toEqual(run().entries);
  expect(api.useCompareRunStore.getState().getRun(run().id)?.automatic?.error).toContain(
    "browser locking",
  );
  api.useCompareRunStore.getState().recordRun(run());
  vi.stubGlobal("navigator", {
    locks: {
      request: async () => {
        throw new Error("Denied");
      },
    },
  });
  await api.dispatchAutomaticComparison(run().id, send);
  expect(send).not.toHaveBeenCalled();
  expect(api.useCompareRunStore.getState().getRun(run().id)?.automatic?.error).toContain(
    "locking is unavailable",
  );
});
