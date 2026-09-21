import { useMemo, useRef, useState } from "react";
import type { ModelSelection, ProjectId, ThreadId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import * as Option from "effect/Option";
import { useNavigate } from "@tanstack/react-router";
import { useCompareRunStore, type CompareMerge, type CompareRun } from "../compareRunStore";
import {
  selectMergeSources,
  buildMergePrompt,
  DEFAULT_MERGE_INSTRUCTIONS,
  labelMergeCitations,
  readMergeInput,
  type MergeSource,
} from "../compareMerge";
import { selectComparisonModels, comparisonSelectionSummary } from "../compareProviders";
import type { ProviderInstanceEntry } from "../providerInstances";
import { isProviderInstancePickerReady } from "../providerInstances";
import { getAppModelOptionsForInstance } from "../modelSelection";
import { useEnvironmentSettings } from "../hooks/useSettings";
import { newMessageId, newThreadId } from "../lib/utils";
import { threadEnvironment, useEnvironmentThread } from "../state/threads";
import { useAtomCommand } from "../state/use-atom-command";
import {
  resolveCompareColumnStatus,
  originalComparisonTurn,
  COMPARE_COLUMN_STATUS_LABEL,
} from "../compareColumn.logic";
import { ProviderModelPicker } from "./chat/ProviderModelPicker";
import { ComparisonProviderOptions } from "./chat/ComparisonProviderOptions";
import { getComposerProviderState } from "./chat/composerProviderState";
import ChatMarkdown from "./ChatMarkdown";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogPopup, DialogTitle } from "./ui/dialog";

export interface CompareSourceState {
  source: MergeSource;
  status: string;
  projectId: ProjectId;
  branch: string | null;
  worktreePath: string | null;
}

export function CompareMergeView({
  run,
  entries,
  sources,
  included,
  setupOpen,
  onSetupOpenChange,
  initialMergeId,
}: {
  run: CompareRun;
  initialMergeId?: string | undefined;
  entries: ReadonlyArray<ProviderInstanceEntry>;
  sources: ReadonlyArray<CompareSourceState>;
  included: Readonly<Record<string, boolean>>;
  setupOpen: boolean;
  onSetupOpenChange: (open: boolean) => void;
}) {
  const settings = useEnvironmentSettings(run.environmentId);
  const navigate = useNavigate();
  const startTurn = useAtomCommand(threadEnvironment.startTurn, { reportFailure: false });
  const latestMerge =
    run.merges?.find((merge) => merge.threadId === initialMergeId) ?? run.merges?.at(-1);
  const merge = latestMerge;
  const setMergeId = (threadId: ThreadId) => {
    void navigate({
      to: "/compare/$runId",
      params: { runId: run.id },
      search: { tab: "merged", merge: threadId },
    });
  };
  const [chosen, setChosen] = useState<ModelSelection | null>(latestMerge?.modelSelection ?? null);
  const [instructions, setInstructions] = useState(
    latestMerge?.instructions ?? DEFAULT_MERGE_INSTRUCTIONS,
  );
  const [direction, setDirection] = useState(latestMerge?.direction ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [passageId, setPassageId] = useState<string | null>(null);
  const modelOptions = useMemo(
    () =>
      new Map(
        entries.map((entry) => [
          entry.instanceId,
          getAppModelOptionsForInstance(settings, entry, null),
        ]),
      ),
    [entries, settings],
  );
  const defaults = useMemo(
    () => selectComparisonModels(entries, modelOptions, () => null),
    [entries, modelOptions],
  );
  const selection = chosen ?? defaults[0] ?? null;
  const provider = entries.find((entry) => entry.instanceId === selection?.instanceId);
  const validSelection =
    provider &&
    isProviderInstancePickerReady(provider) &&
    modelOptions
      .get(provider.instanceId)
      ?.some((model) => model.slug === selection?.model && !model.isUnavailable);
  const eligible = selectMergeSources(sources, included);
  const mergedThread = useEnvironmentThread(run.environmentId, merge?.threadId ?? null);
  const thread = Option.getOrNull(mergedThread.data);
  const original = thread ? originalComparisonTurn(thread) : null;
  const answer =
    merge?.output?.answer ?? (original?.messages ?? []).map((message) => message.text).join("\n\n");
  const savedMergePrompt = thread?.messages.find((message) => message.role === "user")?.text ?? "";
  const parsedInput = useMemo(() => readMergeInput(savedMergePrompt), [savedMergePrompt]);
  const snapshot = merge?.output ?? parsedInput;
  const text = useMemo(
    () => labelMergeCitations(answer, snapshot?.sources ?? []),
    [answer, snapshot],
  );
  const originalState = original?.state;
  const status = merge?.output
    ? "completed"
    : merge?.startError && !thread?.latestTurn
      ? "error"
      : originalState === "unverified"
        ? "unverified"
        : resolveCompareColumnStatus({
            subscriptionStatus: mergedThread.status,
            latestTurnState: originalState ?? null,
            sessionStatus: thread?.session?.status ?? null,
          });
  const busy = sending || (merge !== undefined && (status === "running" || status === "loading"));
  const citationSource = snapshot?.sources.find((source) =>
    source.passages.some((passage) => passage.id === passageId),
  );
  const citationPassage = citationSource?.passages.find((passage) => passage.id === passageId);

  function saveMerge(value: CompareMerge) {
    const store = useCompareRunStore.getState();
    const current = store.getRun(run.id);
    if (current)
      store.recordRun({
        ...current,
        merges: [
          ...(current.merges ?? []).filter((item) => item.threadId !== value.threadId),
          value,
        ],
      });
  }

  async function generate() {
    if (sendingRef.current || busy || !selection || !provider || !validSelection) return;
    let prompt: string;
    try {
      prompt = buildMergePrompt(instructions, {
        question: run.prompt,
        direction,
        sources: eligible.map((item) => item.source),
        ...(answer ? { previousAnswer: answer } : {}),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare merge.");
      return;
    }
    const base = eligible[0]!;
    const options = getComposerProviderState({
      provider: provider.driverKind,
      model: selection.model,
      models: provider.models,
      modelOptions: selection.options,
      planModeEnabled: settings.planModeEnabled,
    }).modelOptionsForDispatch;
    const modelSelection = createModelSelection(selection.instanceId, selection.model, options);
    const threadId = newThreadId();
    const createdAt = new Date().toISOString();
    const record: CompareMerge = { threadId, createdAt, modelSelection, instructions, direction };
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setCopied(false);
    setMergeId(threadId);
    saveMerge(record);
    onSetupOpenChange(false);
    try {
      const result = await startTurn({
        environmentId: run.environmentId,
        input: {
          threadId,
          message: { messageId: newMessageId(), role: "user", text: prompt, attachments: [] },
          modelSelection,
          titleSeed: "Merged comparison",
          runtimeMode: "approval-required",
          interactionMode: "default",
          bootstrap: {
            createThread: {
              projectId: base.projectId,
              title: "Merged comparison",
              modelSelection,
              runtimeMode: "approval-required",
              interactionMode: "default",
              branch: base.branch,
              worktreePath: base.worktreePath,
              createdAt,
            },
          },
          createdAt,
        },
      });
      if (result._tag === "Failure") throw squashAtomCommandFailure(result);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Could not start the merge. Check its thread before retrying.";
      saveMerge({ ...record, startError: message });
      setError(message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      {setupOpen || !merge ? (
        <section
          className="mx-auto mb-5 flex w-full max-w-3xl flex-col gap-3 rounded-lg border border-border p-4"
          aria-label="Merge setup"
        >
          <div>
            <h2 className="text-sm font-semibold">Merge best answer</h2>
            <p className="text-xs text-muted-foreground">
              Infer the goal from your question and combine the included answers. {eligible.length}{" "}
              completed answers included.
            </p>
          </div>
          {selection ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs">Merge with</span>
              <ProviderModelPicker
                activeInstanceId={selection.instanceId}
                model={selection.model}
                lockedProvider={null}
                instanceEntries={entries}
                modelOptionsByInstance={modelOptions}
                disabled={busy}
                onInstanceModelChange={(instanceId, model) =>
                  setChosen(createModelSelection(instanceId, model))
                }
              />
            </div>
          ) : (
            <p className="text-sm text-destructive">
              No ready provider. Check Settings → Providers.
            </p>
          )}
          {provider && selection ? (
            <ComparisonProviderOptions
              entry={provider}
              selection={selection}
              planModeEnabled={settings.planModeEnabled}
              onChange={setChosen}
            />
          ) : null}
          <label className="flex flex-col gap-1 text-xs">
            Additional direction (optional)
            <Textarea
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              placeholder="For example: make this a proposal for my implementation agent."
              disabled={busy}
            />
          </label>
          <details>
            <summary className="cursor-pointer text-xs">Review merge instructions</summary>
            <label className="mt-2 flex flex-col gap-1 text-xs">
              Instructions
              <Textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                disabled={busy}
              />
            </label>
          </details>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => void generate()}
              disabled={busy || eligible.length < 2 || !validSelection || !instructions.trim()}
            >
              Generate merged answer
            </Button>
            {merge ? (
              <Button size="sm" variant="ghost" onClick={() => onSetupOpenChange(false)}>
                Cancel
              </Button>
            ) : null}
            {eligible.length < 2 ? (
              <span className="text-xs text-muted-foreground">
                Include at least two completed answers in Compare.
              </span>
            ) : null}
          </div>
        </section>
      ) : null}
      {error ? (
        <p role="alert" className="mx-auto mb-3 w-full max-w-3xl text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {merge ? (
        <section className="mx-auto w-full max-w-3xl" aria-label="Merged answer">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">
                Merged by{" "}
                {entries.find((entry) => entry.instanceId === merge.modelSelection.instanceId)
                  ?.displayName ?? merge.modelSelection.instanceId}
              </h2>
              <p className="text-xs text-muted-foreground">
                {comparisonSelectionSummary(merge.modelSelection)} ·{" "}
                {COMPARE_COLUMN_STATUS_LABEL[status]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(run.merges?.length ?? 0) > 1 ? (
                <label className="text-xs">
                  Version{" "}
                  <select
                    className="rounded border border-border bg-background p-1"
                    value={merge.threadId}
                    disabled={busy}
                    onChange={(event) => {
                      const found = run.merges?.find(
                        (item) => item.threadId === event.target.value,
                      );
                      if (found) {
                        setMergeId(found.threadId);
                        setCopied(false);
                      }
                    }}
                  >
                    {run.merges?.map((item, index) => (
                      <option key={item.threadId} value={item.threadId}>
                        Merge {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Button
                size="xs"
                variant="outline"
                disabled={!answer}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(text.replace(/\[([^\]]+)\]\(#source-[^)]+\)/g, "[$1]"))
                    .then(
                      () => setCopied(true),
                      () => setError("Could not copy the answer."),
                    )
                }
              >
                {copied ? "Copied" : "Copy answer"}
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setInstructions(merge.instructions);
                  setDirection(merge.direction);
                  setChosen(merge.modelSelection);
                  onSetupOpenChange(true);
                }}
              >
                Refine merge
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  void navigate({
                    to: "/$environmentId/$threadId",
                    params: { environmentId: run.environmentId, threadId: merge.threadId },
                  })
                }
              >
                Open thread
              </Button>
            </div>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Source labels identify contributed ideas, not independent verification. Click a label to
            inspect its recorded passage.
          </p>
          {status === "error" && answer ? (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {thread?.session?.lastError ??
                merge.startError ??
                "The merge failed before completing. This answer may be incomplete."}
            </p>
          ) : null}
          <div
            onClickCapture={(event) => {
              const link = event.target instanceof Element ? event.target.closest("a") : null;
              const href = link?.getAttribute("href");
              if (href?.startsWith("#source-")) {
                event.preventDefault();
                event.stopPropagation();
                setPassageId(href.slice(8));
              }
            }}
            className="[&_a[href^='#source-']]:rounded [&_a[href^='#source-']]:bg-primary/10 [&_a[href^='#source-']]:px-1"
          >
            {text ? (
              <ChatMarkdown
                text={text}
                cwd={thread?.worktreePath ?? undefined}
                threadRef={scopeThreadRef(run.environmentId, merge.threadId)}
                isStreaming={status === "running"}
              />
            ) : (
              <p className="text-sm text-muted-foreground" role="status">
                {merge.startError ??
                  (status === "error"
                    ? (thread?.session?.lastError ?? "Merge failed. Open its thread for details.")
                    : status === "missing"
                      ? "This merge thread was deleted."
                      : status === "completed" || status === "interrupted"
                        ? "No merged answer was produced."
                        : "Preparing the merged answer… Open thread if the provider needs approval.")}
              </p>
            )}
          </div>
        </section>
      ) : null}
      <Dialog
        open={citationPassage !== undefined}
        onOpenChange={(open) => {
          if (!open) setPassageId(null);
        }}
      >
        <DialogPopup className="max-w-2xl">
          <DialogTitle>
            {citationSource?.label} · {citationSource?.model}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Original passage captured when this merge was generated · {passageId}
          </p>
          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-sm">
            {citationPassage?.text}
          </pre>
          <Button variant="outline" size="sm" onClick={() => setPassageId(null)}>
            Close
          </Button>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
