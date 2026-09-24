import { waitForComparisonReceipt } from "../comparisonActionReceipt";
import { useMemo } from "react";
import { usePrimaryEnvironmentId } from "../state/environments";
import { buildPhysicalToLogicalProjectKeyMap } from "../sidebarProjectGrouping";
import {
  deriveLogicalProjectKeyFromSettings,
  derivePhysicalProjectKey,
  selectProjectGroupingSettings,
} from "../logicalProject";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { canSnooze, effectiveSnoozed } from "@t3tools/client-runtime/state/thread-settled";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import type { ContextMenuItem } from "@t3tools/contracts";
import {
  useCompareRunStore,
  readDurableComparison,
  type CompareRun,
  type ComparisonSaveResult,
} from "../compareRunStore";
import {
  comparisonDeletionScope,
  applyComparisonMembers,
  resolveComparisonMembers,
  comparisonCleanupCandidatePaths,
} from "../comparisonActions.logic";
import {
  comparisonFollowUpDraftIdentity,
  hasUnsentComparisonFollowUpDraft,
} from "../comparisonFollowUpDraft";
import { useComposerDraftStore } from "../composerDraftStore";
import { releaseComposerDraftUploads } from "../lib/composerDraftUploads";
import {
  readThreadShells,
  readThreadShell,
  readEnvironmentSupportsPinning,
  readEnvironmentSupportsSettlement,
  readEnvironmentSupportsSnooze,
  useProjects,
} from "../state/entities";
import { orchestrationEnvironment } from "../state/orchestration";
import { environmentServerConfigsAtom } from "../state/server";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { useUiStateStore } from "../uiStateStore";
import { readLocalApi } from "../localApi";
import { toastManager } from "../components/ui/toast";
import { useAtomCommand } from "../state/use-atom-command";
import { useThreadActions } from "./useThreadActions";
import { useClientSettings } from "./useSettings";
import { resolveSnoozePresets } from "../components/Sidebar.snooze";
import { requestCustomSnooze } from "../components/CustomSnoozeDialog";
import { randomUUID } from "../lib/utils";

const activeOperations = new Set<string>();
const latestRun = (id: string) =>
  readDurableComparison(id) ?? useCompareRunStore.getState().getRun(id);
export function noticeComparisonSave(result: ComparisonSaveResult) {
  if (result === "failed" || result === "missing")
    throw new Error(
      result === "failed"
        ? "Browser storage could not be updated. The comparison record was kept; retry after freeing storage."
        : "This comparison no longer exists.",
    );
  if (result === "session-only")
    toastManager.add({
      type: "warning",
      title: "Saved for this session only",
      description: "Browser storage is unavailable. Changes cannot persist after reload.",
    });
}
export function comparisonActionError(error: unknown) {
  toastManager.add({
    type: "error",
    title: "Comparison action failed",
    description: error instanceof Error ? error.message : "The action could not be completed.",
  });
}

export function useComparisonActions(runId: string) {
  const native = useThreadActions();
  const projects = useProjects();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const groupingSettings = useClientSettings(selectProjectGroupingSettings);
  const logicalKeys = useMemo(
    () =>
      buildPhysicalToLogicalProjectKeyMap({
        projects,
        settings: groupingSettings,
        primaryEnvironmentId,
      }),
    [projects, groupingSettings, primaryEnvironmentId],
  );
  const projectKey = (run: CompareRun) => {
    const project = projects.find(
      (p) => p.environmentId === run.environmentId && p.id === run.projectId,
    );
    return project
      ? (logicalKeys.get(derivePhysicalProjectKey(project)) ??
          deriveLogicalProjectKeyFromSettings(project, groupingSettings))
      : null;
  };
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const loadArchive = useAtomCommand(orchestrationEnvironment.loadArchivedShellSnapshot, {
    reportFailure: false,
  });
  const generateTitle = useAtomCommand(orchestrationEnvironment.generateComparisonTitle, {
    reportFailure: false,
  });
  const confirmArchive = useClientSettings((s) => s.confirmThreadArchive);
  const confirmUnpin = useClientSettings((s) => s.confirmThreadUnpin);
  const timestampFormat = useClientSettings((s) => s.timestampFormat);
  const read = async () => {
    const run = latestRun(runId);
    if (!run) return null;
    const archive = await loadArchive({ environmentId: run.environmentId, input: {} });
    if (archive._tag !== "Success") throw squashAtomCommandFailure(archive);
    const shells = [
      ...readThreadShells().filter((thread) => thread.environmentId === run.environmentId),
      ...archive.value.threads.map((thread) => ({ ...thread, environmentId: run.environmentId })),
    ];
    const latest = latestRun(runId);
    if (!latest) return null;
    const unsent = hasUnsentComparisonFollowUpDraft(
      latest,
      shells.some((thread) => thread.id === latest.followUp?.threadId),
    );
    const members = resolveComparisonMembers(latest, shells, unsent);
    const cleanupCandidates = comparisonCleanupCandidatePaths(
      members.threads,
      shells,
      projects
        .filter((project) => project.environmentId === latest.environmentId)
        .map((project) => project.workspaceRoot),
    );
    return { ...members, run: latest, shells, unsent, cleanupCandidates };
  };
  const exclusive = async (work: () => Promise<void>) => {
    if (activeOperations.has(runId)) return;
    activeOperations.add(runId);
    setBusy(true);
    try {
      if (navigator.locks)
        await navigator.locks.request(
          `comparison-action:${runId}`,
          { ifAvailable: true },
          async (lock) => {
            if (lock) await work();
          },
        );
      else await work();
    } finally {
      activeOperations.delete(runId);
      setBusy(false);
    }
  };
  const navigateAfterRemoval = async (run: CompareRun) => {
    if (router.state.location.pathname !== `/compare/${runId}`) return;
    const child = run.entries.flatMap((entry) => {
      const shell =
        entry.threadId && !entry.deleted
          ? readThreadShell(scopeThreadRef(run.environmentId, entry.threadId))
          : null;
      return shell && shell.archivedAt === null ? [shell] : [];
    })[0];
    try {
      await (child
        ? router.navigate({
            to: "/$environmentId/$threadId",
            params: { environmentId: child.environmentId, threadId: child.id },
            replace: true,
          })
        : router.navigate({ to: "/", replace: true }));
    } catch {
      toastManager.add({
        type: "warning",
        title: "Comparison updated; navigation failed",
        description: "Choose a conversation from the sidebar.",
      });
    }
  };
  const saveError = (message: string) => {
    // Keep the error visible in this session even when quota prevents persisting it.
    useCompareRunStore.getState().updateRun(runId, (run) => ({ ...run, actionError: message }));
  };
  const execute = (action: string, snoozedUntil?: string, confirmedScope?: string) =>
    exclusive(async () => {
      const initial = await read();
      if (!initial) return;
      if (initial.missing.length || initial.uncertain)
        throw new Error(
          "Linked threads are unavailable or waiting for send receipts. Reconnect and retry.",
        );
      if (action === "delete" && comparisonDeletionScope(initial.threads) !== confirmedScope)
        throw new Error(
          "Linked threads or worktrees changed. Review the updated scope and confirm again.",
        );
      const active = initial.threads.filter((thread) => thread.archivedAt === null);
      if (
        action === "archive" &&
        active.some(
          (thread) => thread.session?.status === "running" && thread.session.activeTurnId != null,
        )
      )
        throw new Error("Cannot archive a comparison with running threads.");
      if (
        action === "snooze" &&
        (!readEnvironmentSupportsSnooze(initial.run.environmentId) ||
          active.some((thread) => !canSnooze(thread, { now: new Date().toISOString() })))
      )
        throw new Error(
          "Respond to pending requests and queued turns before snoozing this comparison.",
        );
      if ((action === "archive" && confirmArchive) || (action === "unpin" && confirmUnpin)) {
        if (
          !(await readLocalApi()?.dialogs.confirm(
            `${action === "archive" ? "Archive" : "Unpin"} all eligible linked threads in this comparison?`,
          ))
        )
          return;
      }
      const eligible = (thread: EnvironmentThreadShell) => {
        if (action === "restore") return thread.archivedAt !== null;
        if (action === "delete") return true;
        if (thread.archivedAt !== null) return false;
        if (action === "pin") return thread.pinnedAt == null;
        if (action === "unpin") return thread.pinnedAt != null;
        if (action === "settle") return thread.settledOverride !== "settled";
        if (action === "unsettle") return thread.settledOverride === "settled";
        if (action === "snooze")
          return !effectiveSnoozed(thread, { now: new Date().toISOString() });
        if (action === "wake") return effectiveSnoozed(thread, { now: new Date().toISOString() });
        return true;
      };
      const undo: Array<{ before: EnvironmentThreadShell; after: EnvironmentThreadShell }> = [];
      const outcome = await applyComparisonMembers({
        ids: initial.ids,
        read,
        eligible,
        apply: async (thread, successful) => {
          if (
            action === "delete" &&
            thread.worktreePath !==
              initial.threads.find((item) => item.id === thread.id)?.worktreePath
          )
            throw new Error(
              "A linked worktree changed during deletion. Review remaining threads and retry.",
            );
          const ref = scopeThreadRef(thread.environmentId, thread.id);
          let archived = false;
          const result =
            action === "pin"
              ? await native.pinThread(ref)
              : action === "unpin"
                ? await native.unpinThread(ref)
                : action === "settle"
                  ? await native.settleThread(ref)
                  : action === "unsettle"
                    ? await native.unsettleThread(ref)
                    : action === "snooze" && snoozedUntil
                      ? await native.snoozeThread(ref, snoozedUntil)
                      : action === "wake"
                        ? await native.unsnoozeThread(ref)
                        : action === "archive"
                          ? await native.archiveThread(ref, {
                              onArchived: () => {
                                archived = true;
                              },
                            })
                          : action === "restore"
                            ? await native.unarchiveThread(ref)
                            : action === "delete"
                              ? await native.deleteThread(ref, {
                                  deletedThreadKeys: new Set(
                                    [...successful].map((id) =>
                                      scopedThreadKey(scopeThreadRef(thread.environmentId, id)),
                                    ),
                                  ),
                                  comparisonThreads: (await read())?.shells ?? [],
                                  comparisonCleanupConfirmed: true,
                                })
                              : null;
          if (result && result._tag !== "Success") {
            if (archived)
              toastManager.add({ type: "warning", title: "Thread archived; navigation failed" });
            else throw squashAtomCommandFailure(result);
          }
          if (result?._tag === "Success" && result.value && "sequence" in result.value) {
            try {
              const snapshot = await waitForComparisonReceipt(
                thread.environmentId,
                result.value.sequence,
              );
              const after = snapshot.threads.find((candidate) => candidate.id === thread.id);
              if (action === "snooze" && after && after.snoozedUntil === snoozedUntil)
                undo.push({
                  before: thread,
                  after: { ...after, environmentId: thread.environmentId },
                });
            } catch (error) {
              toastManager.add({
                type: "warning",
                title: "Thread updated; waiting for confirmed state",
                description:
                  error instanceof Error ? error.message : "Waiting for confirmed state.",
              });
            }
          }
        },
      });
      const latest = await read();
      if (!latest) return;
      const incomplete =
        outcome.failures.length > 0 || latest.missing.length > 0 || latest.uncertain;
      if (incomplete) {
        const message = `${outcome.successful.size} linked threads updated. ${outcome.failures.length || latest.missing.length} unresolved; retry remaining members. ${outcome.failures[0]?.message ?? "Waiting for linked threads."}`;
        saveError(message);
        toastManager.add({
          type: "warning",
          title: "Comparison partly updated",
          description: message,
        });
        if (["delete", "archive", "restore"].includes(action)) return;
      }
      if (action === "archive" || action === "restore") {
        const complete = latest.threads.every((thread) =>
          action === "archive" ? thread.archivedAt !== null : thread.archivedAt === null,
        );
        if (!complete) {
          saveError("Some linked threads changed during the operation. Retry to finish.");
          return;
        }
        noticeComparisonSave(
          useCompareRunStore
            .getState()
            .saveRun(runId, (run) => ({ ...run, archived: action === "archive", actionError: "" })),
        );
        if (action === "archive") await navigateAfterRemoval(latest.run);
      } else if (action === "delete") {
        if (latest.ids.length) {
          saveError("Linked threads remain. Retry to finish deleting the comparison.");
          return;
        }
        noticeComparisonSave(useCompareRunStore.getState().removeRun(runId));
        if (latest.unsent) {
          const { draftId } = comparisonFollowUpDraftIdentity(latest.run);
          releaseComposerDraftUploads(draftId);
          useComposerDraftStore.getState().clearDraftThread(draftId);
        }
        await navigateAfterRemoval(latest.run);
      }
      if (!["delete", "archive", "restore"].includes(action) && !incomplete) {
        noticeComparisonSave(
          useCompareRunStore.getState().saveRun(runId, (run) => ({ ...run, actionError: "" })),
        );
      }
      if (action === "delete" && !incomplete) return;
      toastManager.add({
        type: incomplete ? "warning" : "success",
        title: `Comparison updated (${outcome.successful.size} threads)`,
        ...(action === "snooze"
          ? {
              actionProps: {
                children: "Undo",
                onClick: () => {
                  void exclusive(async () => {
                    for (const { after } of undo) {
                      const ref = scopeThreadRef(after.environmentId, after.id);
                      const current = readThreadShell(ref);
                      // Do not undo later user changes or activity.
                      if (
                        current &&
                        current.snoozedUntil === snoozedUntil &&
                        current.updatedAt === after.updatedAt
                      ) {
                        const result = await native.unsnoozeThread(ref);
                        if (result._tag !== "Success")
                          comparisonActionError(squashAtomCommandFailure(result));
                      }
                    }
                  }).catch(comparisonActionError);
                },
              },
            }
          : {}),
      });
    });
  const removeGrouping = () =>
    exclusive(async () => {
      const run = latestRun(runId);
      if (!run) return;
      noticeComparisonSave(useCompareRunStore.getState().removeRun(runId));
      await navigateAfterRemoval(run);
    });
  const regenerate = () =>
    exclusive(async () => {
      const run = latestRun(runId);
      if (!run?.projectId) return;
      const supported = appAtomRegistry.get(environmentServerConfigsAtom).get(run.environmentId)
        ?.environment.capabilities.comparisonTitleGeneration;
      if (!supported)
        throw new Error("Update this environment's server to regenerate comparison titles.");
      const revision = randomUUID();
      noticeComparisonSave(
        useCompareRunStore
          .getState()
          .saveRun(runId, (current) => ({ ...current, titleRevision: revision })),
      );
      const result = await generateTitle({
        environmentId: run.environmentId,
        input: {
          projectId: run.projectId,
          prompt: run.prompt,
          previousTitle: run.title ?? run.prompt.slice(0, 80),
        },
      });
      if (result._tag !== "Success") throw squashAtomCommandFailure(result);
      const title = result.value.title;
      if (title && latestRun(runId)?.titleRevision === revision)
        noticeComparisonSave(
          useCompareRunStore
            .getState()
            .saveRun(runId, (current) =>
              current.titleRevision === revision ? { ...current, title } : current,
            ),
        );
    });
  const menu = async () => {
    const run = latestRun(runId);
    if (!run) return [];
    let state: Awaited<ReturnType<typeof read>> = null;
    try {
      state = await read();
    } catch {
      /* Group-only actions remain usable while disconnected. */
    }
    const threads = state?.threads.filter((thread) => thread.archivedAt === null) ?? [];
    const ready = Boolean(state && !state.missing.length && !state.uncertain);
    const items: ContextMenuItem[] = [];
    if (
      projectKey(run) &&
      (!state || state.threads.every((thread) => thread.projectId === run.projectId))
    ) {
      items.push(
        { id: "project-settings", label: "Project settings" },
        { id: "filter-by-project", label: "Filter by project" },
      );
    }
    const add = (
      id: string,
      label: string,
      predicate: (thread: EnvironmentThreadShell) => boolean,
      icon: ContextMenuItem["icon"],
    ) => {
      const count = threads.filter(predicate).length;
      if (count)
        items.push({
          id,
          label: `${label} (${count})`,
          disabled: !ready,
          ...(icon ? { icon } : {}),
        });
    };
    if (readEnvironmentSupportsPinning(run.environmentId)) {
      add("pin", "Pin comparison", (t) => t.pinnedAt == null, "pin");
      add("unpin", "Unpin comparison", (t) => t.pinnedAt != null, "pin-off");
    }
    if (readEnvironmentSupportsSettlement(run.environmentId)) {
      add("settle", "Settle comparison", (t) => t.settledOverride !== "settled", "circle-check");
      add(
        "unsettle",
        "Unsettle comparison",
        (t) => t.settledOverride === "settled",
        "circle-check",
      );
    }
    if (readEnvironmentSupportsSnooze(run.environmentId)) {
      add(
        "wake",
        "Wake comparison",
        (t) => effectiveSnoozed(t, { now: new Date().toISOString() }),
        "clock",
      );
      const count = threads.filter(
        (t) => !effectiveSnoozed(t, { now: new Date().toISOString() }),
      ).length;
      if (count)
        items.push({
          id: "snooze",
          label: `Snooze comparison (${count})`,
          icon: "clock",
          disabled: !ready || threads.some((t) => !canSnooze(t, { now: new Date().toISOString() })),
          children: [
            ...resolveSnoozePresets(new Date(), timestampFormat).map((p) => ({
              id: `snooze:${p.id}`,
              label: `${p.label} (${p.whenLabel})`,
            })),
            { id: "snooze:custom", label: "Custom…", separatorBefore: true },
          ],
        });
    }
    items.push({ id: "rename", label: "Rename comparison", icon: "pencil", separatorBefore: true });
    if (
      run.projectId &&
      appAtomRegistry.get(environmentServerConfigsAtom).get(run.environmentId)?.environment
        .capabilities.comparisonTitleGeneration
    )
      items.push({ id: "regenerate", label: "Regenerate title", disabled: busy });
    items.push(
      { id: "mark-unread", label: "Mark unread", disabled: !ready },
      { id: "copy-link", label: "Copy comparison link", separatorBefore: true },
      { id: "copy-id", label: "Copy comparison ID" },
      {
        id: "archive",
        label: "Archive comparison",
        icon: "archive",
        disabled:
          !ready ||
          threads.some((t) => t.session?.status === "running" && t.session.activeTurnId != null),
        separatorBefore: true,
      },
      { id: "delete", label: "Delete comparison…", icon: "trash", destructive: true },
    );
    return items;
  };
  const dispatch = async (action: string, confirmedScope?: string) => {
    if (action === "project-settings" || action === "filter-by-project") {
      const run = latestRun(runId);
      const key = run ? projectKey(run) : null;
      if (key) {
        if (action === "project-settings")
          await router.navigate({ to: "/projects/$projectKey", params: { projectKey: key } });
        else useUiStateStore.getState().setSidebarProjectScopeKey(key);
      }
      return;
    }
    if (action === "regenerate") return regenerate();
    if (action === "mark-unread") {
      const state = await read();
      if (!state || state.missing.length) throw new Error("Some linked threads are unavailable.");
      for (const thread of state.threads)
        useUiStateStore
          .getState()
          .markThreadUnread(
            scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id)),
            thread.latestTurn?.completedAt,
          );
      return;
    }
    if (action.startsWith("snooze:")) {
      const choice =
        action === "snooze:custom"
          ? await requestCustomSnooze()
          : resolveSnoozePresets(new Date(), timestampFormat).find(
              (p) => `snooze:${p.id}` === action,
            );
      if (choice) await execute("snooze", choice.snoozedUntil);
      return;
    }
    await execute(action, undefined, confirmedScope);
  };
  return { busy, read, menu, dispatch, removeGrouping };
}
