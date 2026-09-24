import { ThreadId } from "@t3tools/contracts";
import { parseScopedThreadKey, scopeProjectRef } from "@t3tools/client-runtime/environment";
import { DraftId, useComposerDraftStore } from "./composerDraftStore";
import type { CompareRun } from "./compareRunStore";

export function comparisonFollowUpDraftIdentity(run: CompareRun) {
  return {
    threadId: run.followUp?.threadId ?? ThreadId.make(`${run.id}:follow-up`),
    // Native draft hydration interprets colon keys as legacy environment:thread refs.
    draftId: DraftId.make(run.followUp?.draftId ?? `${encodeURIComponent(run.id)}-follow-up-draft`),
  };
}

type DraftSession = ReturnType<
  ReturnType<typeof useComposerDraftStore.getState>["getDraftSession"]
>;

export function comparisonFollowUpDraftReady(run: CompareRun, draft: DraftSession | undefined) {
  return Boolean(
    draft &&
    draft.environmentId === run.environmentId &&
    draft.projectId === run.projectId &&
    draft.threadId === comparisonFollowUpDraftIdentity(run).threadId,
  );
}

export function ensureComparisonFollowUpDraft(run: CompareRun, hasServerShell: boolean) {
  if (hasServerShell || run.followUp?.pending || !run.projectId) return;
  const { threadId, draftId } = comparisonFollowUpDraftIdentity(run);
  const store = useComposerDraftStore.getState();
  const draft = store.getDraftSession(draftId);
  if (!draft) {
    store.setLogicalProjectDraftThreadId(
      `comparison-follow-up:${run.id}`,
      scopeProjectRef(run.environmentId, run.projectId),
      draftId,
      { threadId, envMode: "local", branch: null, worktreePath: null },
    );
    return;
  }
  if (draft.promotedTo || comparisonFollowUpDraftReady(run, draft)) return;
  const parsed = parseScopedThreadKey(draftId);
  if (
    !parsed ||
    draft.environmentId !== parsed.environmentId ||
    draft.threadId !== parsed.threadId ||
    draft.projectId !== run.projectId
  )
    return;
  const projectId = run.projectId;
  // Repair only identity damaged by legacy key hydration. A normal retarget
  // clears workspace/upload state; this same-destination repair must retain it.
  useComposerDraftStore.setState((state) => ({
    draftThreadsByThreadKey: {
      ...state.draftThreadsByThreadKey,
      [draftId]: {
        ...draft,
        threadId,
        environmentId: run.environmentId,
        projectId,
      },
    },
  }));
}
