import { EnvironmentId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { create } from "zustand";

import { randomUUID } from "./lib/utils";

export const COMPARE_RUN_STORAGE_KEY = "t3code:compare-runs:v1";
const COMPARE_RUN_STORAGE_VERSION = 1;

/**
 * Compare runs are a client-side grouping over threads the server already
 * owns. The orchestration log has no notion of them: a run holds only the
 * thread ids the draft fan-out produced, and every column re-reads its
 * thread from the normal subscription. Nothing here is authoritative, so a
 * lost or undecodable run costs the grid, never the work — the threads
 * remain in the sidebar either way.
 */
const CompareRunEntrySchema = Schema.Struct({
  /**
   * The thread this provider is answering in, or null when its request
   * never started one. A provider that failed to launch is a result of the
   * comparison, not an omission from it — dropping it would leave the grid
   * quietly narrower than the set of providers that were asked.
   */
  threadId: Schema.NullOr(ThreadId),
  instanceId: ProviderInstanceId,
  model: Schema.String,
  /** Why the request never started. Only set when `threadId` is null. */
  startError: Schema.optionalKey(Schema.String),
});
export type CompareRunEntry = typeof CompareRunEntrySchema.Type;

const CompareRunSchema = Schema.Struct({
  id: Schema.String,
  createdAt: Schema.String,
  environmentId: EnvironmentId,
  /** The prompt every column received, shown once above the grid. */
  prompt: Schema.String,
  entries: Schema.Array(CompareRunEntrySchema),
});
export type CompareRun = typeof CompareRunSchema.Type;

const PersistedCompareRunState = Schema.Struct({
  runs: Schema.Array(CompareRunSchema),
});
type PersistedCompareRunState = typeof PersistedCompareRunState.Type;

const decodePersistedCompareRunState = Schema.decodeUnknownSync(PersistedCompareRunState);

/**
 * Runs are small (a prompt and a few ids), but they accumulate for as long
 * as the origin keeps its localStorage, and they share the app's ~5MB quota
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

function persistRuns(runs: ReadonlyArray<CompareRun>): void {
  if (!baseCompareRunStorage) return;
  try {
    baseCompareRunStorage.setItem(
      COMPARE_RUN_STORAGE_KEY,
      JSON.stringify({ version: COMPARE_RUN_STORAGE_VERSION, state: { runs } }),
    );
  } catch (error) {
    // A failed write only costs the grid after a reload, and the threads it
    // points at are already running. Nothing is rolled back.
    console.error("[COMPARE] Could not persist compare runs (storage quota?).", error);
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

interface CompareRunStoreState {
  runs: ReadonlyArray<CompareRun>;
  /** Records a finished fan-out, evicting the oldest run past the cap. */
  recordRun: (run: CompareRun) => void;
  getRun: (runId: string) => CompareRun | null;
  removeRun: (runId: string) => void;
}

export const useCompareRunStore = create<CompareRunStoreState>()((set, get) => ({
  runs: [],
  recordRun: (run) => {
    const nextRuns = [run, ...get().runs.filter((candidate) => candidate.id !== run.id)].slice(
      0,
      MAX_COMPARE_RUNS,
    );
    persistRuns(nextRuns);
    set(() => ({ runs: nextRuns }));
  },
  getRun: (runId) => get().runs.find((candidate) => candidate.id === runId) ?? null,
  removeRun: (runId) => {
    const nextRuns = get().runs.filter((candidate) => candidate.id !== runId);
    persistRuns(nextRuns);
    set(() => ({ runs: nextRuns }));
  },
}));

export function newCompareRunId(): string {
  return `cmp_${randomUUID()}`;
}

// Hydrate once at startup. Like the app's other persisted stores, tabs are
// last-write-wins: no cross-tab merging or storage-event syncing.
const persistedRuns = readPersistedRuns();
if (persistedRuns !== null) {
  useCompareRunStore.setState({ runs: persistedRuns });
}
