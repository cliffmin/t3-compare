import { useNavigate } from "@tanstack/react-router";
import * as Option from "effect/Option";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { CompareRun } from "../compareRunStore";
import { useEnvironmentThread } from "../state/threads";
import { originalComparisonTurn } from "../compareColumn.logic";
import { comparisonSelectionSummary } from "../compareProviders";
import { readMergeInput } from "../compareMerge";
import ChatMarkdown from "./ChatMarkdown";

/** Historical records are deliberately read-only. Mounting this view cannot send a turn. */
export function CompareMergeView({
  run,
  initialMergeId,
}: {
  run: CompareRun;
  initialMergeId?: string | undefined;
}) {
  const navigate = useNavigate();
  const merge = run.merges?.find((item) => item.threadId === initialMergeId) ?? run.merges?.at(-1);
  const state = useEnvironmentThread(run.environmentId, merge?.threadId ?? null);
  const thread = Option.getOrNull(state.data);
  const answer =
    merge?.output?.answer ??
    (thread
      ? originalComparisonTurn(thread)
          .messages.map((message) => message.text)
          .join("\n\n")
      : "");
  const sources =
    merge?.output?.sources ??
    merge?.sources ??
    (merge?.prompt ? readMergeInput(merge.prompt)?.sources : undefined) ??
    [];
  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 p-4" aria-label="Saved merged results">
      <h2 className="text-lg font-medium">Saved merged results</h2>
      <p className="text-sm text-muted-foreground">
        Read-only history. New merges and retries are disabled; earlier records are preserved.
      </p>
      {merge ? (
        <>
          <label className="block text-xs">
            Saved result
            <select
              className="ml-2 max-w-full rounded border p-1"
              value={merge.threadId}
              onChange={(event) =>
                void navigate({
                  to: "/compare/$runId",
                  params: { runId: run.id },
                  search: { tab: "merged", merge: event.target.value },
                })
              }
            >
              {run.merges?.map((item) => (
                <option key={item.threadId} value={item.threadId}>
                  {item.output?.title ?? item.createdAt} · {item.modelSelection.model}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {comparisonSelectionSummary(merge.modelSelection)}
          </p>
          {answer ? (
            <ChatMarkdown
              cwd={undefined}
              text={answer}
              threadRef={scopeThreadRef(run.environmentId, merge.threadId)}
            />
          ) : (
            <p>
              {merge.startError ??
                "No saved answer is available. This historical request will not be restarted."}
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-sm">
              Captured source passages ({sources.length})
            </summary>
            {sources.map((source) => (
              <div key={source.id} className="my-3 rounded border p-3">
                <p className="text-xs text-muted-foreground">
                  {source.label} · {source.model}
                </p>
                <ChatMarkdown
                  cwd={undefined}
                  text={source.passages.map((passage) => passage.text).join("\n\n")}
                />
              </div>
            ))}
          </details>
        </>
      ) : (
        <p>No merged result was saved. This earlier pending comparison will not create one.</p>
      )}
    </section>
  );
}
