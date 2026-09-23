import { MergeSource } from "./compareMerge";
import {
  OrchestrationMessage,
  ProjectId,
  EnvironmentId,
  ProviderInstanceId,
  ProviderOptionSelection,
  ModelSelection,
  ThreadId,
  CommandId,
  MessageId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { create } from "zustand";

import { randomUUID } from "./lib/utils";

export const COMPARE_RUN_STORAGE_KEY = "t3code:compare-runs:v1";
const COMPARE_RUN_STORAGE_VERSION = 1;

/**
 * Client-local grouping over server-owned threads. Settled original answers and
 * merge outputs are retained so later conversation turns cannot change the
 * comparison. Loss of this store costs grouping and snapshots, never the threads.
 */
const OriginalAnswerSchema = Schema.Struct({
  messages: Schema.Array(OrchestrationMessage),
  status: Schema.Literals(["completed", "error", "interrupted", "unverified"]),
  projectId: ProjectId,
  branch: Schema.NullOr(Schema.String),
  worktreePath: Schema.NullOr(Schema.String),
});

const CompareRunEntrySchema = Schema.Struct({
  /**
   * The thread this provider is answering in, or null when its request
   * never started one. A provider that failed to launch is a result of the
   * comparison, not an omission from it — dropping it would leave the grid
   * quietly narrower than the set of providers that were asked.
   */
  threadId: Schema.NullOr(ThreadId),
  initialMessageId: Schema.optionalKey(MessageId),
  instanceId: ProviderInstanceId,
  model: Schema.String,
  label: Schema.optionalKey(Schema.String),
  options: Schema.optionalKey(Schema.Array(ProviderOptionSelection)),
  /** Why the request never started. Only set when `threadId` is null. */
  startError: Schema.optionalKey(Schema.String),
  original: Schema.optionalKey(OriginalAnswerSchema),
  launch: Schema.optionalKey(Schema.Literals(["pending", "started", "uncertain", "failed"])),
  deleted: Schema.optionalKey(Schema.Boolean),
});
export type CompareRunEntry = typeof CompareRunEntrySchema.Type;

export const CompareMergeConfig = Schema.Struct({
  modelSelection: ModelSelection,
  direction: Schema.String,
});
export type CompareMergeConfig = typeof CompareMergeConfig.Type;

const CompareMergeSchema = Schema.Struct({
  commandId: Schema.optionalKey(CommandId),
  messageId: Schema.optionalKey(MessageId),
  prompt: Schema.optionalKey(Schema.String),
  sources: Schema.optionalKey(Schema.Array(MergeSource)),
  threadId: ThreadId,
  createdAt: Schema.String,
  modelSelection: ModelSelection,
  instructions: Schema.String,
  direction: Schema.String,
  output: Schema.optionalKey(
    Schema.Struct({
      title: Schema.String,
      answer: Schema.String,
      sources: Schema.Array(MergeSource),
    }),
  ),
  startError: Schema.optionalKey(Schema.String),
});
export type CompareMerge = typeof CompareMergeSchema.Type;

export const CompareRunSchema = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  environmentId: EnvironmentId,
  /** The prompt every column received, shown once above the grid. */
  prompt: Schema.String,
  title: Schema.optionalKey(Schema.String),
  collapsed: Schema.optionalKey(Schema.Boolean),
  projectId: Schema.optionalKey(ProjectId),
  entries: Schema.Array(CompareRunEntrySchema),
  merges: Schema.optionalKey(Schema.Array(CompareMergeSchema)),
  excludedThreadIds: Schema.optionalKey(Schema.Array(ThreadId)),
  automatic: Schema.optionalKey(
    Schema.Struct({
      config: CompareMergeConfig,
      attempt: Schema.optionalKey(Schema.Finite),
      status: Schema.Literals([
        "waiting",
        "dispatching",
        "generating",
        "uncertain",
        "failed",
        "insufficient",
        "completed",
      ]),
      error: Schema.optionalKey(Schema.String),
    }),
  ),
});
export type CompareRun = typeof CompareRunSchema.Type;

const PersistedCompareRunState = Schema.Struct({
  runs: Schema.Array(CompareRunSchema),
});
type PersistedCompareRunState = typeof PersistedCompareRunState.Type;

const decodePersistedCompareRunState = Schema.decodeUnknownSync(PersistedCompareRunState);

/**
 * Runs include answer snapshots and share the app's localStorage quota
 * with the composer drafts and the prompt stash. Older runs drop off rather
 * than competing with stores whose loss the user would actually notice.
 */
export const MAX_COMPARE_RUNS = 25;

/**
 * Reading the `localStorage` property itself can throw `SecurityError` when
 * storage is blocked by policy, so the access is guarded rather than just
 * the get/set calls on it — otherwise importing this module would crash the
 * app at load. A blocked store degrades to in-memory: the grid works for
 * this session and the run is gone after a reload.
 */
function resolveBaseStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Fall through to the in-memory fallback.
  }
  return null;
}

const baseCompareRunStorage = resolveBaseStorage();

function persistRuns(runs: ReadonlyArray<CompareRun>): boolean {
  if (!baseCompareRunStorage) return false;
  try {
    baseCompareRunStorage.setItem(
      COMPARE_RUN_STORAGE_KEY,
      JSON.stringify({ version: COMPARE_RUN_STORAGE_VERSION, state: { runs } }),
    );
    return true;
  } catch (error) {
    // A failed write only costs the grid after a reload, and the threads it
    // points at are already running. Nothing is rolled back.
    console.error("[COMPARE] Could not persist compare runs (storage quota?).", error);
    return false;
  }
}

function readPersistedRuns(): ReadonlyArray<CompareRun> | null {
  if (!baseCompareRunStorage) return null;
  try {
    const raw = baseCompareRunStorage.getItem(COMPARE_RUN_STORAGE_KEY);
    if (typeof raw !== "string" || raw.length === 0) return null;
    const parsed: unknown = JSON.parse(raw);
    const state = (parsed as { state?: unknown } | null)?.state;
    if (!state) return null;
    return decodePersistedCompareRunState(state).runs;
  } catch {
    return null;
  }
}

export type ComparisonSaveResult = "saved" | "session-only" | "failed" | "missing";

interface CompareRunStoreState {
  runs: ReadonlyArray<CompareRun>;
  /** Records a finished fan-out, evicting the oldest run past the cap. */
  recordRun: (run: CompareRun) => void;
  updateRun: (runId: string, update: (run: CompareRun) => CompareRun) => void;
  getRun: (runId: string) => CompareRun | null;
  renameRun: (runId: string, title: string) => ComparisonSaveResult;
  removeRun: (runId: string) => ComparisonSaveResult;
}

export const useCompareRunStore = create<CompareRunStoreState>()((set, get) => ({
  runs: [],
  recordRun: (run) => {
    const candidates = [
      run,
      ...(readPersistedRuns() ?? get().runs).filter((candidate) => candidate.id !== run.id),
    ];
    const nextRuns = candidates.filter(
      (candidate, index) =>
        index < MAX_COMPARE_RUNS ||
        (candidate.automatic &&
          !["completed", "insufficient", "failed"].includes(candidate.automatic.status)),
    );
    persistRuns(nextRuns);
    set(() => ({ runs: nextRuns }));
  },
  updateRun: (runId, update) => {
    const currentRuns = readPersistedRuns() ?? get().runs;
    const nextRuns = currentRuns.map((run) => (run.id === runId ? update(run) : run));
    if (nextRuns.every((run, index) => run === currentRuns[index])) return;
    persistRuns(nextRuns);
    set({ runs: nextRuns });
  },
  getRun: (runId) => get().runs.find((candidate) => candidate.id === runId) ?? null,
  renameRun: (runId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return "failed";
    const currentRuns = readPersistedRuns() ?? get().runs;
    if (!currentRuns.some((run) => run.id === runId)) return "missing";
    const nextRuns = currentRuns.map((run) =>
      run.id === runId ? { ...run, title: trimmed } : run,
    );
    if (baseCompareRunStorage && !persistRuns(nextRuns)) return "failed";
    set({ runs: nextRuns });
    return baseCompareRunStorage ? "saved" : "session-only";
  },
  removeRun: (runId) => {
    const currentRuns = readPersistedRuns() ?? get().runs;
    if (!currentRuns.some((run) => run.id === runId)) return "missing";
    const nextRuns = currentRuns.filter((candidate) => candidate.id !== runId);
    if (baseCompareRunStorage && !persistRuns(nextRuns)) return "failed";
    set(() => ({ runs: nextRuns }));
    return baseCompareRunStorage ? "saved" : "session-only";
  },
}));

export function newCompareRunId(): string {
  return `cmp_${randomUUID()}`;
}

/** Late dispatch receipts update an existing slot, never recreate a removed group. */
export function settleComparisonEntry(runId: string, index: number, entry: CompareRunEntry) {
  useCompareRunStore.getState().updateRun(runId, (current) => ({
    ...current,
    entries: current.entries.map((existing, slot) =>
      slot === index
        ? {
            ...entry,
            ...(existing.label ? { label: existing.label } : {}),
            ...(existing.original ? { original: existing.original } : {}),
            ...(existing.deleted ? { deleted: true, threadId: existing.threadId } : {}),
          }
        : existing,
    ),
  }));
}

/** Call only after a successful native deletion or an explicit thread.deleted event. */
export function markComparisonThreadDeleted(environmentId: EnvironmentId, threadId: ThreadId) {
  for (const run of readPersistedRuns() ?? useCompareRunStore.getState().runs) {
    if (run.environmentId !== environmentId) continue;
    useCompareRunStore.getState().updateRun(run.id, (current) =>
      current.entries.some((entry) => entry.threadId === threadId && !entry.deleted)
        ? {
            ...current,
            entries: current.entries.map((entry) =>
              entry.threadId === threadId ? { ...entry, deleted: true } : entry,
            ),
          }
        : current,
    );
  }
}

// Grouping remains last-write-wins; the separate locked attempt ledger owns dispatch identity.
// An interrupted send is reconciled through its known thread, never automatically replayed.
const persistedRuns = readPersistedRuns();
if (persistedRuns !== null) {
  useCompareRunStore.setState({
    runs: persistedRuns.map((run) =>
      run.automatic?.status === "dispatching"
        ? {
            ...run,
            automatic: {
              ...run.automatic,
              status: "uncertain",
              error: "Reopened while sending. Check the merge thread; no new request was sent.",
            },
          }
        : run,
    ),
  });
}

/** Dispatch must stop when its durable claim cannot be stored. Call under the run's Web Lock. */
export function saveComparisonClaim(run: CompareRun): boolean {
  const runs = readPersistedRuns();
  if (!runs?.some((candidate) => candidate.id === run.id)) return false;
  const next = runs.map((candidate) => (candidate.id === run.id ? run : candidate));
  if (!persistRuns(next)) return false;
  useCompareRunStore.setState({ runs: next });
  return true;
}
export function readDurableComparison(runId: string): CompareRun | null {
  return readPersistedRuns()?.find((run) => run.id === runId) ?? null;
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === COMPARE_RUN_STORAGE_KEY) {
      const runs = readPersistedRuns();
      if (runs) useCompareRunStore.setState({ runs });
    }
  });
}
