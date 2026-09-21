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
  >,
): CompareRun {
  const original = originalComparisonTurn(thread);
  if (
    !original.state ||
    original.state === "running" ||
    original.messages.some((message) => message.streaming)
  )
    return run;
  const status = original.state;
  const entry = run.entries.find((entry) => entry.threadId === thread.id);
  if (entry && !entry.original) {
    return {
      ...run,
      projectId: run.projectId ?? thread.projectId,
      entries: run.entries.map((candidate) =>
        candidate === entry
          ? {
              ...candidate,
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
  if (!merge || merge.output || merge.startError || status !== "completed") return run;
  const input = readMergeInput(
    thread.messages.find((message) => message.role === "user")?.text ?? "",
  );
  const answer = original.messages.map((message) => message.text).join("\n\n");
  if (!input || !answer.trim()) return run;
  return {
    ...run,
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
