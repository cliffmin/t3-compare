import {
  CommandId,
  EventId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  TurnId,
  type OrchestrationCommand,
  type OrchestrationReadModel,
  type OrchestrationThread,
} from "@t3tools/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { decideOrchestrationCommand } from "./decider.ts";

const now = "2026-01-01T00:00:00.000Z";
const targetId = ThreadId.make("target");
const sourceId = ThreadId.make("source");
const turnId = TurnId.make("source-turn");
function thread(id: ThreadId): OrchestrationThread {
  return {
    id,
    projectId: ProjectId.make("project"),
    title: id,
    modelSelection: { instanceId: ProviderInstanceId.make("codex"), model: "test-model" },
    runtimeMode: "approval-required",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    pullRequests: [],
    latestTurn: null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    snoozedUntil: null,
    snoozedAt: null,
    pinnedAt: null,
    pinOrderKey: null,
    deletedAt: null,
    messages: [],
    proposedPlans: [],
    activities: [],
    checkpoints: [],
    session: null,
  };
}
function readModel(): OrchestrationReadModel {
  return {
    snapshotSequence: 0,
    projects: [],
    updatedAt: now,
    threads: [
      thread(targetId),
      {
        ...thread(sourceId),
        latestTurn: {
          turnId,
          state: "completed",
          requestedAt: now,
          startedAt: now,
          completedAt: now,
          assistantMessageId: MessageId.make("answer"),
        },
        messages: [
          {
            id: MessageId.make("original"),
            role: "user",
            text: "original",
            turnId: null,
            streaming: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: MessageId.make("answer"),
            role: "assistant",
            text: "authoritative answer",
            turnId,
            streaming: false,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    ],
  };
}
const command = (): Extract<OrchestrationCommand, { type: "thread.turn.start" }> => ({
  type: "thread.turn.start",
  commandId: CommandId.make("follow-up"),
  threadId: targetId,
  message: {
    messageId: MessageId.make("follow-up-message"),
    role: "user",
    text: "Explain disagreements",
    attachments: [],
  },
  runtimeMode: "approval-required",
  interactionMode: "default",
  createdAt: now,
  comparisonFollowUp: {
    originalPrompt: "original",
    expectedTargetMessageId: null,
    sources: [{ threadId: sourceId, label: "Source", expectedUpdatedAt: now }],
  },
});

it.layer(NodeServices.layer)("comparison turn-start boundary", (it) => {
  it.effect("stores exactly the authoritative expanded user message", () =>
    Effect.gen(function* () {
      const output = yield* decideOrchestrationCommand({
        command: command(),
        readModel: readModel(),
      });
      const events = Array.isArray(output) ? output : [output];
      const message = events.find((event) => event.type === "thread.message-sent");
      expect(message?.payload).toMatchObject({
        text: expect.stringContaining("authoritative answer"),
        role: "user",
      });
      expect(events.some((event) => event.type === "thread.turn-start-requested")).toBe(true);
    }),
  );
  it.effect("leaves ordinary native input unchanged", () =>
    Effect.gen(function* () {
      const { comparisonFollowUp: _context, ...ordinary } = command();
      const output = yield* decideOrchestrationCommand({
        command: ordinary,
        readModel: readModel(),
      });
      const events = Array.isArray(output) ? output : [output];
      expect(events.find((event) => event.type === "thread.message-sent")?.payload).toMatchObject({
        text: ordinary.message.text,
      });
    }),
  );
  it.effect("rejects source changes before persisting a user message", () =>
    Effect.gen(function* () {
      const model = readModel();
      const changed = {
        ...model,
        threads: model.threads.map((value) =>
          value.id === sourceId ? { ...value, updatedAt: "2026-01-01T00:00:01.000Z" } : value,
        ),
      };
      const error = yield* Effect.flip(
        decideOrchestrationCommand({ command: command(), readModel: changed }),
      );
      expect(error.message).toContain("changed before sending");
    }),
  );
  it.effect("rejects a concurrent shared send even before provider adoption", () =>
    Effect.gen(function* () {
      const model = readModel();
      const changed = {
        ...model,
        threads: model.threads.map((value) =>
          value.id === targetId ? { ...value, messages: [model.threads[1]!.messages[0]!] } : value,
        ),
      };
      const error = yield* Effect.flip(
        decideOrchestrationCommand({ command: command(), readModel: changed }),
      );
      expect(error.message).toContain("changed or is processing");
    }),
  );
  it.effect("blocks unresolved approvals even if the provider reports completion", () =>
    Effect.gen(function* () {
      const model = readModel();
      const changed = {
        ...model,
        threads: model.threads.map((value) =>
          value.id === sourceId
            ? {
                ...value,
                activities: [
                  {
                    id: EventId.make("approval"),
                    kind: "approval.requested",
                    summary: "Approve",
                    payload: { requestId: "approval-1" },
                    tone: "info" as const,
                    turnId,
                    createdAt: now,
                  },
                ],
              }
            : value,
        ),
      };
      const error = yield* Effect.flip(
        decideOrchestrationCommand({ command: command(), readModel: changed }),
      );
      expect(error.message).toContain("approval or question");
    }),
  );
});
