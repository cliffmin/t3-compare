import { comparisonSourceBusy } from "@t3tools/shared/comparisonFollowUp";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { scopeThreadRef, scopeProjectRef } from "@t3tools/client-runtime/environment";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useAtomValue } from "@effect/atom-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as Option from "effect/Option";
import { useEnvironmentThread } from "../state/threads";
import { markComparisonThreadDeleted } from "../compareRunStore";
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
import { environmentServerConfigsAtom } from "../state/server";
import { environmentProjects } from "../state/projects";
import { useThread, useThreadStatus } from "../state/entities";
import { ChatHeaderBreadcrumb } from "./chat/ChatHeader";
import { WorkspacePageHeader } from "./WorkspacePageHeader";
import { CollapsibleUserMessageBody, USER_MESSAGE_BUBBLE_CLASS } from "./chat/MessagesTimeline";
import { ProviderInstanceIcon } from "./chat/ProviderInstanceIcon";
import ChatView from "./ChatView";
import { ComparisonFollowUp } from "./ComparisonFollowUp";
import ChatMarkdown from "./ChatMarkdown";
import { Button } from "./ui/button";
import { Tooltip, TooltipTrigger, TooltipPopup } from "./ui/tooltip";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";

export function CompareView({ run }: { run: CompareRun }) {
  const [activePane, setActivePane] = useState<string>("follow-up");
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
  return (
    <SidebarInset className="h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-background text-foreground">
      <ComparisonHeader run={run} />
      <div
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
        data-comparison-scroll
      >
        <div className="flex min-h-full flex-col">
          <div className="flex justify-center px-4 py-4" aria-label="Shared comparison prompt">
            <div
              className={cn(USER_MESSAGE_BUBBLE_CLASS, "w-fit max-w-[min(100%,48rem)] text-left")}
            >
              <CollapsibleUserMessageBody
                text={run.prompt}
                renderContextReference={() => null}
                skills={[]}
                markdownCwd={undefined}
              />
            </div>
          </div>
          <div
            className="grid min-h-0 min-w-0 auto-rows-[minmax(30rem,65vh)] gap-px bg-border/70"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 26rem), 1fr))" }}
            data-comparison-grid
          >
            {run.entries.map((entry, index) => (
              <CompareColumn
                key={entry.threadId ?? `${entry.instanceId}:${index}`}
                run={run}
                active={activePane === String(index)}
                onActivate={() => setActivePane(String(index))}
                entry={entry}
                provider={
                  providers.find((provider) => provider.instanceId === entry.instanceId) ?? null
                }
              />
            ))}
          </div>
          <ComparisonFollowUp
            run={run}
            active={activePane === "follow-up"}
            onActivate={() => setActivePane("follow-up")}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
function ComparisonHeader({ run }: { run: CompareRun }) {
  const newThread = useNewThreadHandler();
  const projects = useAtomValue(environmentProjects.projectsAtom);
  const project =
    projects.find(
      (project) => project.environmentId === run.environmentId && project.id === run.projectId,
    ) ?? null;
  return (
    <WorkspacePageHeader
      electron={typeof window !== "undefined" && Boolean(window.desktopBridge)}
      className="flex-wrap border-b border-border/70 h-auto min-h-[var(--workspace-topbar-height)] py-2"
    >
      <SidebarTrigger />
      <ChatHeaderBreadcrumb
        activeProject={project}
        onNewThreadInProject={() => {
          if (project) void newThread(scopeProjectRef(run.environmentId, project.id));
        }}
      >
        <h2 className="truncate">{run.title ?? comparisonFallbackTitle(run.prompt)}</h2>
      </ChatHeaderBreadcrumb>
    </WorkspacePageHeader>
  );
}
function CompareColumn({
  run,
  entry,
  provider,
  active,
  onActivate,
}: {
  run: CompareRun;
  active: boolean;
  onActivate: () => void;
  entry: CompareRunEntry;
  provider: ProviderInstanceEntry | null;
}) {
  const navigate = useNavigate();
  const threadRef = useMemo(
    () => (entry.threadId ? scopeThreadRef(run.environmentId, entry.threadId) : null),
    [run.environmentId, entry.threadId],
  );
  const subscriptionStatus = useThreadStatus(threadRef);
  const detail = useEnvironmentThread(entry.threadId ? run.environmentId : null, entry.threadId);
  useEffect(() => {
    if (subscriptionStatus === "deleted" && entry.threadId && !entry.deleted) {
      markComparisonThreadDeleted(run.environmentId, entry.threadId);
    }
  }, [subscriptionStatus, run.environmentId, entry.threadId, entry.deleted]);
  const live = useThread(threadRef);
  const thread = entry.deleted || subscriptionStatus === "deleted" ? null : live;
  const nativeThread = thread;
  const currentSelection = nativeThread?.modelSelection ?? entry;
  const status =
    entry.threadId === null
      ? "not-started"
      : resolveCompareColumnStatus({
          subscriptionStatus: entry.deleted ? "deleted" : subscriptionStatus,
          unavailable: Option.isSome(detail.error),
          latestTurnState:
            nativeThread && comparisonSourceBusy(nativeThread)
              ? "running"
              : (thread?.latestTurn?.state ?? null),
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
      className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-background"
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
            {comparisonSelectionSummary(
              currentSelection,
              provider?.models.find((model) => model.slug === currentSelection.model)?.capabilities
                ?.optionDescriptors,
            )}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {COMPARE_COLUMN_STATUS_LABEL[status]}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="xs"
                variant="ghost"
                className="shrink-0"
                aria-label={`Open ${label} thread to continue`}
                disabled={!entry.threadId || status === "missing"}
                onClick={openThread}
              />
            }
          >
            <ArrowUpRightIcon className="size-4" />
          </TooltipTrigger>
          <TooltipPopup>Open {label}'s thread to continue the conversation.</TooltipPopup>
        </Tooltip>
      </header>
      {entry.startError || entry.launch === "uncertain" ? (
        <p role="status" className="border-b border-border px-3 py-2 text-xs text-amber-600">
          {entry.startError ??
            "Request delivery is unknown. Check this thread; it will not be resent automatically."}
        </p>
      ) : null}
      {thread ? (
        <ChatView
          routeKind="server"
          threadId={thread.id}
          environmentId={run.environmentId}
          embedded={{
            active,
            onActivate,
            hiddenUserMessageId:
              entry.initialMessageId ??
              thread.messages.find((message) => message.role === "user")?.id,
          }}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {entry.original ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Saved original answer ·{" "}
                {status === "missing" ? "thread deleted" : "live thread unavailable"}. Activity and
                later history are not included in this snapshot.
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
                  : status === "unavailable"
                    ? "This thread is unavailable. Reconnect or open the thread to check."
                    : entry.launch === "uncertain"
                      ? "Request delivery is unknown. Open the thread to check; it will not be resent."
                      : "Waiting for the provider thread…")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
