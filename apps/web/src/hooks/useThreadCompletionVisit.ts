import { useEffect } from "react";
import { useUiStateStore } from "../uiStateStore";

/** Acknowledge visible completions once per route entry, not on passive pane rerenders. */
export function useThreadCompletionVisit(
  threadKey: string | undefined,
  completedAt: string | null | undefined,
  entryKey?: string,
) {
  const markThreadVisited = useUiStateStore((state) => state.markThreadVisited);
  useEffect(() => {
    if (threadKey && completedAt) markThreadVisited(threadKey, completedAt);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Route entry deliberately acknowledges an explicitly unread completion again.
  }, [threadKey, completedAt, entryKey, markThreadVisited]);
}
