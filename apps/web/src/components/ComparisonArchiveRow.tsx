import { useComposerDraftStore } from "../composerDraftStore";
import {
  comparisonFollowUpDraftIdentity,
  comparisonFollowUpDraftReady,
} from "../comparisonFollowUpDraft";
import { useComparisonDeleteDialog } from "./ComparisonDeleteDialog";
import { readLocalApi } from "../localApi";
import { EllipsisIcon } from "lucide-react";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import { resolveComparisonMembers } from "../comparisonActions.logic";
import type { CompareRun } from "../compareRunStore";
import { useComparisonActions, comparisonActionError } from "../hooks/useComparisonActions";
import { comparisonFallbackTitle } from "../compareColumn.logic";
import { Button } from "./ui/button";

/** Complete comparison membership remains visible even when only some members are archived. */
export function ComparisonArchiveRow({
  run,
  threads,
  error,
  loading,
}: {
  run: CompareRun;
  threads: ReadonlyArray<EnvironmentThreadShell>;
  error: string | null;
  loading: boolean;
}) {
  const actions = useComparisonActions(run.id);
  const draftId = comparisonFollowUpDraftIdentity(run).draftId;
  const draft = useComposerDraftStore((state) => state.draftThreadsByThreadKey[draftId]);
  const unsent = Boolean(draft && !draft.promotedTo && comparisonFollowUpDraftReady(run, draft));
  const members = resolveComparisonMembers(run, threads, unsent);
  const deletion = useComparisonDeleteDialog(run, actions);
  const menu = async (position: { x: number; y: number }) => {
    const action = await readLocalApi()?.contextMenu.show(
      [
        { id: "restore", label: "Restore comparison" },
        { id: "delete", label: "Delete comparison…", icon: "trash", destructive: true },
      ],
      position,
    );
    if (action === "delete") await deletion.open();
    if (action === "restore") await actions.dispatch("restore");
  };
  return (
    <div
      className="flex items-start justify-between gap-4 border-b py-4"
      data-comparison-archive={run.id}
      onContextMenu={(event) => {
        event.preventDefault();
        void menu({ x: event.clientX, y: event.clientY }).catch(comparisonActionError);
      }}
    >
      <div className="min-w-0">
        <p className="font-medium">{run.title ?? comparisonFallbackTitle(run.prompt)}</p>
        <p className="text-sm text-muted-foreground">
          Comparison · Restore all linked conversations
        </p>
        {!loading ? (
          <ul className="text-xs text-muted-foreground">
            {members.threads.map((thread) => (
              <li key={thread.id}>
                {thread.title} · {thread.archivedAt ? "Archived" : "Active"}
              </li>
            ))}
            {members.missing.map((id) => (
              <li key={id}>
                {run.followUp?.threadId === id
                  ? "Shared conversation"
                  : (run.entries.find((entry) => entry.threadId === id)?.label ??
                    "Source conversation")}{" "}
                · Unavailable
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs">{error ?? "Loading linked conversations…"}</p>
        )}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {run.actionError ? <p className="text-xs text-destructive">{run.actionError}</p> : null}
      </div>
      <Button
        variant="outline"
        size="xs"
        disabled={actions.busy}
        onClick={() => {
          void actions.dispatch("restore").catch(comparisonActionError);
        }}
      >
        Restore comparison
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Archived comparison actions"
        disabled={actions.busy}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          void menu({ x: rect.left, y: rect.bottom }).catch(comparisonActionError);
        }}
      >
        <EllipsisIcon className="size-4" />
      </Button>
      {deletion.dialog}
    </div>
  );
}
