import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { CompareRun } from "./compareRunStore";
import type { SidebarListItem } from "./components/Sidebar.logic";

/** Group only rows already visible in the parent's shelf. Other shelves keep native rows. */
export function comparisonSidebarGroups(
  runs: ReadonlyArray<CompareRun>,
  items: ReadonlyArray<SidebarListItem>,
) {
  const rows = items.filter((item) => item.kind === "thread");
  const claimed = new Set<string>();
  const groups = runs.flatMap((run) => {
    const outputs = (run.merges ?? []).filter(
      (merge) => run.automatic || merge.output !== undefined,
    );
    const keys = new Set(
      [
        ...run.entries.map((entry) => entry.threadId),
        ...outputs.map((merge) => merge.threadId),
        run.followUp?.threadId,
      ].flatMap((id) => (id ? [scopedThreadKey(scopeThreadRef(run.environmentId, id))] : [])),
    );
    const anchor = rows.find((row) => keys.has(row.key) && !claimed.has(row.key));
    if (!anchor) return [];
    const groupedKeys = new Set(
      rows
        .filter(
          (row) => row.section === anchor.section && keys.has(row.key) && !claimed.has(row.key),
        )
        .map((row) => row.key),
    );
    for (const key of groupedKeys) claimed.add(key);
    return [
      {
        run,
        anchorKey: anchor.key,
        groupedKeys,
        output: outputs.findLast((output) =>
          groupedKeys.has(scopedThreadKey(scopeThreadRef(run.environmentId, output.threadId))),
        ),
      },
    ];
  });
  const byThread = new Map(
    groups.flatMap((group) => [...group.groupedKeys].map((key) => [key, group] as const)),
  );
  return { groups, byThread };
}
