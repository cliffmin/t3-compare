import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  EnvironmentId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  TurnId,
  type OrchestrationMessage,
} from "@t3tools/contracts";
import { captureComparisonThread } from "./comparisonSnapshots";
import type { CompareRun } from "./compareRunStore";
import { buildMergePrompt, DEFAULT_MERGE_INSTRUCTIONS, snapshotMergeSource } from "./compareMerge";

const createdAt = "2026-09-21T00:00:00.000Z";
const selection = { instanceId: ProviderInstanceId.make("test"), model: "test-model" };
function message(role: "user" | "assistant", text: string, turn = "one"): OrchestrationMessage {
  return {
    id: MessageId.make(`${role}-${turn}`),
    turnId: TurnId.make(turn),
    role,
    text,
    streaming: false,
    createdAt,
    updatedAt: createdAt,
  };
}
function run(id = "run-one"): CompareRun {
  return {
    id,
    environmentId: EnvironmentId.make("isolated"),
    createdAt,
    prompt: "Compare approaches",
    entries: [
      { ...selection, threadId: ThreadId.make("a") },
      { ...selection, threadId: ThreadId.make("b") },
      { ...selection, threadId: null, startError: "Unavailable" },
    ],
  };
}
function thread(id = "a") {
  return {
    id: ThreadId.make(id),
    title: "Compare approaches",
    projectId: ProjectId.make("project"),
    branch: null,
    worktreePath: null,
    messages: [message("user", "Compare approaches"), message("assistant", "Original response")],
    latestTurn: {
      turnId: TurnId.make("one"),
      state: "completed" as const,
      requestedAt: createdAt,
      startedAt: createdAt,
      completedAt: createdAt,
      assistantMessageId: MessageId.make("assistant-one"),
    },
  };
}
function mergeRun() {
  return {
    ...run(),
    merges: [
      {
        threadId: ThreadId.make("merge"),
        createdAt,
        modelSelection: selection,
        instructions: DEFAULT_MERGE_INSTRUCTIONS,
        direction: "",
      },
    ],
  };
}
function mergeThread() {
  const sources = ["a", "b"].map((id, index) =>
    snapshotMergeSource({
      index,
      threadId: id,
      model: selection.model,
      label: id,
      text: `Source ${id}`,
    }),
  );
  return {
    ...thread("merge"),
    messages: [
      message(
        "user",
        buildMergePrompt(DEFAULT_MERGE_INSTRUCTIONS, {
          question: "Compare approaches",
          direction: "",
          sources,
        }),
      ),
      message("assistant", "Combined answer [a](#source-S1-P1)"),
    ],
  };
}

describe("comparison snapshots", () => {
  it("keeps the original answer when its conversation continues", () => {
    const saved = captureComparisonThread(run(), thread());
    const followup = {
      ...thread(),
      messages: [
        ...thread().messages,
        message("user", "Continue", "two"),
        message("assistant", "Follow-up response", "two"),
      ],
    };
    expect(captureComparisonThread(saved, followup)).toBe(saved);
    expect(saved.entries[0]?.original?.messages.map((message) => message.text)).toEqual([
      "Original response",
    ]);
  });

  it("retains legacy original text without treating a later successful turn as proof of original success", () => {
    const followup = {
      ...thread(),
      messages: [
        ...thread().messages,
        message("user", "Continue", "two"),
        message("assistant", "Follow-up response", "two"),
      ],
    };
    const saved = captureComparisonThread(run(), followup);
    expect(saved.entries[0]?.original?.status).toBe("unverified");
    expect(saved.entries[0]?.original?.messages.map((message) => message.text)).toEqual([
      "Original response",
    ]);
  });

  it("saves successful merge sources independently of original selection and later inclusion changes", () => {
    const saved = captureComparisonThread(mergeRun(), mergeThread());
    expect(saved.entries).toHaveLength(3);
    expect(saved.merges?.[0]?.output?.sources.map((source) => source.threadId)).toEqual(["a", "b"]);
    const excluded = { ...saved, excludedThreadIds: [ThreadId.make("b")] };
    expect(
      captureComparisonThread(excluded, {
        ...mergeThread(),
        messages: [message("assistant", "Changed")],
      }),
    ).toBe(excluded);
    expect(excluded.merges?.[0]?.output?.answer).toContain("Combined answer");
    expect(excluded.merges?.[0]?.output?.sources[0]?.passages[0]?.text).toBe("Source a");
  });

  it("does not invent output for pending, failed, empty, or streaming merges", () => {
    const original = mergeRun();
    for (const state of ["running", "error", "interrupted"] as const) {
      const candidate = mergeThread();
      expect(
        captureComparisonThread(original, {
          ...candidate,
          latestTurn: { ...candidate.latestTurn, state },
        }),
      ).toBe(original);
    }
    expect(captureComparisonThread(original, { ...mergeThread(), messages: [] })).toBe(original);
    const candidate = mergeThread();
    expect(
      captureComparisonThread(original, {
        ...candidate,
        messages: candidate.messages.map((message) => ({ ...message, streaming: true })),
      }),
    ).toBe(original);
  });

  it("does not attach similarly titled but unrelated sessions", () => {
    const original = run();
    expect(captureComparisonThread(original, thread("unrelated"))).toBe(original);
  });
});

describe("comparison persistence", () => {
  afterEach(() => vi.unstubAllGlobals());
  const values = new Map<string, string>();
  beforeEach(() => {
    values.clear();
    vi.resetModules();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  it("loads legacy runs and reopens independently identified snapshots and collapse state", async () => {
    values.set(
      "t3code:compare-runs:v1",
      JSON.stringify({ version: 1, state: { runs: [run(), run("same-prompt-new-run")] } }),
    );
    const first = await import("./compareRunStore");
    expect(first.useCompareRunStore.getState().runs).toHaveLength(2);
    first.useCompareRunStore.getState().updateRun("run-one", (current) => ({
      ...captureComparisonThread(
        { ...captureComparisonThread(current, thread()), merges: mergeRun().merges },
        mergeThread(),
      ),
      collapsed: true,
    }));
    vi.resetModules();
    const reopened = await import("./compareRunStore");
    expect(
      reopened.useCompareRunStore.getState().getRun("run-one")?.merges?.[0]?.output?.sources,
    ).toHaveLength(2);
    expect(reopened.useCompareRunStore.getState().getRun("run-one")?.collapsed).toBe(true);
    expect(
      reopened.useCompareRunStore.getState().getRun("run-one")?.entries[0]?.original?.messages[0]
        ?.text,
    ).toBe("Original response");
    expect(
      reopened.useCompareRunStore.getState().getRun("same-prompt-new-run")?.merges,
    ).toBeUndefined();
  });
  it("leaves undecodable saved storage untouched on load", async () => {
    const raw = '{"version":1,"state":{"runs":"damaged"}}';
    values.set("t3code:compare-runs:v1", raw);
    const store = await import("./compareRunStore");
    expect(store.useCompareRunStore.getState().runs).toEqual([]);
    expect(values.get("t3code:compare-runs:v1")).toBe(raw);
  });
});
