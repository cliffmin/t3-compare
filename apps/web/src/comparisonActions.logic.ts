import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import type { ThreadId } from "@t3tools/contracts";
import type { CompareRun } from "./compareRunStore";

/** Lifecycle membership deliberately excludes legacy merge outputs. Absence is never deletion. */
export function comparisonMemberIds(
  run: CompareRun,
  shells: ReadonlyArray<EnvironmentThreadShell>,
  unsentSharedDraft = false,
) {
  const ids = run.entries.flatMap((entry) =>
    entry.threadId && !entry.deleted ? [entry.threadId] : [],
  );
  if (run.followUp && !run.followUp.deleted) {
    const exists = shells.some(
      (thread) =>
        thread.environmentId === run.environmentId && thread.id === run.followUp?.threadId,
    );
    // An owned local draft is not a server conversation. Once promoted, absence is unresolved.
    if (exists || !unsentSharedDraft || run.followUp.pending) ids.push(run.followUp.threadId);
  }
  return [...new Set(ids)];
}

export function resolveComparisonMembers(
  run: CompareRun,
  shells: ReadonlyArray<EnvironmentThreadShell>,
  unsentSharedDraft = false,
) {
  const ids = comparisonMemberIds(run, shells, unsentSharedDraft);
  const byId = new Map(
    shells
      .filter((thread) => thread.environmentId === run.environmentId)
      .map((thread) => [thread.id, thread]),
  );
  return {
    ids,
    threads: ids.flatMap((id) => {
      const shell = byId.get(id);
      return shell ? [shell] : [];
    }),
    missing: ids.filter((id) => !byId.has(id)),
    uncertain:
      run.entries.some(
        (entry) => !entry.deleted && (entry.launch === "pending" || entry.launch === "uncertain"),
      ) || Boolean(run.followUp?.pending),
  };
}

/** Sequential execution re-reads membership for every mutation and remembers only successful deletes. */
export async function applyComparisonMembers(input: {
  ids: ReadonlyArray<ThreadId>;
  read: () => Promise<ReturnType<typeof resolveComparisonMembers> | null>;
  eligible: (thread: EnvironmentThreadShell) => boolean;
  apply: (thread: EnvironmentThreadShell, successful: ReadonlySet<ThreadId>) => Promise<void>;
}) {
  const successful = new Set<ThreadId>();
  const failures: Array<{ id: ThreadId; message: string }> = [];
  for (const id of input.ids) {
    try {
      const current = await input.read();
      if (!current) break;
      if (current.uncertain)
        throw new Error("Waiting for comparison send receipts. Retry after they resolve.");
      const thread = current.threads.find((thread) => thread.id === id);
      if (!thread) {
        if (current.ids.includes(id))
          throw new Error("A linked thread is unavailable. Reconnect and retry.");
        continue;
      }
      if (!input.eligible(thread)) continue;
      await input.apply(thread, successful);
      successful.add(id);
    } catch (error) {
      failures.push({ id, message: error instanceof Error ? error.message : "The action failed." });
    }
  }
  return { successful, failures };
}

/** Upper bound only: deletion failures and native dirty-tree policy can retain additional trees. */
export function comparisonCleanupCandidatePaths(
  members: ReadonlyArray<EnvironmentThreadShell>,
  allThreads: ReadonlyArray<EnvironmentThreadShell>,
  projectRoots: ReadonlyArray<string>,
) {
  const normalize = (value: string) => value.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  const ids = new Set(members.map((thread) => thread.id));
  return [
    ...new Set(
      members.flatMap((thread) => (thread.worktreePath ? [normalize(thread.worktreePath)] : [])),
    ),
  ].filter(
    (path) =>
      path &&
      !projectRoots.some(
        (root) => normalize(root) === path || normalize(root).startsWith(`${path}/`),
      ) &&
      !allThreads.some(
        (thread) =>
          !ids.has(thread.id) && thread.worktreePath && normalize(thread.worktreePath) === path,
      ),
  );
}

/** Captures identities and checkout paths covered by one aggregate deletion confirmation. */
export function comparisonDeletionScope(threads: ReadonlyArray<EnvironmentThreadShell>) {
  return JSON.stringify(
    threads.map((thread) => [thread.environmentId, thread.id, thread.worktreePath]).sort(),
  );
}
