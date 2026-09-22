import { EnvironmentId, ModelSelection, ProviderInstanceId } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { create } from "zustand";
import { getProviderModelCapabilities } from "./providerModels";
import type { ProviderInstanceEntry } from "./providerInstances";
import { updateComparisonSelection, withComparisonDefaults } from "./compareProviders";

export const COMPARISON_PREFERENCES_KEY = "t3compare:comparison-preferences:v1";
const Preferences = Schema.Struct({
  checked: Schema.Array(ProviderInstanceId),
  configurations: Schema.Array(ModelSelection),
  reasons: Schema.Record(Schema.String, Schema.String),
});
export type ComparisonPreferences = typeof Preferences.Type;
const Persisted = Schema.Struct({
  version: Schema.Literal(1),
  environments: Schema.Record(EnvironmentId, Preferences),
});
const decodePreferences = Schema.decodeUnknownSync(Persisted);
export const EMPTY_COMPARISON_PREFERENCES: ComparisonPreferences = {
  checked: [],
  configurations: [],
  reasons: {},
};
export type ComparisonCatalog = {
  authoritative: boolean;
  entries: ReadonlyArray<ProviderInstanceEntry>;
  planModeEnabled: boolean;
};
export type ComparisonAvailability =
  | { status: "valid" }
  | { status: "unknown" | "invalid"; reason: string };

/** Only live connected configuration plus a successful provider probe proves model/option absence. */
export function validateComparisonSelection(
  selection: ModelSelection,
  catalog: ComparisonCatalog,
): ComparisonAvailability {
  if (!catalog.authoritative)
    return { status: "unknown", reason: "Waiting for the connected environment's model catalog." };
  const entry = catalog.entries.find((item) => item.instanceId === selection.instanceId);
  if (!entry)
    return { status: "invalid", reason: "This provider instance is no longer configured." };
  if (!entry.enabled || !entry.isAvailable || entry.status !== "ready")
    return {
      status: "unknown",
      reason: `${entry.displayName} is unavailable; the saved configuration is retained.`,
    };
  const model = entry.models.find((item) => item.slug === selection.model);
  if (!model)
    return {
      status: "invalid",
      reason: `Saved model ${selection.model} is no longer available. Choose a model to continue.`,
    };
  if (model.capabilities === null)
    return { status: "unknown", reason: "Waiting for model option capabilities." };
  const descriptors =
    getProviderModelCapabilities(
      entry.models,
      selection.model,
      entry.driverKind,
      catalog.planModeEnabled,
    ).optionDescriptors ?? [];
  for (const option of selection.options ?? []) {
    const descriptor = descriptors.find((item) => item.id === option.id);
    if (!descriptor)
      return {
        status: "invalid",
        reason: `Saved option ${option.id} is no longer supported by ${selection.model}. Select a model to reset incompatible options.`,
      };
    if (
      descriptor.type === "boolean"
        ? typeof option.value !== "boolean"
        : typeof option.value !== "string" ||
          !descriptor.options.some((value) => value.id === option.value)
    )
      return {
        status: "invalid",
        reason: `Saved value ${String(option.value)} for ${descriptor.label || option.id} is no longer supported. Select a model to reset incompatible options.`,
      };
  }
  return { status: "valid" };
}

export function freezeComparisonSelection(
  selection: ModelSelection,
  catalog: ComparisonCatalog,
): ModelSelection {
  if (validateComparisonSelection(selection, catalog).status !== "valid") return selection;
  return withComparisonDefaults(
    catalog.entries.find((entry) => entry.instanceId === selection.instanceId)!,
    selection,
    catalog.planModeEnabled,
  );
}

/** Unknown availability never writes preferences. Invalidated choices stay unchecked until an explicit edit. */
export function reconcileComparisonPreferences(
  value: ComparisonPreferences,
  catalog: ComparisonCatalog,
): ComparisonPreferences {
  let next = value;
  for (const instanceId of value.checked) {
    const selection = value.configurations.find((item) => item.instanceId === instanceId);
    if (!selection) continue;
    const result = validateComparisonSelection(selection, catalog);
    if (result.status === "invalid")
      next = {
        ...next,
        checked: next.checked.filter((id) => id !== instanceId),
        reasons: { ...next.reasons, [instanceId]: result.reason },
      };
    else if (result.status === "valid") {
      const frozen = freezeComparisonSelection(selection, catalog);
      if (JSON.stringify(frozen) !== JSON.stringify(selection))
        next = { ...next, configurations: updateComparisonSelection(next.configurations, frozen) };
    }
  }
  return next;
}

export function editComparisonPreferences(
  value: ComparisonPreferences,
  selection: ModelSelection,
  checked?: boolean,
): ComparisonPreferences {
  const { [selection.instanceId]: _reason, ...reasons } = value.reasons;
  return {
    configurations: updateComparisonSelection(value.configurations, selection),
    checked:
      checked === undefined
        ? value.checked
        : checked
          ? value.checked.includes(selection.instanceId)
            ? value.checked
            : [...value.checked, selection.instanceId]
          : value.checked.filter((id) => id !== selection.instanceId),
    reasons,
  };
}
export function checkedComparisonSelections(
  value: ComparisonPreferences,
): ReadonlyArray<ModelSelection> {
  return value.checked.flatMap((id) => {
    const selection = value.configurations.find((item) => item.instanceId === id);
    return selection ? [selection] : [];
  });
}
export function comparisonSendBlockReason(
  selections: ReadonlyArray<ModelSelection> | null,
  catalog: ComparisonCatalog,
): string | null {
  if (selections === null) return null;
  for (const selection of selections) {
    const result = validateComparisonSelection(selection, catalog);
    if (result.status !== "valid") return result.reason;
  }
  return selections.length < 2 ? "Select at least two available providers." : null;
}

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export function createComparisonPreferencesStore(storage?: Storage) {
  let environments: Readonly<Record<string, ComparisonPreferences>> = {};
  try {
    const raw = storage?.getItem(COMPARISON_PREFERENCES_KEY);
    if (raw) environments = decodePreferences(JSON.parse(raw)).environments;
  } catch {
    /* A malformed record must not prevent native single-thread use. */
  }
  return create<{
    environments: Readonly<Record<string, ComparisonPreferences>>;
    drafts: Readonly<Record<string, ComparisonPreferences>>;
    openDraft: (
      key: string,
      environmentId: EnvironmentId,
      fallback: ComparisonPreferences,
    ) => ComparisonPreferences;
    editDraft: (key: string, environmentId: EnvironmentId, value: ComparisonPreferences) => void;
    reconcile: (key: string, environmentId: EnvironmentId, catalog: ComparisonCatalog) => void;
    clearDraft: (key: string) => void;
  }>((set, get) => {
    const persist = (values: Readonly<Record<string, ComparisonPreferences>>) => {
      try {
        storage?.setItem(
          COMPARISON_PREFERENCES_KEY,
          JSON.stringify({ version: 1, environments: values }),
        );
      } catch {
        /* Keep the usable in-memory configuration when storage is blocked. */
      }
    };
    return {
      environments,
      drafts: {},
      openDraft: (key, environmentId, fallback) => {
        const value = get().drafts[key] ?? get().environments[environmentId] ?? fallback;
        if (!get().drafts[key]) set((state) => ({ drafts: { ...state.drafts, [key]: value } }));
        return value;
      },
      editDraft: (key, environmentId, value) => {
        const next = { ...get().environments, [environmentId]: value };
        persist(next);
        set((state) => ({ environments: next, drafts: { ...state.drafts, [key]: value } }));
      },
      reconcile: (key, environmentId, catalog) => {
        const state = get();
        const saved = state.environments[environmentId];
        const draft = state.drafts[key];
        const nextSaved = saved ? reconcileComparisonPreferences(saved, catalog) : saved;
        const nextDraft = draft ? reconcileComparisonPreferences(draft, catalog) : draft;
        if (saved === nextSaved && draft === nextDraft) return;
        const nextEnvironments = nextSaved
          ? { ...state.environments, [environmentId]: nextSaved }
          : state.environments;
        if (saved !== nextSaved) persist(nextEnvironments);
        set({
          environments: nextEnvironments,
          drafts: nextDraft ? { ...state.drafts, [key]: nextDraft } : state.drafts,
        });
      },
      clearDraft: (key) =>
        set((state) => {
          const { [key]: _removed, ...drafts } = state.drafts;
          return { drafts };
        }),
    };
  });
}
function browserStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
export const useComparisonPreferences = createComparisonPreferencesStore(browserStorage());
