import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LegendListRef } from "@legendapp/list/react";
import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, MessageId, WorktreeSetupSnapshot } from "@t3tools/contracts";
import type { Thread } from "../types";
import {
  deriveActiveWorkStartedAt,
  derivePhase,
  deriveTimelineEntriesWithState,
  deriveWorkLogEntries,
  type TimelineEntriesProjection,
} from "../session-logic";
import { useTheme } from "../hooks/useTheme";
import { useEnvironmentSettings } from "../hooks/useSettings";
import { MessagesTimeline } from "./chat/MessagesTimeline";
import { CompareThreadRequests } from "./CompareThreadRequests";
import {
  findRecordedWorktreeSetup,
  resolveVisibleWorktreeSetup,
} from "@t3tools/client-runtime/worktree-setup";
import { useEnvironmentQuery } from "../state/query";
import { useAtomCommand } from "../state/use-atom-command";
import { vcsEnvironment } from "../state/vcs";
import { isThreadCompacting } from "./ChatView.logic";
import { useRightPanelStore } from "../rightPanelStore";
import { useDiffPanelStore } from "../diffPanelStore";
import { ExpandedImageDialog } from "./chat/ExpandedImageDialog";
import { expandedImageKey, type ExpandedImagePreview } from "./chat/ExpandedImagePreview";
import { useAtomQueryRunner } from "../state/use-atom-query-runner";
import { assetEnvironment } from "../state/assets";
import { downloadChatAttachment } from "../attachmentActions";
import { ScrollToEndButton } from "./chat/ScrollToEndButton";

const noop = () => {};

export function CompareThreadTimeline({
  thread,
  environmentId,
  onOpenThread,
  initialMessageId,
}: {
  thread: Thread;
  environmentId: EnvironmentId;
  onOpenThread: () => void;
  initialMessageId?: MessageId | undefined;
}) {
  const { resolvedTheme } = useTheme();
  const settings = useEnvironmentSettings(environmentId);
  const listRef = useRef<LegendListRef | null>(null);
  const [following, setFollowing] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(true);
  const onIsAtEndChange = useCallback((atEnd: boolean) => {
    setIsAtEnd(atEnd);
    setFollowing(atEnd);
  }, []);
  const projectionRef = useRef<TimelineEntriesProjection | null>(null);
  const messages = thread.messages;
  const hiddenUserMessageId =
    initialMessageId ?? messages.find((message) => message.role === "user")?.id;
  const work = useMemo(() => deriveWorkLogEntries(thread.activities), [thread.activities]);
  const entries = useMemo(() => {
    const projection = deriveTimelineEntriesWithState(
      messages,
      thread.proposedPlans,
      work,
      projectionRef.current,
    );
    projectionRef.current = projection;
    return projection.entries;
  }, [messages, thread.proposedPlans, work]);
  const phase = derivePhase(thread.session);
  const recorded = useMemo(
    () => findRecordedWorktreeSetup(thread.activities, thread.id),
    [thread.activities, thread.id],
  );
  const [heldSetup, setHeldSetup] = useState<WorktreeSetupSnapshot | null>(null);
  const setupQuery = useEnvironmentQuery(
    recorded?.phase === "running" || heldSetup?.phase === "running"
      ? vcsEnvironment.worktreeSetup({ environmentId, input: { threadId: thread.id } })
      : null,
  );
  useEffect(() => {
    if (setupQuery.data) setHeldSetup(setupQuery.data);
  }, [setupQuery.data]);
  const setup = resolveVisibleWorktreeSetup({
    live: heldSetup,
    recorded,
    turnStarted: thread.latestTurn?.startedAt != null,
    followUpSent: messages.filter((message) => message.role === "user").length > 1,
  });
  const preparing = thread.latestTurn === null && recorded?.phase === "running";
  const working = phase === "running" || phase === "connecting" || preparing;
  const cancelSetup = useAtomCommand(vcsEnvironment.cancelWorktreeSetup);

  const ref = useMemo(() => scopeThreadRef(environmentId, thread.id), [environmentId, thread.id]);
  const createAssetUrl = useAtomQueryRunner(assetEnvironment.createUrl, { reportFailure: false });
  const [expandedImage, setExpandedImage] = useState<ExpandedImagePreview | null>(null);
  const openDiff = useCallback(
    (turnId: import("@t3tools/contracts").TurnId, filePath?: string) => {
      useDiffPanelStore.getState().selectTurn(ref, turnId, filePath);
      useRightPanelStore.getState().open(ref, "diff");
      onOpenThread();
    },
    [ref, onOpenThread],
  );
  const openFile = useCallback(
    (attachment: import("../types").ChatFileAttachment) => {
      useRightPanelStore.getState().openAttachment(ref, attachment);
      onOpenThread();
    },
    [ref, onOpenThread],
  );
  const downloadFile = useCallback(
    (attachment: import("../types").ChatFileAttachment) => {
      void downloadChatAttachment({ attachment, environmentId, createAssetUrl });
    },
    [environmentId, createAssetUrl],
  );
  return (
    <>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <MessagesTimeline
          isCompacting={isThreadCompacting({ thread, isSendBusy: false, phase })}
          hideEmptyPlaceholder
          hiddenUserMessageId={hiddenUserMessageId}
          worktreeSetup={setup}
          isPreparingWorktree={preparing}
          onCancelWorktreeSetup={() =>
            void cancelSetup({ environmentId, input: { threadId: thread.id } })
          }
          onOpenWorktreeSetupTerminal={onOpenThread}
          listRef={listRef}
          timelineEntries={entries}
          isWorking={working}
          activeTurnStartedAt={deriveActiveWorkStartedAt(
            thread.latestTurn,
            thread.session,
            null,
            thread.messages.findLast((message) => message.role === "user")?.createdAt ?? null,
          )}
          latestTurn={thread.latestTurn}
          runningTurnId={thread.session?.activeTurnId ?? null}
          turnDiffSummaries={thread.checkpoints}
          routeThreadKey={scopedThreadKey(ref)}
          onOpenTurnDiff={openDiff}
          supportsConversationRollback={false}
          onRevertToTurnCount={onOpenThread}
          isRevertingCheckpoint={false}
          onImageExpand={setExpandedImage}
          onFileOpen={openFile}
          onFileDownload={downloadFile}
          activeThreadEnvironmentId={environmentId}
          markdownCwd={thread.worktreePath ?? undefined}
          workspaceRoot={thread.worktreePath ?? undefined}
          resolvedTheme={resolvedTheme}
          timestampFormat={settings.timestampFormat}
          anchorMessageId={null}
          onAnchorReady={noop}
          contentInsetEndAdjustment={0}
          liveFollowEnabled={following}
          onIsAtEndChange={onIsAtEndChange}
          onManualNavigation={() => setFollowing(false)}
        />
        {!isAtEnd ? (
          <ScrollToEndButton
            onClick={() => {
              setFollowing(true);
              requestAnimationFrame(() => {
                void listRef.current?.scrollToEnd({ animated: true });
              });
            }}
          />
        ) : null}
      </div>
      {thread.session?.lastError ? (
        <p role="status" className="shrink-0 px-3 py-2 text-xs text-destructive">
          {thread.session.lastError}
        </p>
      ) : null}
      {expandedImage ? (
        <ExpandedImageDialog
          key={expandedImageKey(expandedImage)}
          preview={expandedImage}
          onClose={() => setExpandedImage(null)}
        />
      ) : null}
      <CompareThreadRequests thread={thread} environmentId={environmentId} />
    </>
  );
}
