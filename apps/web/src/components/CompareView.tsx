import { cn } from "../lib/utils";
import { scopeThreadRef, scopeProjectRef } from "@t3tools/client-runtime/environment";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useAtomValue } from "@effect/atom-react";
import type { ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  COMPARE_COLUMN_STATUS_LABEL,
  comparisonFallbackTitle,
  resolveCompareColumnStatus,
} from "../compareColumn.logic";
import type { CompareRun, CompareRunEntry } from "../compareRunStore";
import { comparisonSelectionSummary } from "../compareProviders";
import { useEnvironmentSettings } from "../hooks/useSettings";
import {
  applyProviderInstanceSettings,
  deriveProviderInstanceEntries,
  type ProviderInstanceEntry,
} from "../providerInstances";
import {
  environmentServerConfigsAtom,
  primaryServerAvailableEditorsAtom,
  primaryServerKeybindingsAtom,
} from "../state/server";
import { environmentProjects } from "../state/projects";
import { useThread, useThreadStatus } from "../state/entities";
import { ChatHeader, ChatHeaderBreadcrumb } from "./chat/ChatHeader";
import { WorkspacePageHeader } from "./WorkspacePageHeader";
import { CollapsibleUserMessageBody, USER_MESSAGE_BUBBLE_CLASS } from "./chat/MessagesTimeline";
import { ProviderInstanceIcon } from "./chat/ProviderInstanceIcon";
import { CompareThreadTimeline } from "./CompareThreadTimeline";
import ChatMarkdown from "./ChatMarkdown";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipPopup } from "./ui/tooltip";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";

export function CompareView({ run }: { run: CompareRun }) {
  const configs = useAtomValue(environmentServerConfigsAtom);
  const settings = useEnvironmentSettings(run.environmentId);
  const providers = useMemo(
    () =>
      applyProviderInstanceSettings(
        deriveProviderInstanceEntries(configs.get(run.environmentId)?.providers ?? []),
        settings,
      ),
    [configs, run.environmentId, settings],
  );
  const [targetId, setTargetId] = useState<ThreadId | null>(null);
  return (
    <SidebarInset className="h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <ComparisonHeader run={run} targetId={targetId} onTargetChange={setTargetId} />
      <div
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        data-comparison-scroll
      >
        <div className="flex justify-center px-4 py-4" aria-label="Shared comparison prompt">
          <div className={cn(USER_MESSAGE_BUBBLE_CLASS, "w-fit max-w-[min(100%,48rem)] text-left")}>
            <CollapsibleUserMessageBody
              text={run.prompt}
              renderContextReference={() => null}
              skills={[]}
              markdownCwd={undefined}
            />
          </div>
        </div>
        <div
          className="grid min-w-0 gap-px bg-border/70"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 26rem), 1fr))" }}
          data-comparison-grid
        >
          {run.entries.map((entry, index) => (
            <CompareColumn
              key={entry.threadId ?? `${entry.instanceId}:${index}`}
              run={run}
              entry={entry}
              provider={
                providers.find((provider) => provider.instanceId === entry.instanceId) ?? null
              }
            />
          ))}
        </div>
      </div>
    </SidebarInset>
  );
}
function ComparisonHeader({
  run,
  targetId,
  onTargetChange,
}: {
  run: CompareRun;
  targetId: ThreadId | null;
  onTargetChange: (id: ThreadId | null) => void;
}) {
  const navigate = useNavigate();
  const newThread = useNewThreadHandler();
  const selectedId = run.entries.some((entry) => entry.threadId === targetId) ? targetId : null;
  const targetRef = useMemo(
    () => (selectedId ? scopeThreadRef(run.environmentId, selectedId) : null),
    [run.environmentId, selectedId],
  );
  const target = useThread(targetRef);
  const projects = useAtomValue(environmentProjects.projectsAtom);
  const project =
    projects.find(
      (project) => project.environmentId === run.environmentId && project.id === run.projectId,
    ) ?? null;
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const editors = useAtomValue(primaryServerAvailableEditorsAtom);
  const openTarget = () => {
    if (selectedId)
      void navigate({
        to: "/$environmentId/$threadId",
        params: { environmentId: run.environmentId, threadId: selectedId },
      });
  };
  const cwd = target?.worktreePath ?? null;
  const workspaceControl = (
    <label className="flex min-w-0 items-center gap-2 text-xs no-drag">
      Workspace:
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex min-w-0" />}>
          <select
            aria-label="Workspace action target"
            className="max-w-44 rounded border border-border bg-background p-1.5"
            value={targetId ?? ""}
            onChange={(event) =>
              onTargetChange(
                run.entries.find((entry) => entry.threadId === event.target.value)?.threadId ??
                  null,
              )
            }
          >
            <option value="">Choose provider</option>
            {run.entries
              .filter((entry) => entry.threadId)
              .map((entry) => (
                <option key={entry.threadId} value={entry.threadId!}>
                  {entry.label ?? entry.instanceId} · {entry.model}
                </option>
              ))}
          </select>
        </TooltipTrigger>
        <TooltipPopup>
          Choose the provider workspace for Open, Git, and script actions. This does not change
          which providers receive your prompt.
        </TooltipPopup>
      </Tooltip>
    </label>
  );
  return (
    <WorkspacePageHeader
      electron={typeof window !== "undefined" && Boolean(window.desktopBridge)}
      className="flex-wrap border-b border-border/70 h-auto min-h-[var(--workspace-topbar-height)] py-2"
    >
      <SidebarTrigger />
      {target && project && cwd ? (
        <ChatHeader
          wrapActions
          workspaceControl={workspaceControl}
          activeThreadEnvironmentId={run.environmentId}
          activeThreadId={target.id}
          activeThreadTitle={run.title ?? comparisonFallbackTitle(run.prompt)}
          isServerThread={false}
          activeProject={project}
          openInCwd={cwd}
          gitCwd={cwd}
          activeProjectScripts={undefined}
          preferredScriptId={null}
          keybindings={keybindings}
          availableEditors={editors}
          rightPanelOpen={true}
          onNewThreadInProject={() => {
            if (project) void newThread(scopeProjectRef(run.environmentId, project.id));
          }}
        />
      ) : (
        <ChatHeaderBreadcrumb
          activeProject={project}
          onNewThreadInProject={() => {
            if (project) void newThread(scopeProjectRef(run.environmentId, project.id));
          }}
        >
          <h2 className="truncate">{run.title ?? comparisonFallbackTitle(run.prompt)}</h2>
        </ChatHeaderBreadcrumb>
      )}

      {!target || !project || !cwd ? workspaceControl : null}
      {!cwd ? (
        <span className="text-xs text-muted-foreground">
          {targetId ? "Workspace unavailable" : "Choose a workspace to enable actions"}
        </span>
      ) : (
        <Button size="xs" variant="outline" onClick={openTarget}>
          Actions in {run.entries.find((entry) => entry.threadId === targetId)?.label ?? "provider"}{" "}
          thread
        </Button>
      )}
    </WorkspacePageHeader>
  );
}
function CompareColumn({
  run,
  entry,
  provider,
}: {
  run: CompareRun;
  entry: CompareRunEntry;
  provider: ProviderInstanceEntry | null;
}) {
  const navigate = useNavigate();
  const threadRef = useMemo(
    () => (entry.threadId ? scopeThreadRef(run.environmentId, entry.threadId) : null),
    [run.environmentId, entry.threadId],
  );
  const subscriptionStatus = useThreadStatus(threadRef);
  const live = useThread(threadRef);
  const thread = subscriptionStatus === "deleted" ? null : live;
  const status =
    entry.threadId === null
      ? "not-started"
      : resolveCompareColumnStatus({
          subscriptionStatus,
          latestTurnState: thread?.latestTurn?.state ?? null,
          sessionStatus: thread?.session?.status ?? null,
        });
  const openThread = () => {
    if (entry.threadId)
      void navigate({
        to: "/$environmentId/$threadId",
        params: { environmentId: run.environmentId, threadId: entry.threadId },
      });
  };
  const label = entry.label ?? provider?.displayName ?? entry.instanceId;
  return (
    <section
      className="flex h-[min(46rem,78dvh)] min-h-96 min-w-0 flex-col overflow-hidden bg-background"
      aria-label={`${label} comparison`}
      data-comparison-thread={entry.threadId}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2">
        {provider ? (
          <ProviderInstanceIcon
            driverKind={provider.driverKind}
            displayName={label}
            accentColor={provider.accentColor}
            badgeContent="none"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="break-words text-xs text-muted-foreground">
            {comparisonSelectionSummary(entry)}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {COMPARE_COLUMN_STATUS_LABEL[status]}
        </span>
      </header>
      {entry.startError || entry.launch === "uncertain" ? (
        <p role="status" className="border-b border-border px-3 py-2 text-xs text-amber-600">
          {entry.startError ??
            "Request delivery is unknown. Check this thread; it will not be resent automatically."}
        </p>
      ) : null}
      {thread ? (
        <CompareThreadTimeline
          thread={thread}
          environmentId={run.environmentId}
          onOpenThread={openThread}
          initialMessageId={entry.initialMessageId}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {entry.original ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Saved original answer · live thread unavailable. Activity and later history are not
                included in this snapshot.
              </p>
              {entry.original.messages.map((message) => (
                <ChatMarkdown key={message.id} text={message.text} cwd={undefined} />
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {entry.startError ??
                (status === "missing"
                  ? "This thread was deleted."
                  : entry.launch === "uncertain"
                    ? "Request delivery is unknown. Open the thread to check; it will not be resent."
                    : "Waiting for the provider thread…")}
            </p>
          )}
        </div>
      )}
      <footer className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border/70 px-3">
        <span className="truncate text-xs text-muted-foreground">{thread?.branch ?? "—"}</span>
        <Button
          size="xs"
          variant="outline"
          disabled={!entry.threadId || subscriptionStatus === "deleted"}
          onClick={openThread}
        >
          {status === "running" ? "Open thread / stop" : "Open thread"}
        </Button>
      </footer>
    </section>
  );
}
