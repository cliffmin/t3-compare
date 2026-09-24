import { comparisonDeletionScope } from "../comparisonActions.logic";
import { useState } from "react";
import type { CompareRun } from "../compareRunStore";
import { comparisonActionError, type useComparisonActions } from "../hooks/useComparisonActions";
import { comparisonFallbackTitle } from "../compareColumn.logic";
import { AlertDialog } from "./ui/alert-dialog";
import { Checkbox } from "./ui/checkbox";
import { ConfirmationContent } from "./ConfirmDialogHost";

/** One aggregate confirmation shared by active shelves and the native Archive surface. */
export function useComparisonDeleteDialog(
  run: CompareRun,
  actions: ReturnType<typeof useComparisonActions>,
) {
  const [deleting, setDeleting] = useState(false);
  const [cascade, setCascade] = useState(true);
  const [deleteState, setDeleteState] = useState<Awaited<ReturnType<typeof actions.read>>>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const open = async () => {
    setCascade(true);
    setDeleteError(null);
    try {
      setDeleteState(await actions.read());
    } catch {
      setDeleteState(null);
      setDeleteError("Linked threads are unavailable. You can still remove only the grouping.");
    }
    setDeleting(true);
  };
  return {
    open,
    dialog: (
      <AlertDialog
        open={deleting}
        onOpenChange={(open) => {
          if (!actions.busy) setDeleting(open);
        }}
      >
        <ConfirmationContent
          title={`Delete comparison “${run.title ?? comparisonFallbackTitle(run.prompt)}”?`}
          variant="destructive"
          disabled={
            actions.busy ||
            (cascade && (!deleteState || deleteState.missing.length > 0 || deleteState.uncertain))
          }
          description={
            <>
              {cascade
                ? "This permanently clears conversation history for the linked threads. Running sessions will stop."
                : "Only the comparison view and grouping will be removed. Conversations, drafts, worktrees and running sessions will be kept."}
              {deleteState?.uncertain
                ? " Waiting for send receipts; linked-thread deletion is unavailable until they resolve."
                : ""}
              {deleteState?.missing.length
                ? " Some linked threads are unavailable. Reconnect and retry, or remove only the grouping."
                : ""}
              {deleteError ? <span className="block text-destructive">{deleteError}</span> : null}
            </>
          }
          footer={
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={cascade}
                onCheckedChange={(checked) => setCascade(checked === true)}
                disabled={actions.busy}
              />
              <span>
                Also delete {deleteState?.ids.length ?? "all"} linked threads
                {cascade && deleteState?.threads.some((thread) => thread.worktreePath) ? (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Also deletes unused worktrees and their local changes. Worktrees used elsewhere
                    are kept.
                  </span>
                ) : null}
              </span>
            </label>
          }
          onConfirm={() => {
            void (async () => {
              try {
                if (cascade) {
                  const fresh = await actions.read();
                  setDeleteState(fresh);
                  if (!fresh || fresh.missing.length || fresh.uncertain) return;
                  // New identities need a fresh, reviewable confirmation.
                  if (
                    fresh.ids.join() !== deleteState?.ids.join() ||
                    comparisonDeletionScope(fresh.threads) !==
                      comparisonDeletionScope(deleteState?.threads ?? [])
                  ) {
                    setDeleteError(
                      "Linked threads or worktrees changed. Review the updated scope and confirm again.",
                    );
                    return;
                  }
                  await actions.dispatch("delete", comparisonDeletionScope(fresh.threads));
                } else await actions.removeGrouping();
                setDeleting(false);
              } catch (error) {
                try {
                  setDeleteState(await actions.read());
                } catch {
                  /* Keep the last confirmed membership while disconnected. */
                }
                setDeleteError(
                  error instanceof Error
                    ? error.message
                    : "Deletion failed. Retry remaining members.",
                );
                comparisonActionError(error);
              }
            })();
          }}
        />
      </AlertDialog>
    ),
  };
}
