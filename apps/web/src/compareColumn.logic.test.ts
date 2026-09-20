import { describe, expect, it } from "vite-plus/test";
import { MessageId, type OrchestrationMessage } from "@t3tools/contracts";

import {
  COMPARE_COLUMN_STATUS_LABEL,
  isCompareColumnPending,
  resolveCompareColumnStatus,
  selectAnswerMessages,
  type CompareColumnStatus,
} from "./compareColumn.logic";

function message(overrides: Partial<OrchestrationMessage>): OrchestrationMessage {
  return {
    id: MessageId.make("m1"),
    role: "assistant",
    text: "answer",
    turnId: null,
    streaming: false,
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    ...overrides,
  } as OrchestrationMessage;
}

describe("compare column status", () => {
  it("prefers the turn state over a session that still reads running", () => {
    expect(
      resolveCompareColumnStatus({
        subscriptionStatus: "live",
        latestTurnState: "completed",
        sessionStatus: "running",
      }),
    ).toBe("completed");
  });

  it("reports a deleted thread as missing whatever the last turn said", () => {
    expect(
      resolveCompareColumnStatus({
        subscriptionStatus: "deleted",
        latestTurnState: "completed",
        sessionStatus: "idle",
      }),
    ).toBe("missing");
  });

  it("treats a subscribed thread with no turn yet as still working", () => {
    expect(
      resolveCompareColumnStatus({
        subscriptionStatus: "synchronizing",
        latestTurnState: null,
        sessionStatus: "starting",
      }),
    ).toBe("running");
  });

  it("surfaces a session error when no turn was ever recorded", () => {
    expect(
      resolveCompareColumnStatus({
        subscriptionStatus: "live",
        latestTurnState: null,
        sessionStatus: "error",
      }),
    ).toBe("error");
  });

  it("stays loading until the subscription carries anything", () => {
    expect(
      resolveCompareColumnStatus({
        subscriptionStatus: "empty",
        latestTurnState: null,
        sessionStatus: null,
      }),
    ).toBe("loading");
  });
});

describe("compare column labels", () => {
  it("labels every status, including a provider that never started", () => {
    const statuses: ReadonlyArray<CompareColumnStatus> = [
      "loading",
      "running",
      "completed",
      "interrupted",
      "error",
      "missing",
      "not-started",
    ];
    for (const status of statuses) {
      expect(COMPARE_COLUMN_STATUS_LABEL[status]).toBeTruthy();
    }
    expect(COMPARE_COLUMN_STATUS_LABEL["not-started"]).toBe("Never started");
  });
});

describe("compare column answers", () => {
  it("keeps assistant prose and drops reasoning, system, and user rows", () => {
    const messages = [
      message({ id: MessageId.make("m1"), role: "user", text: "the prompt" }),
      message({ id: MessageId.make("m2"), role: "reasoning", text: "thinking out loud" }),
      message({ id: MessageId.make("m3"), role: "system", text: "a notice" }),
      message({ id: MessageId.make("m4"), role: "assistant", text: "the answer" }),
    ];
    expect(selectAnswerMessages(messages).map((entry) => entry.id)).toEqual(["m4"]);
  });

  it("ignores an empty assistant row so a streaming placeholder is not an answer", () => {
    expect(selectAnswerMessages([message({ text: "   " })])).toEqual([]);
  });
});

describe("compare column pending", () => {
  it("is pending while running with nothing to show", () => {
    expect(isCompareColumnPending({ status: "running", answerCount: 0 })).toBe(true);
  });

  it("stops being pending as soon as the first answer lands", () => {
    expect(isCompareColumnPending({ status: "running", answerCount: 1 })).toBe(false);
  });

  it("is not pending when a failed column has no answer to show", () => {
    expect(isCompareColumnPending({ status: "error", answerCount: 0 })).toBe(false);
  });
});
