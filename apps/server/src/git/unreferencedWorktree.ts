import { GitCommandError, type VcsRemoveWorktreeInput } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";

/** Last server-side check for aggregate deletion; active and archived references both retain trees. */
export const ensureUnreferencedWorktree = Effect.fn("ensureUnreferencedWorktree")(
  function* (input: VcsRemoveWorktreeInput) {
    const query = yield* ProjectionSnapshotQuery;
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    const canonical = (value: string) =>
      fs.realPath(path.resolve(value)).pipe(Effect.orElseSucceed(() => path.resolve(value)));
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
