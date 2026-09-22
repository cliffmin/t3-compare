import { AUTOMATIC_COMPARISON_LABEL } from "../automaticComparison";
import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { useCompareRunStore, type CompareRun, type CompareMerge } from "../compareRunStore";
import { comparisonFallbackTitle } from "../compareColumn.logic";

export function ComparisonGroup({
  run,
  threads,
  children,
  output,
}: {
  run: CompareRun;
  threads: ReadonlyArray<EnvironmentThreadShell>;
  children: ReactNode;
  output: CompareMerge | undefined;
}) {
  const first = run.entries.flatMap((entry) => {
    const thread = threads.find(
      (item) => item.environmentId === run.environmentId && item.id === entry.threadId,
    );
    return thread ? [thread] : [];
  })[0];
  const generatedTitle =
    !run.title && first?.titleState?.source === "generated" ? first.title : undefined;
  const outputThread = threads.find(
    (thread) => thread.environmentId === run.environmentId && thread.id === output?.threadId,
  );
  const outputTitle =
    output?.output?.title === comparisonFallbackTitle(run.prompt) &&
    outputThread?.titleState?.source === "generated"
      ? outputThread.title
      : undefined;
  useEffect(() => {
    if (
      (!generatedTitle || run.title === generatedTitle) &&
      (!outputTitle || output?.output?.title === outputTitle)
    )
      return;
    useCompareRunStore.getState().updateRun(run.id, (current) => ({
      ...current,
      ...(generatedTitle ? { title: generatedTitle } : {}),
      ...(first ? { projectId: first.projectId } : {}),
      merges: (current.merges ?? []).map((merge) =>
        merge.threadId === output?.threadId && merge.output && outputTitle
          ? { ...merge, output: { ...merge.output, title: outputTitle } }
          : merge,
      ),
    }));
  }, [run.id, run.title, generatedTitle, first, output, outputTitle]);
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
          {output?.output || run.automatic ? (
            <div className="ml-4 mt-3 border-l border-border/70 pl-2">
              <Link
                to="/compare/$runId"
                params={{ runId: run.id }}
                search={{ tab: "merged", ...(output ? { merge: output.threadId } : {}) }}
                activeOptions={{ exact: true, includeSearch: true }}
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground",
                  "aria-current": "page",
                }}
                className="block rounded-lg px-2 py-2 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="truncate text-sm">{output?.output?.title ?? "Merged"}</p>
                <p className="text-xs text-muted-foreground">
                  {output?.output
                    ? `Merged from ${output.output.sources.length} selected`
                    : run.automatic
                      ? AUTOMATIC_COMPARISON_LABEL[run.automatic.status]
                      : ""}
                </p>
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}
