import type {
  OrchestrationLatestTurnState,
  OrchestrationMessage,
  OrchestrationSessionStatus,
} from "@t3tools/contracts";

import type { EnvironmentThreadStatus } from "@t3tools/client-runtime/state/threads";

export type CompareColumnStatus =
  | "loading"
  | "running"
  | "completed"
  | "interrupted"
  | "error"
  | "missing";

/**
 * What one column reports while its thread runs on its own worktree.
 *
 * The turn is authoritative over the session: a session can still read
 * `running` for a moment after the turn it was serving completed, and a
 * column that keeps claiming work is in flight is worse here than in a
 * single chat — the whole point of the grid is telling at a glance which
 * providers have finished. `subscriptionStatus` only resolves the cases the
 * turn cannot: no turn yet (still starting) and a deleted thread.
 */
export function resolveCompareColumnStatus(input: {
  subscriptionStatus: EnvironmentThreadStatus;
  latestTurnState: OrchestrationLatestTurnState | null;
  sessionStatus: OrchestrationSessionStatus | null;
}): CompareColumnStatus {
  if (input.subscriptionStatus === "deleted") return "missing";
  if (input.latestTurnState !== null) return input.latestTurnState;
  if (input.sessionStatus === "error") return "error";
  if (input.subscriptionStatus === "empty") return "loading";
  // Subscribed, but the fan-out's turn has not been recorded yet.
  return "running";
}

/**
 * The provider's answer: assistant prose, oldest first.
 *
 * Reasoning and system rows are dropped — they are the provider thinking
 * aloud, not the answer being compared, and their volume varies enough
 * between providers to make the columns unreadable side by side. The full
 * transcript stays one click away in the thread itself.
 */
export function selectAnswerMessages(
  messages: ReadonlyArray<OrchestrationMessage>,
): ReadonlyArray<OrchestrationMessage> {
  return messages.filter((message) => message.role === "assistant" && message.text.trim() !== "");
}

/** Whether a column has nothing to show yet and should render its spinner. */
export function isCompareColumnPending(input: {
  status: CompareColumnStatus;
  answerCount: number;
}): boolean {
  return input.answerCount === 0 && (input.status === "loading" || input.status === "running");
}

export const COMPARE_COLUMN_STATUS_LABEL: Record<CompareColumnStatus, string> = {
  loading: "Starting",
  running: "Working",
  completed: "Done",
  interrupted: "Stopped",
  error: "Failed",
  missing: "Deleted",
};
