import { useComparisonDeleteDialog } from "./ComparisonDeleteDialog";
import { useArchivedThreadSnapshots } from "../lib/archivedThreadsState";
import { useComparisonActions } from "../hooks/useComparisonActions";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useUiStateStore } from "../uiStateStore";
import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, EllipsisIcon } from "lucide-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useCompareRunStore, type CompareRun } from "../compareRunStore";
import { readLocalApi } from "../localApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogPopup, DialogTitle } from "./ui/dialog";
import { toastManager } from "./ui/toast";
import { comparisonFallbackTitle } from "../compareColumn.logic";

export function ComparisonGroup({
  run,
  threads,
  children,
}: {
  run: CompareRun;
  threads: ReadonlyArray<EnvironmentThreadShell>;
  children: ReactNode;
}) {
  const actions = useComparisonActions(run.id);
  const { copyToClipboard } = useCopyToClipboard();
  const deletion = useComparisonDeleteDialog(run, actions);
  const environmentIds = useMemo(() => [run.environmentId], [run.environmentId]);
  const archive = useArchivedThreadSnapshots(environmentIds);
  const allThreads = [
    ...threads,
    ...archive.snapshots.flatMap(({ environmentId, snapshot }) =>
      snapshot.threads.map((thread) => ({ ...thread, environmentId })),
    ),
  ];
  const visits = useUiStateStore((state) => state.threadLastVisitedAtById);
  const linked = allThreads.filter(
    (thread) =>
      thread.environmentId === run.environmentId &&
      (run.entries.some((entry) => entry.threadId === thread.id && !entry.deleted) ||
        (!run.followUp?.deleted && run.followUp?.threadId === thread.id)),
  );
  const unread = linked.some(
    (thread) =>
      thread.latestTurn?.completedAt &&
      (visits[scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id))] ?? "") <
        thread.latestTurn.completedAt,
  );
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const saveNotice = (result: "saved" | "session-only" | "failed" | "missing") => {
    if (result === "failed")
      toastManager.add({
        type: "error",
        title: "Could not save comparison changes",
        description: "Browser storage could not be updated. The comparison was not changed.",
      });
    if (result === "session-only")
      toastManager.add({
        type: "warning",
        title: "Saved for this session only",
        description: "Browser storage is unavailable. Changes cannot persist after reload.",
      });
    return result !== "failed";
  };
  const openMenu = async (position: { x: number; y: number }) => {
    const api = readLocalApi();
    if (!api) return;
    const action = await api.contextMenu.show(await actions.menu(), position);
    if (!action) return;
    if (action === "rename") {
      setTitle(
        useCompareRunStore.getState().getRun(run.id)?.title ?? comparisonFallbackTitle(run.prompt),
      );
      setRenaming(true);
    } else if (action === "delete") {
      await deletion.open();
    } else if (action === "copy-id" || action === "copy-link") {
      copyToClipboard(
        action === "copy-id"
          ? run.id
          : new URL(`/compare/${encodeURIComponent(run.id)}?tab=compare`, window.location.origin)
              .href,
        undefined,
      );
    } else await actions.dispatch(action);
  };
  const showMenu = (position: { x: number; y: number }) => {
    void openMenu(position).catch((error: unknown) => {
      toastManager.add({
        type: "error",
        title: "Comparison action failed",
        description: error instanceof Error ? error.message : "The action could not be completed.",
      });
    });
  };
  const first = run.entries.flatMap((entry) => {
    const thread = threads.find(
      (item) => item.environmentId === run.environmentId && item.id === entry.threadId,
    );
    return thread ? [thread] : [];
  })[0];
  const generatedTitle =
    !run.title && first?.titleState?.source === "generated" ? first.title : undefined;
  useEffect(() => {
    if (!generatedTitle || run.title === generatedTitle) return;
    useCompareRunStore.getState().updateRun(run.id, (current) =>
      current.title
        ? current
        : {
            ...current,
            title: generatedTitle,
            ...(first ? { projectId: first.projectId } : {}),
          },
    );
  }, [run.id, run.title, generatedTitle, first]);
  return (
    <li className="min-w-0 py-1" data-comparison-group={run.id}>
      <div
        className="flex min-w-0 items-center rounded-lg hover:bg-sidebar-accent"
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          showMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        <button
          type="button"
          className="shrink-0 rounded p-2 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={run.collapsed ? "Expand comparison" : "Collapse comparison"}
          aria-expanded={!run.collapsed}
          onClick={() =>
            useCompareRunStore
              .getState()
              .updateRun(run.id, (current) => ({ ...current, collapsed: !current.collapsed }))
          }
        >
          <ChevronRightIcon className={`size-3.5 ${run.collapsed ? "" : "rotate-90"}`} />
        </button>
        <Link
          to="/compare/$runId"
          params={{ runId: run.id }}
          search={{ tab: "compare" }}
          onClick={() => {
            for (const thread of linked) {
              if (thread.latestTurn?.completedAt)
                useUiStateStore
                  .getState()
                  .markThreadVisited(
                    scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id)),
                    thread.latestTurn.completedAt,
                  );
            }
          }}
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground",
            "aria-current": "page",
          }}
          className="min-w-0 flex-1 rounded py-2 pr-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className={`truncate text-sm ${unread ? "font-semibold" : ""}`}>
            {run.title ?? generatedTitle ?? comparisonFallbackTitle(run.prompt)}
          </p>
          <p className="text-xs text-muted-foreground">
            {unread ? "Unread · " : ""}
            {run.entries.length} providers selected
          </p>
          {run.actionError ? <p className="text-xs text-destructive">{run.actionError}</p> : null}
        </Link>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={actions.busy}
          aria-label="Comparison actions"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            showMenu({ x: rect.left, y: rect.bottom });
          }}
        >
          <EllipsisIcon className="size-4" />
        </Button>
      </div>
      {deletion.dialog}
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogPopup>
          <DialogTitle>Rename comparison</DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (
                title.trim() &&
                saveNotice(useCompareRunStore.getState().renameRun(run.id, title))
              )
                setRenaming(false);
            }}
          >
            <Input
              autoFocus
              aria-label="Comparison title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                Save
              </Button>
            </div>
          </form>
        </DialogPopup>
      </Dialog>
      {!run.collapsed ? (
        <>
          <ul className="ml-4 border-l border-border/70 pl-2">{children}</ul>
        </>
      ) : null}
    </li>
  );
}
