import { CompareMergeView, type CompareSourceState } from "./CompareMergeView";
import { snapshotMergeSource } from "../compareMerge";
import { comparisonSelectionSummary } from "../compareProviders";
import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import * as Option from "effect/Option";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  COMPARE_COLUMN_STATUS_LABEL,
  isCompareColumnPending,
  resolveCompareColumnStatus,
  originalComparisonTurn,
  type CompareColumnStatus,
} from "../compareColumn.logic";
import { useCompareRunStore, type CompareRun, type CompareRunEntry } from "../compareRunStore";
import { useEnvironmentSettings } from "../hooks/useSettings";
import {
  applyProviderInstanceSettings,
  deriveProviderInstanceEntries,
  type ProviderInstanceEntry,
} from "../providerInstances";
import { environmentServerConfigsAtom } from "../state/server";
import { useEnvironmentThread } from "../state/threads";
import ChatMarkdown from "./ChatMarkdown";
import { ProviderInstanceIcon } from "./chat/ProviderInstanceIcon";
import { Button } from "./ui/button";
import { SidebarInset } from "./ui/sidebar";
import { Spinner } from "./ui/spinner";

const STATUS_TONE: Record<CompareColumnStatus, string> = {
  unverified: "text-muted-foreground",
  loading: "text-muted-foreground",
  running: "text-blue-500",
  completed: "text-emerald-500",
  interrupted: "text-amber-500",
  error: "text-red-500",
  missing: "text-muted-foreground",
  "not-started": "text-red-500",
};

export function CompareView({
  run,
  tab,
  onTabChange,
  mergeId,
}: {
  readonly run: CompareRun;
  mergeId?: string | undefined;
  tab: "originals" | "merged";
  onTabChange: (tab: "originals" | "merged") => void;
}) {
  const serverConfigs = useAtomValue(environmentServerConfigsAtom);
  const settings = useEnvironmentSettings(run.environmentId);
  const providerEntriesById = useMemo(() => {
    const providers = serverConfigs.get(run.environmentId)?.providers ?? [];
    const entries = applyProviderInstanceSettings(
      deriveProviderInstanceEntries(providers),
      settings,
    );
    return new Map(entries.map((entry) => [entry.instanceId, entry] as const));
  }, [run.environmentId, serverConfigs, settings]);

  const setTab = onTabChange;
  const [setupOpen, setSetupOpen] = useState(false);
  const [sources, setSources] = useState<Readonly<Record<string, CompareSourceState>>>({});
  const [included, setIncluded] = useState<Readonly<Record<string, boolean>>>(() =>
    Object.fromEntries((run.excludedThreadIds ?? []).map((id) => [id, false])),
  );
  const onSource = useCallback((threadId: ThreadId, source: CompareSourceState | null) => {
    setSources((current) => {
      if (source) return { ...current, [threadId]: source };
      if (!(threadId in current)) return current;
      const next = { ...current };
      delete next[threadId];
      return next;
    });
  }, []);
  const sourceList = run.entries.flatMap((entry) =>
    entry.threadId && sources[entry.threadId] ? [sources[entry.threadId]!] : [],
  );
  const entries = useMemo(() => [...providerEntriesById.values()], [providerEntriesById]);

  return (
    <SidebarInset className="h-dvh min-h-0 flex-col overflow-hidden overscroll-y-none bg-background text-foreground">
      <header className="flex shrink-0 flex-col gap-1 border-b border-border/70 px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Comparing {run.entries.length} providers
        </p>
        <p className="line-clamp-2 text-sm text-foreground">{run.prompt}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={tab === "originals" ? "secondary" : "ghost"}
            aria-pressed={tab === "originals"}
            onClick={() => setTab("originals")}
          >
            Compare
          </Button>
          <Button
            size="sm"
            variant={tab === "merged" ? "secondary" : "ghost"}
            aria-pressed={tab === "merged"}
            onClick={() => setTab("merged")}
          >
            Merged
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTab("merged");
              setSetupOpen(true);
            }}
          >
            Merge best answer
          </Button>
        </div>
      </header>

      {/*
        Columns share extra space but never shrink below their readable basis.
        Smaller viewports scroll horizontally; each answer scrolls vertically
        on its own so a verbose provider cannot push the others' text out of view.
      */}
      <div
        className={
          tab === "originals" ? "flex min-h-0 flex-1 gap-px overflow-x-auto bg-border/70" : "hidden"
        }
      >
        {run.entries.map((entry, index) => {
          const providerEntry = providerEntriesById.get(entry.instanceId) ?? null;
          // A never-started provider has no thread to subscribe to, so it
          // renders from the recorded failure instead. Separate components
          // keep the thread subscription out of the failed branch rather
          // than calling the hook conditionally.
          return entry.threadId === null ? (
            <CompareFailedColumn
              key={`${entry.instanceId}:${entry.model}:${index}`}
              entry={entry}
              providerEntry={providerEntry}
            />
          ) : (
            <CompareThreadColumn
              key={entry.threadId}
              entry={entry}
              sourceIndex={index}
              onSource={onSource}
              included={included[entry.threadId] !== false}
              onIncludeChange={(value) => {
                setIncluded((current) => ({ ...current, [entry.threadId!]: value }));
                const store = useCompareRunStore.getState();
                const current = store.getRun(run.id);
                if (!current) return;
                const excluded = new Set(current.excludedThreadIds ?? []);
                if (value) excluded.delete(entry.threadId!);
                else excluded.add(entry.threadId!);
                store.recordRun({ ...current, excludedThreadIds: [...excluded] });
              }}
              threadId={entry.threadId}
              environmentId={run.environmentId}
              providerEntry={providerEntry}
            />
          );
        })}
      </div>
      <div className={tab === "merged" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
        <CompareMergeView
          run={run}
          initialMergeId={mergeId}
          entries={entries}
          sources={sourceList}
          included={included}
          setupOpen={setupOpen}
          onSetupOpenChange={setSetupOpen}
        />
      </div>
    </SidebarInset>
  );
}

/**
 * The shell every column shares, so a provider that answered and one that
 * never started line up row for row and stay visually comparable.
 */
function CompareColumnFrame({
  providerEntry,
  instanceId,
  model,
  status,
  children,
  footer,
  inclusion,
}: {
  readonly providerEntry: ProviderInstanceEntry | null;
  readonly instanceId: string;
  readonly model: string;
  readonly status: CompareColumnStatus;
  readonly children: ReactNode;
  readonly footer: ReactNode;
  readonly inclusion?: ReactNode;
}) {
  const displayName = providerEntry?.displayName ?? instanceId;
  return (
    <section className="flex min-h-0 w-[26rem] grow shrink-0 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
        {providerEntry ? (
          <ProviderInstanceIcon
            driverKind={providerEntry.driverKind}
            displayName={displayName}
            accentColor={providerEntry.accentColor}
            badgeContent="none"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="break-words text-xs text-muted-foreground">{model}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium ${STATUS_TONE[status]}`}>
          {COMPARE_COLUMN_STATUS_LABEL[status]}
        </span>
      </div>

      {inclusion}
      <div className="scrollbar-gutter-both min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {children}
      </div>

      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border/70 px-3">
        {footer}
      </div>
    </section>
  );
}

/** A provider whose request never started a thread. */
function CompareFailedColumn({
  entry,
  providerEntry,
}: {
  readonly entry: CompareRunEntry;
  readonly providerEntry: ProviderInstanceEntry | null;
}) {
  return (
    <CompareColumnFrame
      providerEntry={providerEntry}
      instanceId={entry.instanceId}
      model={comparisonSelectionSummary(entry)}
      status="not-started"
      footer={<span className="text-xs text-muted-foreground">No worktree</span>}
    >
      <p className="text-sm text-muted-foreground">
        {entry.startError ?? "This provider's request never started."}
      </p>
    </CompareColumnFrame>
  );
}

/** A provider answering in its own thread and worktree. */
function CompareThreadColumn({
  entry,
  sourceIndex,
  onSource,
  included,
  onIncludeChange,
  threadId,
  environmentId,
  providerEntry,
}: {
  readonly entry: CompareRunEntry;
  readonly sourceIndex: number;
  readonly onSource: (threadId: ThreadId, source: CompareSourceState | null) => void;
  readonly included: boolean;
  readonly onIncludeChange: (included: boolean) => void;
  readonly threadId: ThreadId;
  readonly environmentId: EnvironmentId;
  readonly providerEntry: ProviderInstanceEntry | null;
}) {
  const navigate = useNavigate();
  const threadState = useEnvironmentThread(environmentId, threadId);
  const thread = Option.getOrNull(threadState.data);

  const original = thread ? originalComparisonTurn(thread) : null;
  const status =
    entry.original?.status ??
    (original?.state === "unverified"
      ? "unverified"
      : resolveCompareColumnStatus({
          subscriptionStatus: threadState.status,
          latestTurnState: original?.state ?? null,
          sessionStatus: thread?.session?.status ?? null,
        }));
  const answers = entry.original?.messages ?? original?.messages ?? [];
  const pending = isCompareColumnPending({ status, answerCount: answers.length });
  const completedAnswer =
    status === "completed" ? answers.map((message) => message.text).join("\n\n") : "";
  const projectId = entry.original?.projectId ?? thread?.projectId;
  const branch = entry.original?.branch ?? thread?.branch ?? null;
  const worktreePath = entry.original?.worktreePath ?? thread?.worktreePath ?? null;
  useEffect(() => {
    if (!projectId) {
      onSource(threadId, null);
      return;
    }
    onSource(threadId, {
      source: snapshotMergeSource({
        index: sourceIndex,
        label: providerEntry?.displayName ?? entry.instanceId,
        model: entry.model,
        threadId,
        text: completedAnswer,
      }),
      status,
      projectId,
      branch,
      worktreePath,
    });
  }, [
    threadId,
    sourceIndex,
    providerEntry?.displayName,
    entry.instanceId,
    entry.model,
    completedAnswer,
    status,
    projectId,
    branch,
    worktreePath,
    onSource,
  ]);

  return (
    <CompareColumnFrame
      providerEntry={providerEntry}
      instanceId={entry.instanceId}
      model={comparisonSelectionSummary(entry)}
      status={status}
      inclusion={
        <label className="flex items-center gap-2 border-b border-border/70 px-3 py-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={included && status === "completed" && answers.length > 0}
            disabled={status !== "completed" || answers.length === 0}
            onChange={(event) => onIncludeChange(event.target.checked)}
          />
          Include in merge
          {status === "running" || status === "loading"
            ? " · Waiting for completion"
            : status !== "completed"
              ? " · Not eligible"
              : ""}
        </label>
      }
      footer={
        <>
          <span className="truncate text-xs text-muted-foreground">{thread?.branch ?? "—"}</span>
          <Button
            size="xs"
            variant="outline"
            disabled={threadState.status === "deleted"}
            onClick={() => {
              void navigate({
                to: "/$environmentId/$threadId",
                params: { environmentId, threadId },
              });
            }}
          >
            Open thread
          </Button>
        </>
      }
    >
      {pending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          <span>Waiting for the first response…</span>
        </div>
      ) : answers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {status === "error"
            ? (thread?.session?.lastError ?? "This provider failed to answer.")
            : status === "missing"
              ? "This thread was deleted."
              : "No answer was produced."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {answers.map((message) => (
            <ChatMarkdown
              key={message.id}
              text={message.text}
              cwd={thread?.worktreePath ?? undefined}
              threadRef={scopeThreadRef(environmentId, threadId)}
              isStreaming={message.streaming}
            />
          ))}
        </div>
      )}
    </CompareColumnFrame>
  );
}
