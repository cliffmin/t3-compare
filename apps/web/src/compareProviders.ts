import type { ModelSelection, ProviderInstanceId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";

import { isProviderInstancePickerReady, type ProviderInstanceEntry } from "./providerInstances";
import type { ModelEsque } from "./components/chat/providerIconUtils";

/** Select one usable model per ready instance, preferring its advertised default. */
export function selectComparisonModels(
  entries: ReadonlyArray<ProviderInstanceEntry>,
  models: ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>>,
  disabledReason: (instanceId: ProviderInstanceId, model: string) => string | null,
): ModelSelection[] {
  return entries.flatMap((entry) => {
    if (!isProviderInstancePickerReady(entry)) return [];
    const available = (models.get(entry.instanceId) ?? []).filter(
      (model) => !model.isUnavailable && disabledReason(entry.instanceId, model.slug) === null,
    );
    const model = available.find((candidate) => candidate.isDefault) ?? available[0];
    return model ? [createModelSelection(entry.instanceId, model.slug)] : [];
  });
}

/** Replacing a model drops its old options; editing another instance leaves this one untouched. */
export function updateComparisonSelection(
  selections: ReadonlyArray<ModelSelection>,
  selection: ModelSelection,
): ModelSelection[] {
  const existing = selections.some((item) => item.instanceId === selection.instanceId);
  return existing
    ? selections.map((item) => (item.instanceId === selection.instanceId ? selection : item))
    : [...selections, selection];
}

export function comparisonSelectionSummary(selection: ModelSelection): string {
  const options =
    selection.options?.map(
      (option) => `${option.id.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${String(option.value)}`,
    ) ?? [];
  return [selection.model, ...(options.length > 0 ? options : ["Default options"])].join(" · ");
}
