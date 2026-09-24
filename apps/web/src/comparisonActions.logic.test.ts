import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProjectId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import type { CompareRun } from "./compareRunStore";
import {
  applyComparisonMembers,
  resolveComparisonMembers,
  comparisonCleanupCandidatePaths,
} from "./comparisonActions.logic";
const env = EnvironmentId.make("fixture");
const selection = { instanceId: ProviderInstanceId.make("fixture"), model: "mock" };
const thread = (id: string, archived = false): EnvironmentThreadShell => ({
  environmentId: env,
  id: ThreadId.make(id),
  projectId: ProjectId.make("project"),
  title: id,
  modelSelection: selection,
  runtimeMode: "full-access",
  interactionMode: "default",
  branch: null,
  worktreePath: null,
  latestTurn: null,
  createdAt: "2026-09-23T00:00:00.000Z",
  updatedAt: "2026-09-23T00:00:00.000Z",
  archivedAt: archived ? "2026-09-23T00:00:00.000Z" : null,
  settledOverride: null,
  settledAt: null,
  pullRequests: [],
  session: null,
  latestUserMessageAt: null,
  hasPendingApprovals: false,
  hasPendingUserInput: false,
  hasActionableProposedPlan: false,
});
const run = (): CompareRun => ({
  id: "run",
  environmentId: env,
  prompt: "Common prompt",
  createdAt: "2026-09-23T00:00:00.000Z",
  entries: ["a", "b", "a"].map((id) => ({
    ...selection,
    threadId: ThreadId.make(id),
    launch: "started",
  })),
  followUp: { threadId: ThreadId.make("shared"), draftId: "draft" },
  merges: [
    {
      threadId: ThreadId.make("legacy"),
      createdAt: "2026-09-23T00:00:00.000Z",
      modelSelection: selection,
      instructions: "",
      direction: "",
    },
  ],
});
describe("comparison aggregate membership", () => {
  it("deduplicates sources and includes archived/shared members while excluding legacy/outside threads", () => {
    const result = resolveComparisonMembers(run(), [
      thread("a"),
      thread("b", true),
      thread("shared"),
      thread("legacy"),
      thread("outside"),
    ]);
    expect(result.ids).toEqual(["a", "b", "shared"]);
    expect(result.threads.map((t) => t.id)).toEqual(result.ids);
    expect(result.missing).toEqual([]);
  });
  it("does not interpret missing or disconnected members as deleted", () => {
    expect(resolveComparisonMembers(run(), []).missing).toEqual(["a", "b", "shared"]);
  });
  it("excludes only a verified owned unsent shared draft, not a promoted or server-backed one", () => {
    expect(resolveComparisonMembers(run(), [], true).ids).toEqual(["a", "b"]);
    expect(resolveComparisonMembers(run(), [thread("shared")], true).ids).toEqual([
      "a",
      "b",
      "shared",
    ]);
  });
  it("excludes confirmed deleted identities and guards uncertain source receipts", () => {
    const current = run();
    const result = resolveComparisonMembers(
      {
        ...current,
        entries: current.entries.map((e) => ({
          ...e,
          deleted: e.threadId === "a",
          launch: "uncertain",
        })),
        followUp: { ...current.followUp!, deleted: true },
      },
      [],
    );
    expect(result.ids).toEqual(["b"]);
    expect(result.uncertain).toBe(true);
  });
  it("continues partial failure and supplies only successful deletions to subsequent actions", async () => {
    const current = run();
    const shells = [thread("a"), thread("b"), thread("shared")];
    const observed: string[][] = [];
    const result = await applyComparisonMembers({
      ids: resolveComparisonMembers(current, shells).ids,
      read: async () => resolveComparisonMembers(current, shells),
      eligible: () => true,
      apply: async (t, successful) => {
        observed.push([...successful]);
        if (t.id === "b") throw new Error("stop failed");
      },
    });
    expect(observed).toEqual([[], ["a"], ["a"]]);
    expect([...result.successful]).toEqual(["a", "shared"]);
    expect(result.failures).toEqual([{ id: "b", message: "stop failed" }]);
  });
  it("rechecks current state, skips satisfied members, and stops when the root is removed", async () => {
    let reads = 0;
    const seen: string[] = [];
    const current = run();
    const result = await applyComparisonMembers({
      ids: [ThreadId.make("a"), ThreadId.make("b"), ThreadId.make("shared")],
      read: async () =>
        ++reads === 3
          ? null
          : resolveComparisonMembers(current, [thread("a", true), thread("b"), thread("shared")]),
      eligible: (t) => !t.archivedAt,
      apply: async (t) => {
        seen.push(t.id);
      },
    });
    expect(seen).toEqual(["b"]);
    expect([...result.successful]).toEqual(["b"]);
  });
  it("does not dispatch to a member that disappeared during execution", async () => {
    let calls = 0;
    const result = await applyComparisonMembers({
      ids: [ThreadId.make("b")],
      read: async () => resolveComparisonMembers(run(), [thread("a")]),
      eligible: () => true,
      apply: async () => {
        calls++;
      },
    });
    expect(calls).toBe(0);
    expect(result.failures[0]?.message).toContain("unavailable");
  });
});

it("deduplicates cleanup candidates and excludes outside, archived and project-root survivors", () => {
  const members = [
    { ...thread("a"), worktreePath: "/tree/shared" },
    { ...thread("b"), worktreePath: "/tree/shared" },
    { ...thread("c"), worktreePath: "/tree/project" },
    { ...thread("d"), worktreePath: "/tree/unused" },
  ];
  const outside = { ...thread("outside", true), worktreePath: "/tree/shared" };
  expect(
    comparisonCleanupCandidatePaths(members, [...members, outside], ["/tree/project/nested"]),
  ).toEqual(["/tree/unused"]);
});
