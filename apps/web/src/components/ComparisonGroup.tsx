import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useCompareRunStore, type CompareRun } from "../compareRunStore";
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
    useCompareRunStore.getState().updateRun(run.id, (current) => ({
      ...current,
      title: generatedTitle,
      ...(first ? { projectId: first.projectId } : {}),
    }));
  }, [run.id, run.title, generatedTitle, first]);
  return (
    <li className="min-w-0 py-1" data-comparison-group={run.id}>
      <div className="flex min-w-0 items-center rounded-lg hover:bg-sidebar-accent">
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
      </div>
      {!run.collapsed ? (
        <>
          <ul className="ml-4 border-l border-border/70 pl-2">{children}</ul>
        </>
      ) : null}
    </li>
  );
}
