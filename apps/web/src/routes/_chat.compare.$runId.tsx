import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";

import { CompareView } from "../components/CompareView";
import { useCompareRunStore } from "../compareRunStore";
import { Button } from "../components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../components/ui/empty";
import { SidebarInset } from "../components/ui/sidebar";

function CompareRouteView() {
  const { runId } = useParams({ from: "/_chat/compare/$runId" });
  const navigate = useNavigate();
  const search = Route.useSearch();
  // Subscribed rather than read once: recording the run and navigating to it
  // race, so the grid must re-render when the run lands.
  const run = useCompareRunStore((state) => state.runs.find((candidate) => candidate.id === runId));

  if (!run) {
    return (
      <SidebarInset className="h-dvh min-h-0 overflow-hidden bg-background text-foreground">
        <Empty className="h-full">
          <EmptyHeader>
            <EmptyTitle>Comparison not found</EmptyTitle>
            <EmptyDescription>
              Comparisons are kept in this client, so one started on another device or cleared with
              your site data will not appear here. The threads it created are still in the sidebar.
            </EmptyDescription>
          </EmptyHeader>
          <Button size="sm" variant="outline" onClick={() => void navigate({ to: "/" })}>
            Back to threads
          </Button>
        </Empty>
      </SidebarInset>
    );
  }

  return (
    <CompareView
      key={run.id}
      run={run}
      mergeId={search.merge}
      tab={search.tab === "merged" ? "merged" : "originals"}
      onTabChange={(tab) =>
        void navigate({
          to: "/compare/$runId",
          params: { runId },
          search: {
            tab: tab === "merged" ? "merged" : "compare",
            ...(search.merge ? { merge: search.merge } : {}),
          },
        })
      }
    />
  );
}

export const Route = createFileRoute("/_chat/compare/$runId")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "compare" | "merged"; merge?: string } => ({
    tab: search.tab === "merged" ? "merged" : "compare",
    ...(typeof search.merge === "string" ? { merge: search.merge } : {}),
  }),
  component: CompareRouteView,
});
