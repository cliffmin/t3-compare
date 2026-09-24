import { beforeEach, expect, it } from "vite-plus/test";
import {
  CommandId,
  EnvironmentId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import {
  DraftId,
  partializeComposerDraftStoreState,
  useComposerDraftStore,
} from "./composerDraftStore";
import type { CompareRun } from "./compareRunStore";
import {
  comparisonFollowUpDraftIdentity,
  comparisonFollowUpDraftReady,
  ensureComparisonFollowUpDraft,
} from "./comparisonFollowUpDraft";

const run: CompareRun = {
  id: "cmp-fixture",
  createdAt: "2026-09-23T00:00:00Z",
  environmentId: EnvironmentId.make("fixture-environment"),
  projectId: ProjectId.make("fixture-project"),
  prompt: "Synthetic",
  entries: [],
};
const legacy: CompareRun = {
  ...run,
  followUp: {
    threadId: ThreadId.make(`${run.id}:follow-up`),
    draftId: `${run.id}:follow-up-draft`,
  },
};
beforeEach(() => useComposerDraftStore.setState(useComposerDraftStore.getInitialState(), true));
function reload() {
  const state = useComposerDraftStore.getState();
  useComposerDraftStore.setState(
    useComposerDraftStore.persist.getOptions().merge!(
      JSON.parse(JSON.stringify(partializeComposerDraftStoreState(state))),
      useComposerDraftStore.getInitialState(),
    ),
    true,
  );
}
function draft(r = legacy) {
  return useComposerDraftStore
    .getState()
    .getDraftSession(comparisonFollowUpDraftIdentity(r).draftId);
}
it("creates colon-free draft identities that survive cold hydration without repair", () => {
  ensureComparisonFollowUpDraft(run, false);
  expect(comparisonFollowUpDraftIdentity(run).draftId).not.toContain(":");
  expect(comparisonFollowUpDraftReady(run, draft(run))).toBe(true);
  reload();
  expect(comparisonFollowUpDraftReady(run, draft(run))).toBe(true);
});
it("repairs legacy hydration before rendering and preserves canonical content and workspace choices across reloads", () => {
  ensureComparisonFollowUpDraft(legacy, false);
  const { draftId } = comparisonFollowUpDraftIdentity(legacy);
  const store = useComposerDraftStore.getState();
  store.setPrompt(draftId, "First line\nSecond line");
  store.addFiles(
    draftId,
    [
      {
        type: "file",
        id: "fixture-file",
        name: "fixture.txt",
        mimeType: "text/plain",
        sizeBytes: 4,
        file: null,
        uploadedAttachmentId: "retained-upload",
        uploadEnvironmentId: run.environmentId,
      },
    ],
    { appendReference: true },
  );
  store.setModelSelection(draftId, {
    instanceId: ProviderInstanceId.make("fixture"),
    model: "fixture-model",
    options: [{ id: "reasoningEffort", value: "high" }],
  });
  store.setDraftThreadContext(draftId, {
    branch: "retained-branch",
    worktreePath: "/synthetic/worktree",
    envMode: "worktree",
    startFromOrigin: true,
    environmentSelection: "manual",
    runtimeMode: "approval-required",
    interactionMode: "plan",
  });
  const content = useComposerDraftStore.getState().draftsByThreadKey[draftId];
  const original = draft();
  for (let i = 0; i < 2; i++) {
    reload();
    expect(comparisonFollowUpDraftReady(legacy, draft())).toBe(false);
    const before = useComposerDraftStore.getState().draftsByThreadKey[draftId];
    ensureComparisonFollowUpDraft(legacy, false);
    expect(comparisonFollowUpDraftReady(legacy, draft())).toBe(true);
    expect(draft()).toEqual(original);
    expect(useComposerDraftStore.getState().draftsByThreadKey[draftId]).toBe(before);
    expect(before?.prompt).toBe(content?.prompt);
    expect(before?.modelSelectionByProvider).toEqual(content?.modelSelectionByProvider);
    expect(before?.files).toEqual(content?.files);
  }
});
it("leaves server, pending and promoted identities untouched without dispatch", () => {
  ensureComparisonFollowUpDraft(legacy, false);
  reload();
  const before = draft();
  ensureComparisonFollowUpDraft(legacy, true);
  expect(draft()).toBe(before);
  const pending = {
    type: "thread.turn.start" as const,
    commandId: CommandId.make("pending"),
    threadId: legacy.followUp!.threadId,
    message: {
      messageId: MessageId.make("message"),
      role: "user" as const,
      text: "Synthetic",
      attachments: [],
    },
    modelSelection: { instanceId: ProviderInstanceId.make("fixture"), model: "fixture-model" },
    runtimeMode: "full-access" as const,
    interactionMode: "default" as const,
    createdAt: "2026-09-23T00:00:00Z",
  };
  ensureComparisonFollowUpDraft({ ...legacy, followUp: { ...legacy.followUp!, pending } }, false);
  expect(draft()).toBe(before);
  const { draftId } = comparisonFollowUpDraftIdentity(legacy);
  useComposerDraftStore.setState((s) => ({
    draftThreadsByThreadKey: {
      ...s.draftThreadsByThreadKey,
      [draftId]: {
        ...before!,
        promotedTo: scopeThreadRef(run.environmentId, legacy.followUp!.threadId),
      },
    },
  }));
  const promoted = draft();
  ensureComparisonFollowUpDraft(legacy, false);
  expect(draft()).toBe(promoted);
});
it("does not change valid Compare drafts or unrelated native sessions", () => {
  const native = DraftId.make("native-draft");
  useComposerDraftStore
    .getState()
    .setProjectDraftThreadId(scopeProjectRef(run.environmentId, run.projectId!), native);
  const nativeBefore = useComposerDraftStore.getState().getDraftSession(native);
  ensureComparisonFollowUpDraft(legacy, false);
  const before = draft();
  ensureComparisonFollowUpDraft(legacy, false);
  expect(draft()).toBe(before);
  expect(useComposerDraftStore.getState().getDraftSession(native)).toBe(nativeBefore);
});
