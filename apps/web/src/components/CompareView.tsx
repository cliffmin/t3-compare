import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import * as Option from "effect/Option";
import { useMemo, type ReactNode } from "react";

import {
  COMPARE_COLUMN_STATUS_LABEL,
  isCompareColumnPending,
  resolveCompareColumnStatus,
  selectAnswerMessages,
  type CompareColumnStatus,
} from "../compareColumn.logic";
import type { CompareRun, CompareRunEntry } from "../compareRunStore";
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
  loading: "text-muted-foreground",
  running: "text-blue-500",
  completed: "text-emerald-500",
  interrupted: "text-amber-500",
  error: "text-red-500",
  missing: "text-muted-foreground",
  "not-started": "text-red-500",
};

export function CompareView({ run }: { readonly run: CompareRun }) {
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

  return (
    <SidebarInset className="h-dvh min-h-0 flex-col overflow-hidden overscroll-y-none bg-background text-foreground">
      <header className="flex shrink-0 flex-col gap-1 border-b border-border/70 px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Comparing {run.entries.length} providers
        </p>
        <p className="line-clamp-2 text-sm text-foreground">{run.prompt}</p>
      </header>

      {/*
        One horizontal scroller with fixed-basis columns, rather than a grid
        that divides the viewport: past three or four providers equal shares
        get too narrow to read a code block in, and the answer is the thing
        being compared. Each column scrolls on its own so a verbose provider
        cannot push the others' text out of view.
      */}
      <div className="flex min-h-0 flex-1 gap-px overflow-x-auto bg-border/70">
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
              threadId={entry.threadId}
              environmentId={run.environmentId}
              providerEntry={providerEntry}
            />
          );
        })}
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
}: {
  readonly providerEntry: ProviderInstanceEntry | null;
  readonly instanceId: string;
  readonly model: string;
  readonly status: CompareColumnStatus;
  readonly children: ReactNode;
  readonly footer: ReactNode;
}) {
  const displayName = providerEntry?.displayName ?? instanceId;
  return (
    <section className="flex min-h-0 w-[26rem] shrink-0 flex-col bg-background">
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
          <p className="truncate text-xs text-muted-foreground">{model}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium ${STATUS_TONE[status]}`}>
          {COMPARE_COLUMN_STATUS_LABEL[status]}
        </span>
      </div>

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
      model={entry.model}
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
  threadId,
  environmentId,
  providerEntry,
}: {
  readonly entry: CompareRunEntry;
  readonly threadId: ThreadId;
  readonly environmentId: EnvironmentId;
  readonly providerEntry: ProviderInstanceEntry | null;
}) {
  const navigate = useNavigate();
  const threadState = useEnvironmentThread(environmentId, threadId);
  const thread = Option.getOrNull(threadState.data);

  const status = resolveCompareColumnStatus({
    subscriptionStatus: threadState.status,
    latestTurnState: thread?.latestTurn?.state ?? null,
    sessionStatus: thread?.session?.status ?? null,
  });
  const answers = useMemo(() => selectAnswerMessages(thread?.messages ?? []), [thread?.messages]);
  const pending = isCompareColumnPending({ status, answerCount: answers.length });

  return (
    <CompareColumnFrame
      providerEntry={providerEntry}
      instanceId={entry.instanceId}
      model={entry.model}
      status={status}
      footer={
        <>
          <span className="truncate text-xs text-muted-foreground" title={thread?.branch ?? ""}>
            {thread?.branch ?? "—"}
          </span>
          <Button
            size="xs"
            variant="outline"
            disabled={status === "missing"}
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
