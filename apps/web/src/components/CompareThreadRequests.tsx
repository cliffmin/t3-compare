import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@t3tools/client-runtime/state/runtime";
import { useMemo, useRef, useState } from "react";
import type {
  EnvironmentId,
  ThreadId,
  ApprovalRequestId,
  ProviderApprovalDecision,
} from "@t3tools/contracts";
import { derivePendingRequests } from "@t3tools/client-runtime/pending-requests";
import type { Thread } from "../types";
import { threadEnvironment } from "../state/threads";
import { useAtomCommand } from "../state/use-atom-command";
import {
  buildPendingUserInputAnswers,
  derivePendingUserInputProgress,
  setPendingUserInputCustomAnswer,
  togglePendingUserInputOptionSelection,
  type PendingUserInputDraftAnswer,
} from "../pendingUserInput";
import { ComposerPendingApprovalPanel } from "./chat/ComposerPendingApprovalPanel";
import { ComposerPendingApprovalActions } from "./chat/ComposerPendingApprovalActions";
import { ComposerPendingUserInputPanel } from "./chat/ComposerPendingUserInputPanel";
import { Button } from "./ui/button";

/** Native request controls scoped to one environment/thread; no follow-up composer. */
export function CompareThreadRequests({
  thread,
  environmentId,
}: {
  thread: Thread;
  environmentId: EnvironmentId;
}) {
  const requests = useMemo(() => derivePendingRequests(thread.activities), [thread.activities]);
  const requestKey = `${environmentId}:${thread.id}:${requests.approvals[0]?.requestId ?? ""}:${requests.userInputs[0]?.requestId ?? ""}`;
  return (
    <RequestControls
      key={requestKey}
      environmentId={environmentId}
      threadId={thread.id}
      requests={requests}
    />
  );
}
function RequestControls({
  environmentId,
  threadId,
  requests,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  requests: ReturnType<typeof derivePendingRequests>;
}) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const respondApproval = useAtomCommand(threadEnvironment.respondToApproval);
  const respondInput = useAtomCommand(threadEnvironment.respondToUserInput);
  const dismissInput = useAtomCommand(threadEnvironment.dismissUserInput);
  const { error, busy, run } = usePendingRequestAction();
  const [answers, setAnswers] = useState<Record<string, PendingUserInputDraftAnswer>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const approval = requests.approvals[0];
  const question = requests.userInputs[0];
  const progress = question
    ? derivePendingUserInputProgress(question.questions, answers, questionIndex)
    : null;
  const onApproval = (requestId: ApprovalRequestId, decision: ProviderApprovalDecision) =>
    run(() => respondApproval({ environmentId, input: { threadId, requestId, decision } }));
  const advance = () => {
    if (!question || !progress?.canAdvance) return;
    if (!progress.isLastQuestion) {
      setQuestionIndex(progress.questionIndex + 1);
      return;
    }
    const resolved = buildPendingUserInputAnswers(question.questions, answers);
    if (resolved)
      void run(() =>
        respondInput({
          environmentId,
          input: { threadId, requestId: question.requestId, answers: resolved },
        }),
      );
  };
  if (!approval && !question) return null;
  return (
    <div
      ref={scopeRef}
      className="max-h-72 shrink-0 overflow-auto border-t border-border p-3"
      tabIndex={-1}
    >
      {error ? (
        <p role="alert" className="mb-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {approval ? (
        <>
          <ComposerPendingApprovalPanel
            approval={approval}
            pendingCount={requests.approvals.length}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <ComposerPendingApprovalActions
              requestId={approval.requestId}
              options={approval.options}
              isResponding={busy}
              onRespondToApproval={onApproval}
            />
          </div>
        </>
      ) : question && progress ? (
        <>
          <ComposerPendingUserInputPanel
            keyboardScopeRef={scopeRef}
            pendingUserInputs={requests.userInputs}
            respondingRequestIds={busy ? [question.requestId] : []}
            answers={answers}
            questionIndex={questionIndex}
            onToggleOption={(id, value) => {
              const item = question.questions.find((q) => q.id === id);
              if (item)
                setAnswers((current) => ({
                  ...current,
                  [id]: togglePendingUserInputOptionSelection(item, current[id], value),
                }));
            }}
            onAdvance={advance}
            onDismiss={(requestId) =>
              void run(() => dismissInput({ environmentId, input: { threadId, requestId } }))
            }
          />
          {progress.activeQuestion?.allowCustomAnswer !== false && progress.activeQuestion ? (
            <textarea
              aria-label="Answer this question"
              className="mt-2 w-full rounded border p-2 text-sm"
              value={progress.customAnswer}
              disabled={busy}
              onChange={(event) => {
                const id = progress.activeQuestion!.id;
                const value = event.target.value;
                setAnswers((current) => ({
                  ...current,
                  [id]: setPendingUserInputCustomAnswer(current[id], value),
                }));
              }}
            />
          ) : null}
          <div className="mt-2 flex gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={busy || questionIndex === 0}
              onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <Button size="xs" disabled={busy || !progress.canAdvance} onClick={advance}>
              {progress.isLastQuestion ? "Submit answer" : "Next"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Keep failed answers editable and suppress duplicate clicks until a native receipt settles. */
export function usePendingRequestAction() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const run = async (action: () => Promise<AtomCommandResult<unknown, unknown>>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
        const failure = squashAtomCommandFailure(result);
        setError(
          failure instanceof Error ? failure.message : "Could not submit this response. Try again.",
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not submit this response. Try again.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return { error, busy, run };
}
