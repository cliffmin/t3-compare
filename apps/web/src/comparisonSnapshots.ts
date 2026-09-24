import type { OrchestrationThread } from "@t3tools/contracts";
import type { CompareRun } from "./compareRunStore";
import { comparisonFallbackTitle, originalComparisonTurn } from "./compareColumn.logic";
import { readMergeInput } from "./compareMerge";

/** Freeze only settled original turns; saved provenance never follows mutable session state. */
export function captureComparisonThread(
  run: CompareRun,
  thread: Pick<
    OrchestrationThread,
    | "id"
    | "messages"
    | "latestTurn"
    | "projectId"
    | "branch"
    | "worktreePath"
    | "title"
    | "titleState"
  > &
    Partial<Pick<OrchestrationThread, "session" | "pendingTurnStartMessageId">>,
): CompareRun {
  const original = originalComparisonTurn(thread);
  if (
    // An interrupt request may mark the turn before its final partial text is flushed.
    (thread.session?.status === "running" &&
      thread.session.activeTurnId === thread.latestTurn?.turnId) ||
    !original.state ||
    original.state === "running" ||
    original.messages.some((message) => message.streaming)
  )
    return run;
  const status = original.state;
  const entry = run.entries.find((entry) => entry.threadId === thread.id);
  // A navigation can outlive the local start callback. The native settled
  // original request is evidence of launch even when its callback never landed.
  const reconciledLaunch =
    entry &&
    !entry.deleted &&
    (entry.launch === "pending" || entry.launch === "uncertain") &&
    entry.initialMessageId !== undefined &&
    thread.messages.find((message) => message.role === "user")?.id === entry.initialMessageId &&
    status !== "unverified" &&
    thread.pendingTurnStartMessageId === null &&
    thread.session?.status !== "running" &&
    thread.session?.status !== "starting";
  if (entry?.original && reconciledLaunch) {
    return {
      ...run,
      entries: run.entries.map((candidate) =>
        candidate === entry ? { ...candidate, launch: "started" } : candidate,
      ),
    };
  }
  if (entry && !entry.original) {
    return {
      ...run,
      projectId: run.projectId ?? thread.projectId,
      entries: run.entries.map((candidate) =>
        candidate === entry
          ? {
              ...candidate,
              ...(reconciledLaunch ? { launch: "started" as const } : {}),
              original: {
                messages: original.messages,
                status,
                projectId: thread.projectId,
                branch: thread.branch,
                worktreePath: thread.worktreePath,
              },
            }
          : candidate,
      ),
    };
  }
  const merge = run.merges?.find((merge) => merge.threadId === thread.id);
  if (!merge || merge.output) return run;
  const currentAttempt =
    run.automatic && merge.threadId === `${run.id}:merge:${run.automatic.attempt ?? 0}`;
  if (
    run.automatic &&
    currentAttempt &&
    (status === "error" || status === "interrupted" || status === "unverified")
  ) {
    if (run.automatic.status === "failed") return run;
    return {
      ...run,
      automatic: {
        ...run.automatic,
        status: status === "unverified" ? "uncertain" : "failed",
        error: status === "interrupted" ? "Merge stopped." : "Merge did not complete.",
      },
    };
  }
  if (merge.startError || status !== "completed") return run;
  const input = readMergeInput(
    thread.messages.find((message) => message.role === "user")?.text ?? "",
  );
  const answer = original.messages.map((message) => message.text).join("\n\n");
  if (!input || !answer.trim())
    return run.automatic && currentAttempt
      ? {
          ...run,
          automatic: {
            ...run.automatic,
            status: "failed",
            error: "The merger completed without a usable answer.",
          },
        }
      : run;
  return {
    ...run,
    ...(run.automatic && currentAttempt
      ? { automatic: { ...run.automatic, status: "completed" as const } }
      : {}),
    merges: (run.merges ?? []).map((candidate) =>
      candidate === merge
        ? {
            ...candidate,
            output: {
              title:
                thread.titleState?.source === "generated"
                  ? thread.title
                  : comparisonFallbackTitle(run.prompt),
              answer,
              sources: input.sources,
            },
          }
        : candidate,
    ),
  };
}
