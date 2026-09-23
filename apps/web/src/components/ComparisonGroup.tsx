import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronRightIcon, EllipsisIcon } from "lucide-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { readDurableComparison, useCompareRunStore, type CompareRun } from "../compareRunStore";
import { readLocalApi } from "../localApi";
import { readThreadShell } from "../state/entities";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
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
  const router = useRouter();
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
    const action = await api.contextMenu.show(
      [
        { id: "rename", label: "Rename comparison", icon: "pencil" },
        { id: "delete", label: "Delete comparison…", icon: "trash", destructive: true },
      ],
      position,
    );
    if (action === "rename") {
      setTitle(
        useCompareRunStore.getState().getRun(run.id)?.title ?? comparisonFallbackTitle(run.prompt),
      );
      setRenaming(true);
    }
    if (action === "delete") {
      const confirmed = await api.dialogs.confirm(
        "Delete this comparison? The comparison view and grouping will be removed. Provider threads, conversations, and worktrees will be kept. Running provider threads will continue.",
        { variant: "destructive" },
      );
      if (!confirmed) return;
      const latest = readDurableComparison(run.id) ?? useCompareRunStore.getState().getRun(run.id);
      if (!saveNotice(useCompareRunStore.getState().removeRun(run.id))) return;
      if (router.state.location.pathname !== `/compare/${run.id}`) return;
      const child = (latest?.entries ?? []).flatMap((entry) => {
        if (!entry.threadId || entry.deleted) return [];
        const shell = readThreadShell(scopeThreadRef(run.environmentId, entry.threadId));
        return shell && shell.archivedAt === null ? [shell] : [];
      })[0];
      await (child
        ? router.navigate({
            to: "/$environmentId/$threadId",
            params: { environmentId: child.environmentId, threadId: child.id },
            replace: true,
          })
        : router.navigate({ to: "/", replace: true }));
    }
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
          activeOptions={{ exact: true, includeSearch: true }}
          activeProps={{
            className: "bg-sidebar-accent text-sidebar-accent-foreground",
            "aria-current": "page",
          }}
          className="min-w-0 flex-1 rounded py-2 pr-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="truncate text-sm">
            {run.title ?? generatedTitle ?? comparisonFallbackTitle(run.prompt)}
          </p>
          <p className="text-xs text-muted-foreground">{run.entries.length} providers selected</p>
        </Link>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Comparison actions"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            showMenu({ x: rect.left, y: rect.bottom });
          }}
        >
          <EllipsisIcon className="size-4" />
        </Button>
      </div>
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
