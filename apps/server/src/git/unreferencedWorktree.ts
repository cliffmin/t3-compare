import { ProviderService } from "../provider/Services/ProviderService.ts";
import { TerminalManager } from "../terminal/Manager.ts";
import { GitWorkflowService } from "./GitWorkflowService.ts";
import { withWorkspaceLease } from "../workspace/workspaceLease.ts";
import { GitCommandError, type VcsRemoveWorktreeInput } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Result from "effect/Result";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";

/** Last server-side check for aggregate deletion; active and archived references both retain trees. */
export const ensureUnreferencedWorktree = Effect.fn("ensureUnreferencedWorktree")(
  function* (input: VcsRemoveWorktreeInput) {
    const query = yield* ProjectionSnapshotQuery;
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const canonical = (value: string) =>
      Effect.gen(function* () {
        let parent = path.resolve(value);
        const suffix: string[] = [];
        while (true) {
          const real = yield* fs.realPath(parent).pipe(Effect.result);
          if (Result.isSuccess(real)) return path.join(real.success, ...suffix);
          const next = path.dirname(parent);
          if (next === parent) return path.resolve(value);
          suffix.unshift(path.basename(parent));
          parent = next;
        }
      });
    const target = yield* canonical(input.path);
    const cwd = yield* canonical(input.cwd);
    const active = yield* query.getShellSnapshot();
    const archived = yield* query.getArchivedShellSnapshot();
    let used = target === cwd;
    for (const project of [...active.projects, ...archived.projects]) {
      const root = yield* canonical(project.workspaceRoot);
      const relative = path.relative(target, root);
      if (
        relative === "" ||
        (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
      )
        used = true;
    }
    for (const thread of [...active.threads, ...archived.threads]) {
      if (thread.worktreePath && (yield* canonical(thread.worktreePath)) === target) used = true;
    }
    if (used)
      return yield* new GitCommandError({
        operation: "removeWorktree",
        command: "git worktree remove",
        cwd: input.cwd,
        detail: "Worktree retained: a surviving conversation or project still uses it.",
      });
  },
  (effect, input) =>
    effect.pipe(
      Effect.mapError(
        (cause) =>
          new GitCommandError({
            operation: "removeWorktree",
            command: "git worktree remove",
            cwd: input.cwd,
            detail: cause.message,
          }),
      ),
    ),
);

/** Shares the native cleanup/startup lease so automatic and explicit cleanup cannot race. */
export const removeUnreferencedWorktree = Effect.fn("removeUnreferencedWorktree")(
  function* (input: VcsRemoveWorktreeInput) {
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const target = path.resolve(input.path);
    return yield* withWorkspaceLease(
      target,
      Effect.gen(function* () {
        yield* ensureUnreferencedWorktree(input);
        // Automatic cleanup may have completed while this request waited for its lease.
        if (!(yield* fs.exists(target))) return;
        const fail = (detail: string) =>
          new GitCommandError({
            operation: "removeWorktree",
            command: "git worktree remove",
            cwd: input.cwd,
            detail,
          });
        // Native startup and automatic cleanup lease the resolved stored path.
        // Retain aliases rather than remove through a different lease identity.
        if ((yield* fs.realPath(target)) !== target)
          return yield* fail("Worktree retained: its path is a filesystem alias.");
        if ((yield* fs.stat(path.join(target, ".git"))).type !== "File")
          return yield* fail("Worktree retained: this is not a linked Git worktree.");
        const contains = (cwd: string) => {
          const relative = path.relative(target, path.resolve(cwd));
          return (
            relative === "" ||
            (!relative.startsWith(`..${path.sep}`) &&
              relative !== ".." &&
              !path.isAbsolute(relative))
          );
        };
        const providers = yield* ProviderService;
        for (const session of yield* providers.listSessions()) {
          if (
            session.status !== "closed" &&
            session.cwd &&
            contains(yield* fs.realPath(session.cwd).pipe(Effect.orElseSucceed(() => session.cwd!)))
          )
            return yield* fail("Worktree retained: a live provider session still uses it.");
        }
        const terminals = yield* TerminalManager;
        let terminalUsesTree = false;
        const unsubscribe = yield* terminals.subscribeMetadata((event) =>
          Effect.gen(function* () {
            const items =
              event.type === "snapshot"
                ? event.terminals
                : event.type === "upsert"
                  ? [event.terminal]
                  : [];
            for (const terminal of items) {
              if (terminal.status !== "starting" && terminal.status !== "running") continue;
              for (const cwd of [terminal.cwd, terminal.worktreePath]) {
                if (cwd && contains(yield* fs.realPath(cwd).pipe(Effect.orElseSucceed(() => cwd))))
                  terminalUsesTree = true;
              }
            }
          }),
        );
        try {
          if (terminalUsesTree)
            return yield* fail("Worktree retained: a live terminal still uses it.");
          yield* ensureUnreferencedWorktree(input);
          if (terminalUsesTree)
            return yield* fail("Worktree retained: a live terminal still uses it.");
          const git = yield* GitWorkflowService;
          return yield* git.removeWorktree({ ...input, path: target });
        } finally {
          unsubscribe();
        }
      }),
    );
  },
  (effect, input) =>
    effect.pipe(
      Effect.mapError(
        (cause) =>
          new GitCommandError({
            operation: "removeWorktree",
            command: "git worktree remove",
            cwd: input.cwd,
            detail: cause.message,
          }),
      ),
    ),
);
