import { describe, expect, it } from "@effect/vitest";
import {
  ProjectId,
  ThreadId,
  ProviderInstanceId,
  type OrchestrationShellSnapshot,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Result from "effect/Result";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { ensureUnreferencedWorktree } from "./unreferencedWorktree.ts";
const now = "2026-09-23T00:00:00.000Z";
const empty: OrchestrationShellSnapshot = {
  snapshotSequence: 1,
  updatedAt: now,
  projects: [],
  threads: [],
};
const thread = {
  id: ThreadId.make("survivor"),
  projectId: ProjectId.make("fixture"),
  title: "Survivor",
  modelSelection: { instanceId: ProviderInstanceId.make("mock"), model: "mock" },
  runtimeMode: "full-access" as const,
  interactionMode: "default" as const,
  branch: null,
  worktreePath: "/fixture/tree",
  latestTurn: null,
  createdAt: now,
  updatedAt: now,
  archivedAt: null,
  settledOverride: null,
  settledAt: null,
  pullRequests: [],
  session: null,
  latestUserMessageAt: null,
  hasPendingApprovals: false,
  hasPendingUserInput: false,
  hasActionableProposedPlan: false,
};
const project = (workspaceRoot: string) => ({
  id: ProjectId.make("fixture"),
  title: "Fixture",
  workspaceRoot,
  defaultModelSelection: null,
  scripts: [],
  createdAt: now,
  updatedAt: now,
});
const check = (active = empty, archived = empty, alias = false) =>
  ensureUnreferencedWorktree({
    cwd: "/fixture/main",
    path: "/fixture/tree",
    force: true,
    requireUnreferenced: true,
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        Path.layer,
        FileSystem.layerNoop({
          realPath: (path) => Effect.succeed(alias && path === "/alias" ? "/fixture/tree" : path),
        }),
        Layer.mock(ProjectionSnapshotQuery)({
          getShellSnapshot: () => Effect.succeed(active),
          getArchivedShellSnapshot: () => Effect.succeed(archived),
        }),
      ),
    ),
    Effect.result,
  );
describe("aggregate worktree survivor guard", () => {
  it.effect("permits an unused tree", () =>
    Effect.gen(function* () {
      expect(Result.isSuccess(yield* check())).toBe(true);
    }),
  );
  it.effect("retains outside and archived thread references", () =>
    Effect.gen(function* () {
      expect(Result.isFailure(yield* check({ ...empty, threads: [thread] }))).toBe(true);
      expect(
        Result.isFailure(
          yield* check(empty, { ...empty, threads: [{ ...thread, archivedAt: now }] }),
        ),
      ).toBe(true);
    }),
  );
  it.effect("retains project roots, nested project roots, and aliases", () =>
    Effect.gen(function* () {
      for (const root of ["/fixture/tree", "/fixture/tree/nested", "/alias"])
        expect(
          Result.isFailure(yield* check({ ...empty, projects: [project(root)] }, empty, true)),
        ).toBe(true);
    }),
  );
  it.effect("does not confuse a sibling prefix for a contained project", () =>
    Effect.gen(function* () {
      expect(
        Result.isSuccess(yield* check({ ...empty, projects: [project("/fixture/tree-other")] })),
      ).toBe(true);
    }),
  );
});
