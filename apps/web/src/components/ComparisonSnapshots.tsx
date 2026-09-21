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
    if (thread)
      useCompareRunStore
        .getState()
        .updateRun(run.id, (current) => captureComparisonThread(current, thread));
  }, [run.id, thread]);
  return null;
}

export function ComparisonSnapshots({ run }: { run: CompareRun }) {
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
