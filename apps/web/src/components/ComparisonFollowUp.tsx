import type { StartThreadTurnInput } from "@t3tools/client-runtime/operations";
import {
  settlePromise,
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@t3tools/client-runtime/state/runtime";
import {
  wasBootstrapThreadDeleted,
  wasBootstrapThreadNotCreated,
} from "@t3tools/client-runtime/errors";
import { AsyncResult } from "effect/unstable/reactivity";
import * as Schema from "effect/Schema";
import { useAtomCommand } from "../state/use-atom-command";
import { threadEnvironment } from "../state/threads";
import { randomUUID } from "../lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "@effect/atom-react";
import * as Option from "effect/Option";
import {
  CommandId,
  OrchestrationDispatchCommandError,
  type OrchestrationThread,
} from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { derivePendingRequests } from "@t3tools/client-runtime/pending-requests";
import { comparisonFollowUpBody, comparisonSourceBusy } from "@t3tools/shared/comparisonFollowUp";
import { readDurableComparison, saveComparisonClaim, type CompareRun } from "../compareRunStore";
import { useComposerDraftStore } from "../composerDraftStore";
import {
  comparisonFollowUpDraftIdentity,
  comparisonFollowUpDraftReady,
  ensureComparisonFollowUpDraft,
} from "../comparisonFollowUpDraft";
import { useEnvironmentThread } from "../state/threads";
import { useEnvironment } from "../state/environments";
import { useThread, useThreadShell } from "../state/entities";
import { environmentServerConfigsAtom } from "../state/server";
import ChatView from "./ChatView";
import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";

const isDispatchError = Schema.is(OrchestrationDispatchCommandError);

type SourceState = {
  thread: OrchestrationThread | null;
  waiting: boolean;
  unavailable: boolean;
  missing: boolean;
};

function SourceObserver({
  run,
  index,
  onChange,
}: {
  run: CompareRun;
  index: number;
  onChange: (index: number, state: SourceState) => void;
}) {
  const entry = run.entries[index]!;
  const state = useEnvironmentThread(entry.threadId ? run.environmentId : null, entry.threadId);
  const ref = useMemo(
    () => (entry.threadId ? scopeThreadRef(run.environmentId, entry.threadId) : null),
    [run.environmentId, entry.threadId],
  );
  const thread = useThread(ref);
  const environment = useEnvironment(run.environmentId);
  const connected = environment?.connection.phase === "connected";
  useEffect(() => {
    const deleted = entry.deleted || state.status === "deleted";
    const launching = connected && entry.launch === "pending" && !deleted;
    const missing = connected && !launching && Option.isSome(state.error);
    const requests = thread ? derivePendingRequests(thread.activities) : null;
    onChange(index, {
      thread: deleted || missing ? null : thread,
      missing,
      unavailable: Boolean(
        entry.threadId &&
        !deleted &&
        !missing &&
        (!connected || (!launching && state.status !== "live")),
      ),
      waiting:
        launching ||
        Boolean(
          !deleted &&
          !missing &&
          thread &&
          (comparisonSourceBusy(thread) ||
            requests?.approvals.length ||
            requests?.userInputs.length),
        ),
    });
  }, [connected, entry.deleted, entry.launch, entry.threadId, index, onChange, state, thread]);
  return null;
}

export function ComparisonFollowUp({
  run,
  active,
  onActivate,
}: {
  run: CompareRun;
  active: boolean;
  onActivate: () => void;
}) {
  const [sources, setSources] = useState<Record<number, SourceState>>({});
  const startTurn = useAtomCommand(threadEnvironment.startTurn, { reportFailure: false });
  const [retrying, setRetrying] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const onSource = useCallback((index: number, state: SourceState) => {
    setSources((previous) => {
      const old = previous[index];
      return old?.thread === state.thread &&
        old.waiting === state.waiting &&
        old.unavailable === state.unavailable &&
        old.missing === state.missing
        ? previous
        : { ...previous, [index]: state };
    });
  }, []);
  // A comparison reserves one native destination before any network mutation.
  // The deterministic identity also converges when two tabs first open together.
  const { threadId, draftId } = comparisonFollowUpDraftIdentity(run);
  const ref = useMemo(
    () => scopeThreadRef(run.environmentId, threadId),
    [run.environmentId, threadId],
  );
  const shell = useThreadShell(ref);
  const target = useEnvironmentThread(shell ? run.environmentId : null, shell ? threadId : null);
  const targetThread = useThread(shell ? ref : null);
  const configs = useAtomValue(environmentServerConfigsAtom);
  const supported =
    configs.get(run.environmentId)?.environment.capabilities.comparisonFollowUp === true;
  const draft = useComposerDraftStore((state) => state.draftThreadsByThreadKey[draftId]);
  useEffect(() => {
    if (!run.projectId || run.followUp?.deleted) return;
    const durable = readDurableComparison(run.id);
    if (
      !durable ||
      (!durable.followUp && !saveComparisonClaim({ ...durable, followUp: { threadId, draftId } }))
    ) {
      setStorageError(
        "Save this comparison locally before starting a follow-up. Storage is unavailable.",
      );
      return;
    }
    ensureComparisonFollowUpDraft(durable, Boolean(shell));
  }, [
    draft,
    draftId,
    run.environmentId,
    run.id,
    run.projectId,
    run.followUp?.pending,
    run.followUp?.deleted,
    shell,
    threadId,
  ]);
  const pending = run.followUp?.pending;
  const sendSaved = async (
    input: StartThreadTurnInput,
  ): Promise<AtomCommandResult<{ sequence: number }, unknown>> => {
    const result = await startTurn({ environmentId: run.environmentId, input });
    const failure = result._tag === "Failure" ? squashAtomCommandFailure(result) : null;
    // A transport failure does not prove rejection. Keep the exact command for
    // explicit receipt-backed retry instead of minting a second turn.
    const rejected =
      isDispatchError(failure) &&
      (!input.bootstrap ||
        wasBootstrapThreadDeleted(failure) ||
        wasBootstrapThreadNotCreated(failure) ||
        String(failure.message).toLowerCase().includes("previously rejected"));
    if (result._tag === "Success" || rejected) {
      const current = readDurableComparison(run.id);
      if (
        current?.followUp &&
        input.commandId &&
        current.followUp.pending?.commandId === input.commandId
      ) {
        const { pending: _pending, ...followUp } = current.followUp;
        saveComparisonClaim({ ...current, followUp });
      }
    }
    return result;
  };
  const dispatch = async (
    input: StartThreadTurnInput,
  ): Promise<AtomCommandResult<{ sequence: number }, unknown>> => {
    const claimed = await settlePromise(async () => {
      if (!navigator.locks) throw new Error("Browser locking is unavailable. Your draft was kept.");
      return navigator.locks.request(`t3:comparison-follow-up:${run.id}`, () => {
        const current = readDurableComparison(run.id);
        if (!current?.followUp || current.followUp.pending)
          throw new Error(
            "A follow-up is already being sent. Check its delivery before sending again.",
          );
        const command = {
          ...input,
          type: "thread.turn.start" as const,
          commandId: CommandId.make(randomUUID()),
          createdAt: input.createdAt ?? new Date().toISOString(),
        };
        if (
          !saveComparisonClaim({ ...current, followUp: { ...current.followUp, pending: command } })
        )
          throw new Error("Could not save follow-up delivery. Your draft was kept.");
        return command;
      });
    });
    if (claimed._tag === "Failure") return AsyncResult.failure(claimed.cause);
    return sendSaved(claimed.value);
  };
  useEffect(() => {
    if (pending?.type !== "thread.turn.start") return;
    const thread = Option.getOrNull(target.data);
    if (!thread?.messages.some((message) => message.id === pending.message.messageId)) return;
    const current = readDurableComparison(run.id);
    if (current?.followUp?.pending?.commandId !== pending.commandId) return;
    const { pending: _pending, ...followUp } = current.followUp;
    saveComparisonClaim({ ...current, followUp });
  }, [pending, run.id, target.data]);
  const waiting = run.entries.some((_, index) => sources[index]?.waiting);
  const unavailable = run.entries.some(
    (_, index) => !sources[index] || sources[index]?.unavailable,
  );
  const sourceThreads = Object.values(sources).flatMap((source) =>
    source.thread ? [source.thread] : [],
  );
  const context = {
    originalPrompt: run.prompt,
    expectedTargetMessageId:
      targetThread?.messages.findLast((message) => message.role === "user")?.id ?? null,
    sources: run.entries.map((entry, index) => ({
      threadId: entry.threadId,
      label: entry.label ?? entry.instanceId,
      expectedUpdatedAt: sources[index]?.thread?.updatedAt ?? null,
      ...(sources[index]?.missing ? { unavailable: true } : {}),
    })),
  };
  const preview = run.projectId
    ? comparisonFollowUpBody({
        context,
        instruction: "",
        target: { id: threadId, projectId: run.projectId },
        threads: sourceThreads,
      })
    : null;
  const targetBusy = Boolean(targetThread && comparisonSourceBusy(targetThread));
  const disabledReason =
    storageError ??
    (pending
      ? "Checking previous follow-up delivery. Your draft is kept."
      : targetBusy
        ? "The follow-up is processing."
        : null) ??
    (!run.projectId
      ? "The comparison project is unavailable."
      : !supported
        ? "Reconnect to an environment that supports comparison follow-ups."
        : unavailable
          ? "Reconnecting to source threads. Wait for their current state."
          : waiting
            ? "Waiting for providers"
            : (preview?.error ?? null));
  if (run.followUp?.deleted)
    return (
      <section
        aria-label="Comparison follow-up"
        className="border-t p-3 text-sm text-muted-foreground"
      >
        Shared conversation deleted.
      </section>
    );
  return (
    <section
      className="flex min-h-0 shrink-0 flex-col border-t border-border bg-background"
      aria-label="Comparison follow-up"
    >
      {run.entries.map((entry, index) => (
        <SourceObserver key={entry.threadId ?? index} run={run} index={index} onChange={onSource} />
      ))}
      {shell && (targetThread?.messages.length ?? 0) > 0 ? (
        <Link
          to="/$environmentId/$threadId"
          params={{ environmentId: run.environmentId, threadId }}
          className="self-end px-3 pt-2"
          aria-label="Open follow-up thread"
        >
          <ArrowUpRightIcon className="size-4" />
        </Link>
      ) : null}
      {pending?.type === "thread.turn.start" ? (
        <button
          type="button"
          className="self-start px-4 py-2 text-xs underline"
          disabled={retrying || targetBusy || !supported}
          onClick={async () => {
            setRetrying(true);
            try {
              const result = await sendSaved(pending);
              if (result._tag === "Failure")
                setDeliveryError(String(squashAtomCommandFailure(result)));
              else setDeliveryError(null);
            } finally {
              setRetrying(false);
            }
          }}
        >
          Check / retry the same delivery
        </button>
      ) : null}
      {deliveryError ? (
        <p role="alert" className="px-4 text-xs text-destructive">
          {deliveryError}
        </p>
      ) : null}
      {disabledReason && !waiting ? (
        <p role="status" className="px-4 pb-2 text-xs text-muted-foreground">
          {disabledReason}
        </p>
      ) : null}
      {preview?.missing ? (
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          {preview.missing} source answer{preview.missing === 1 ? " is" : "s are"} missing.
          Available completed answers will be included.
        </p>
      ) : null}
      {shell || comparisonFollowUpDraftReady(run, draft) ? (
        <ChatView
          {...(shell ? { routeKind: "server" as const } : { routeKind: "draft" as const, draftId })}
          environmentId={run.environmentId}
          threadId={threadId}
          embedded={{
            active,
            onActivate,
            followUp: {
              dispatch,
              sourceCount: run.entries.length,
              waiting,
              disabledReason,
              prepare: (instruction) => {
                if (disabledReason || !run.projectId)
                  return { error: disabledReason ?? "Missing project." };
                const result = comparisonFollowUpBody({
                  context,
                  instruction,
                  target: { id: threadId, projectId: run.projectId },
                  threads: sourceThreads,
                });
                return result.error !== undefined
                  ? { error: result.error }
                  : { context, text: result.text };
              },
            },
          }}
        />
      ) : null}
    </section>
  );
}
