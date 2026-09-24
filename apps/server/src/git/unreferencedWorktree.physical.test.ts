import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import {
  type OrchestrationShellSnapshot,
  type ProviderSession,
  type TerminalSummary,
  ProjectId,
  ThreadId,
  ProviderInstanceId,
  ProviderDriverKind,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Deferred from "effect/Deferred";
import * as Fiber from "effect/Fiber";
import { ServerConfig } from "../config.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import { GitWorkflowService } from "./GitWorkflowService.ts";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { ProviderService } from "../provider/Services/ProviderService.ts";
import { TerminalManager } from "../terminal/Manager.ts";
import { removeUnreferencedWorktree } from "./unreferencedWorktree.ts";
import { withWorkspaceLease } from "../workspace/workspaceLease.ts";

import { PersistenceSqlError } from "../persistence/Errors.ts";

const layer = GitVcsDriver.layer.pipe(
  Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "compare-delete-test-" })),
  Layer.provideMerge(NodeServices.layer),
);
const empty: OrchestrationShellSnapshot = {
  snapshotSequence: 1,
  updatedAt: "2026-09-23T00:00:00.000Z",
  projects: [],
  threads: [],
};
const fixture = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const root = yield* fs
    .makeTempDirectoryScoped({ prefix: "compare-delete-physical-" })
    .pipe(Effect.flatMap((directory) => fs.realPath(directory)));
  const git = yield* GitVcsDriver.GitVcsDriver;
  const cmd = (args: string[]) => git.execute({ operation: "fixture", cwd: root, args });
  yield* cmd(["init"]);
  yield* cmd([
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--allow-empty",
    "-m",
    "Synthetic base",
  ]);
  const tree = `${root}/linked`;
  yield* cmd(["worktree", "add", "-b", "fixture-linked", tree]);
  let calls = 0;
  const remove = (
    active = empty,
    archived = empty,
    target = tree,
    inventory: {
      sessions?: ReadonlyArray<ProviderSession>;
      terminals?: ReadonlyArray<TerminalSummary>;
      queryFailure?: "active" | "archived";
    } = {},
  ) =>
    removeUnreferencedWorktree({
      cwd: root,
      path: target,
      force: true,
      requireUnreferenced: true,
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(ProjectionSnapshotQuery)({
            getShellSnapshot: () =>
              inventory.queryFailure === "active"
                ? Effect.fail(new PersistenceSqlError({ operation: "fixture.active" }))
                : Effect.succeed(active),
            getArchivedShellSnapshot: () =>
              inventory.queryFailure === "archived"
                ? Effect.fail(new PersistenceSqlError({ operation: "fixture.archived" }))
                : Effect.succeed(archived),
          }),
          Layer.mock(ProviderService)({
            listSessions: () => Effect.succeed(inventory.sessions ?? []),
          }),
          Layer.mock(TerminalManager)({
            subscribeMetadata: (listener) =>
              listener({ type: "snapshot", terminals: inventory.terminals ?? [] }).pipe(
                Effect.as(() => {}),
              ),
          }),
          Layer.mock(GitWorkflowService)({
            removeWorktree: (input) =>
              Effect.suspend(() => {
                calls++;
                return git.removeWorktree(input);
              }),
          }),
        ),
      ),
    );
  return { fs, root, tree, git, cmd, remove, calls: () => calls };
});

describe("confirmed aggregate cleanup with physical Git worktrees", () => {
  for (const dirty of [false, true])
    it.effect(
      `removes eligible ${dirty ? "dirty" : "clean"} worktree with native confirmed force semantics`,
      () =>
        Effect.gen(function* () {
          const f = yield* fixture;
          if (dirty)
            yield* f.fs.writeFileString(`${f.tree}/local-notes.txt`, "Disposable local changes");
          yield* f.remove();
          expect(yield* f.fs.exists(f.tree)).toBe(false);
          expect(yield* f.fs.exists(`${f.root}/.git`)).toBe(true);
          yield* f.remove();
          expect(f.calls()).toBe(1);
        }).pipe(Effect.provide(layer)),
    );

  for (const status of ["running", "ready", "closed"] as const)
    it.effect(`provider inventory ${status} guards physical removal`, () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        const sessions: ProviderSession[] = [
          {
            provider: ProviderDriverKind.make("codex"),
            status,
            runtimeMode: "full-access",
            cwd: f.tree,
            threadId: ThreadId.make("outside-provider"),
            createdAt: empty.updatedAt,
            updatedAt: empty.updatedAt,
          },
        ];
        const result = yield* f.remove(empty, empty, f.tree, { sessions }).pipe(Effect.result);
        expect(Result.isFailure(result)).toBe(status !== "closed");
        expect(yield* f.fs.exists(f.tree)).toBe(status !== "closed");
        expect(f.calls()).toBe(status === "closed" ? 1 : 0);
      }).pipe(Effect.provide(layer)),
    );

  for (const status of ["starting", "running", "exited", "error"] as const)
    it.effect(`terminal inventory ${status} guards physical removal`, () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        const terminals: TerminalSummary[] = [
          {
            threadId: "outside-terminal",
            terminalId: "fixture",
            cwd: f.tree,
            worktreePath: f.tree,
            status,
            pid: null,
            exitCode: null,
            exitSignal: null,
            hasRunningSubprocess: false,
            label: "Fixture",
            updatedAt: empty.updatedAt,
          },
        ];
        const result = yield* f.remove(empty, empty, f.tree, { terminals }).pipe(Effect.result);
        const live = status === "starting" || status === "running";
        expect(Result.isFailure(result)).toBe(live);
        expect(yield* f.fs.exists(f.tree)).toBe(live);
        expect(f.calls()).toBe(live ? 0 : 1);
      }).pipe(Effect.provide(layer)),
    );

  for (const queryFailure of ["active", "archived"] as const)
    it.effect(`retains physical worktree when ${queryFailure} reference query fails`, () =>
      Effect.gen(function* () {
        const f = yield* fixture;
        expect(
          Result.isFailure(
            yield* f.remove(empty, empty, f.tree, { queryFailure }).pipe(Effect.result),
          ),
        ).toBe(true);
        expect(yield* f.fs.exists(f.tree)).toBe(true);
        expect(f.calls()).toBe(0);
      }).pipe(Effect.provide(layer)),
    );

  it.effect("retains main and nested project checkouts", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      expect(Result.isFailure(yield* f.remove(empty, empty, f.root).pipe(Effect.result))).toBe(
        true,
      );
      const project = {
        id: ProjectId.make("fixture"),
        title: "Fixture",
        workspaceRoot: `${f.tree}/nested`,
        defaultModelSelection: null,
        scripts: [],
        createdAt: empty.updatedAt,
        updatedAt: empty.updatedAt,
      };
      expect(
        Result.isFailure(yield* f.remove({ ...empty, projects: [project] }).pipe(Effect.result)),
      ).toBe(true);
      expect(yield* f.fs.exists(f.tree)).toBe(true);
      expect(f.calls()).toBe(0);
    }).pipe(Effect.provide(layer)),
  );

  for (const archived of [false, true])
    it.effect(
      `retains physical tree used by an outside ${archived ? "archived" : "active"} thread`,
      () =>
        Effect.gen(function* () {
          const f = yield* fixture;
          const thread = {
            id: ThreadId.make("outside"),
            projectId: ProjectId.make("fixture"),
            title: "Outside fixture",
            modelSelection: { instanceId: ProviderInstanceId.make("mock"), model: "fixture" },
            runtimeMode: "full-access" as const,
            interactionMode: "default" as const,
            branch: "fixture-linked",
            worktreePath: f.tree,
            latestTurn: null,
            createdAt: empty.updatedAt,
            updatedAt: empty.updatedAt,
            archivedAt: archived ? empty.updatedAt : null,
            settledOverride: null,
            settledAt: null,
            pullRequests: [],
            session: null,
            latestUserMessageAt: null,
            hasPendingApprovals: false,
            hasPendingUserInput: false,
            hasActionableProposedPlan: false,
          };
          const snapshot = { ...empty, threads: [thread] };
          expect(
            Result.isFailure(
              yield* f
                .remove(archived ? empty : snapshot, archived ? snapshot : empty)
                .pipe(Effect.result),
            ),
          ).toBe(true);
          expect(yield* f.fs.exists(f.tree)).toBe(true);
          expect(f.calls()).toBe(0);
        }).pipe(Effect.provide(layer)),
    );

  it.effect("retains an aliased worktree under its native resolved-path lease", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      const alias = `${f.root}/linked-alias`;
      yield* f.fs.symlink(f.tree, alias);
      const acquired = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      const startup = yield* withWorkspaceLease(
        alias,
        Effect.gen(function* () {
          yield* Deferred.succeed(acquired, undefined);
          yield* Deferred.await(release);
        }),
      ).pipe(Effect.forkChild);
      yield* Deferred.await(acquired);
      const explicit = yield* f.remove(empty, empty, alias).pipe(Effect.result, Effect.forkChild);
      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(startup);
      const result = yield* Fiber.join(explicit);
      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) expect(result.failure.detail).toContain("filesystem alias");
      expect(yield* f.fs.exists(f.tree)).toBe(true);
      expect(f.calls()).toBe(0);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("reports a locked worktree failure without removing its data", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      yield* f.cmd(["worktree", "lock", f.tree]);
      expect(Result.isFailure(yield* f.remove().pipe(Effect.result))).toBe(true);
      expect(yield* f.fs.exists(f.tree)).toBe(true);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("coordinates with automatic cleanup under the existing workspace lease", () =>
    Effect.gen(function* () {
      const f = yield* fixture;
      const acquired = yield* Deferred.make<void>();
      const release = yield* Deferred.make<void>();
      const automatic = yield* withWorkspaceLease(
        f.tree,
        Effect.gen(function* () {
          yield* Deferred.succeed(acquired, undefined);
          yield* Deferred.await(release);
          yield* f.git.removeWorktree({ cwd: f.root, path: f.tree, force: false });
        }),
      ).pipe(Effect.forkChild);
      yield* Deferred.await(acquired);
      const explicit = yield* f.remove().pipe(Effect.forkChild);
      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(automatic);
      yield* Fiber.join(explicit);
      expect(yield* f.fs.exists(f.tree)).toBe(false);
      expect(f.calls()).toBe(0);
    }).pipe(Effect.provide(layer)),
  );
});
