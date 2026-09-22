import * as Schema from "effect/Schema";
import {
  wasBootstrapThreadDeleted,
  wasBootstrapThreadNotCreated,
} from "@t3tools/client-runtime/errors";
import { CommandId, MessageId, ThreadId } from "@t3tools/contracts";
import type { StartThreadTurnInput } from "@t3tools/client-runtime/operations";
import { buildMergePrompt, DEFAULT_MERGE_INSTRUCTIONS, snapshotMergeSource } from "./compareMerge";
import {
  type CompareRun,
  CompareRunSchema,
  readDurableComparison,
  saveComparisonClaim,
  useCompareRunStore,
} from "./compareRunStore";

const decodeClaim = Schema.decodeUnknownSync(CompareRunSchema);

export function prepareAutomaticMerge(run: CompareRun, createdAt: string): CompareRun {
  if (run.automatic?.status !== "waiting") return run;
  if (
    run.entries.some(
      (entry) => !entry.original && entry.launch !== "failed" && entry.threadId !== null,
    )
  )
    return run;
  const sources =
    ((run.automatic.attempt ?? 0) > 0 ? run.merges?.at(-1)?.sources : undefined) ??
    run.entries.flatMap((entry, index) => {
      if (
        !entry.threadId ||
        entry.original?.status !== "completed" ||
        run.excludedThreadIds?.includes(entry.threadId)
      )
        return [];
      const text = entry.original.messages.map((message) => message.text).join("\n\n");
      return text.trim()
        ? [
            snapshotMergeSource({
              index,
              label: entry.label ?? entry.instanceId,
              model: entry.model,
              threadId: entry.threadId,
              text,
            }),
          ]
        : [];
    });
  if (sources.length < 2)
    return { ...run, automatic: { ...run.automatic, status: "insufficient" } };
  try {
    const prompt = buildMergePrompt(DEFAULT_MERGE_INSTRUCTIONS, {
      question: run.prompt,
      direction: run.automatic.config.direction,
      sources,
    });
    const identity = `${run.id}:merge:${run.automatic.attempt ?? 0}`;
    const merge = {
      threadId: ThreadId.make(identity),
      commandId: CommandId.make(identity),
      messageId: MessageId.make(`${identity}:message`),
      createdAt,
      modelSelection: run.automatic.config.modelSelection,
      instructions: DEFAULT_MERGE_INSTRUCTIONS,
      direction: run.automatic.config.direction,
      prompt,
      sources,
    };
    return {
      ...run,
      merges: [...(run.merges ?? []), merge],
      automatic: { ...run.automatic, status: "dispatching" },
    };
  } catch (error) {
    return {
      ...run,
      automatic: {
        ...run.automatic,
        status: "failed",
        error: error instanceof Error ? error.message : "Could not prepare merge.",
      },
    };
  }
}

export function automaticMergeCommand(run: CompareRun): StartThreadTurnInput | null {
  const merge = run.merges?.at(-1);
  const base = run.entries.find(
    (entry) => entry.threadId === merge?.sources?.[0]?.threadId,
  )?.original;
  if (!merge?.commandId || !merge.messageId || !merge.prompt || !base) return null;
  return {
    commandId: merge.commandId,
    threadId: merge.threadId,
    createdAt: merge.createdAt,
    message: { messageId: merge.messageId, role: "user", text: merge.prompt, attachments: [] },
    modelSelection: merge.modelSelection,
    titleSeed: "Merged comparison",
    runtimeMode: "approval-required",
    interactionMode: "default",
    bootstrap: {
      createThread: {
        projectId: base.projectId,
        title: "Merged comparison",
        modelSelection: merge.modelSelection,
        runtimeMode: "approval-required",
        interactionMode: "default",
        branch: base.branch,
        worktreePath: base.worktreePath,
        createdAt: merge.createdAt,
      },
    },
  };
}

export const AUTOMATIC_COMPARISON_LABEL = {
  waiting: "Waiting for original answers",
  dispatching: "Sending merge request",
  generating: "Generating merged answer",
  uncertain: "Request status unknown — inspect its thread",
  failed: "Merge failed",
  insufficient: "At least two completed answers needed",
  completed: "Merged answer ready",
} as const;

/** Web Locks serialize tabs. The write-once attempt ledger protects against stale grouping writes. */
export async function dispatchAutomaticComparison(
  runId: string,
  send: (run: CompareRun, input: StartThreadTurnInput) => Promise<void>,
): Promise<void> {
  const fail = (error: string) =>
    useCompareRunStore
      .getState()
      .updateRun(runId, (run) =>
        run.automatic
          ? { ...run, automatic: { ...run.automatic, status: "uncertain", error } }
          : run,
      );
  if (typeof navigator === "undefined" || !navigator.locks) {
    fail("Automatic merging requires browser locking and local storage. No merge was sent.");
    return;
  }
  await navigator.locks
    .request(`t3:comparison:${runId}`, async () => {
      const run = readDurableComparison(runId);
      if (!run) {
        fail(
          "This comparison could not be saved. No merge was sent. Restore browser storage before trying a new comparison.",
        );
        return;
      }
      if (run.automatic?.status !== "waiting") return;
      const ledgerKey = `t3code:comparison-attempt:${runId}:${run.automatic.attempt ?? 0}`;
      try {
        const previous = localStorage.getItem(ledgerKey);
        if (previous) {
          // Restore the exact frozen input rather than recomputing from another tab's snapshots.
          const claimed = decodeClaim(JSON.parse(previous));
          saveComparisonClaim({
            ...claimed,
            automatic: {
              ...claimed.automatic!,
              status: "uncertain",
              error: "A merge request was already prepared. Check its thread before retrying.",
            },
          });
          return;
        }
        const next = prepareAutomaticMerge(run, new Date().toISOString());
        if (next === run) return;
        const input = automaticMergeCommand(next);
        if (next.automatic?.status !== "dispatching" || !input) {
          if (!saveComparisonClaim(next))
            fail("Could not save the comparison state. No merge was sent.");
          return;
        }
        localStorage.setItem(ledgerKey, JSON.stringify(next));
        if (!saveComparisonClaim(next)) {
          fail("Could not save the merge request. No merge was sent.");
          return;
        }
        try {
          await send(next, input);
          useCompareRunStore
            .getState()
            .updateRun(runId, (current) =>
              current.automatic?.status === "dispatching"
                ? { ...current, automatic: { ...current.automatic, status: "generating" } }
                : current,
            );
        } catch (error) {
          if (wasBootstrapThreadDeleted(error) || wasBootstrapThreadNotCreated(error)) {
            useCompareRunStore.getState().updateRun(runId, (current) =>
              current.automatic
                ? {
                    ...current,
                    automatic: {
                      ...current.automatic,
                      status: "failed",
                      error: "The merge could not start. You can retry.",
                    },
                  }
                : current,
            );
          } else
            fail(
              error instanceof Error
                ? error.message
                : "Request delivery is uncertain. Check its thread.",
            );
        }
      } catch {
        fail("Could not save the merge request. No merge was sent.");
      }
    })
    .catch(() => fail("Browser locking is unavailable. No merge was sent."));
}
