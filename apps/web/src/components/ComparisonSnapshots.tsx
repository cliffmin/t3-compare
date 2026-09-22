import { dispatchAutomaticComparison } from "../automaticComparison";
import { threadEnvironment } from "../state/threads";
import { useAtomCommand } from "../state/use-atom-command";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { useEffect } from "react";
import * as Option from "effect/Option";
import type { ThreadId } from "@t3tools/contracts";
import { useEnvironmentThread } from "../state/threads";
import { useCompareRunStore, type CompareRun } from "../compareRunStore";
import { captureComparisonThread } from "../comparisonSnapshots";

/** Mounted outside the comparison route so navigating into a provider cannot lose completion. */
function CaptureThread({ run, threadId }: { run: CompareRun; threadId: ThreadId }) {
  const state = useEnvironmentThread(run.environmentId, threadId);
  const thread = Option.getOrNull(state.data);
  useEffect(() => {
    if (state.status === "deleted") {
      useCompareRunStore
        .getState()
        .updateRun(run.id, (current) =>
          current.entries.some(
            (entry) => entry.threadId === threadId && !entry.original && entry.launch !== "failed",
          )
            ? {
                ...current,
                entries: current.entries.map((entry) =>
                  entry.threadId === threadId && !entry.original
                    ? { ...entry, launch: "failed" }
                    : entry,
                ),
              }
            : current,
        );
      return;
    }
    if (thread)
      useCompareRunStore
        .getState()
        .updateRun(run.id, (current) => captureComparisonThread(current, thread));
  }, [run.id, thread, threadId, state.status]);
  return null;
}

export function ComparisonSnapshots({ run }: { run: CompareRun }) {
  const startTurn = useAtomCommand(threadEnvironment.startTurn);
  useEffect(() => {
    if (run.automatic?.status !== "waiting") return;
    void dispatchAutomaticComparison(run.id, async (claimed, input) => {
      const result = await startTurn({ environmentId: claimed.environmentId, input });
      if (result._tag === "Failure") throw squashAtomCommandFailure(result);
    });
  }, [run, startTurn]);
  return (
    <>
      {run.entries.map((entry) =>
        entry.threadId && !entry.original ? (
          <CaptureThread key={entry.threadId} run={run} threadId={entry.threadId} />
        ) : null,
      )}
      {run.merges?.map((merge) =>
        !merge.output && !merge.startError ? (
          <CaptureThread key={merge.threadId} run={run} threadId={merge.threadId} />
        ) : null,
      )}
    </>
  );
}
