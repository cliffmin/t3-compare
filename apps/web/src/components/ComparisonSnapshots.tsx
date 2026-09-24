import { useMemo, useEffect } from "react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { ThreadId } from "@t3tools/contracts";
import { useThread, useThreadStatus } from "../state/entities";
import { useCompareRunStore, type CompareRun } from "../compareRunStore";
import { captureComparisonThread } from "../comparisonSnapshots";

/** Mounted outside the comparison route so navigating into a provider cannot lose completion. */
function CaptureThread({ run, threadId }: { run: CompareRun; threadId: ThreadId }) {
  const ref = useMemo(
    () => scopeThreadRef(run.environmentId, threadId),
    [run.environmentId, threadId],
  );
  const status = useThreadStatus(ref);
  const thread = useThread(ref);
  useEffect(() => {
    if (status === "deleted") {
      useCompareRunStore.getState().updateRun(run.id, (current) =>
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
  }, [run.id, thread, threadId, status]);
  return null;
}

export function ComparisonSnapshots({ run }: { run: CompareRun }) {
  return (
    <>
      {run.entries.map((entry) =>
        entry.threadId &&
        (!entry.original || entry.launch === "pending" || entry.launch === "uncertain") ? (
          <CaptureThread key={entry.threadId} run={run} threadId={entry.threadId} />
        ) : null,
      )}
    </>
  );
}
