import type { ReactNode } from "react";
import type { ModelSelection, ProviderInstanceId } from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { TraitsPicker, shouldRenderTraitsControls } from "./TraitsPicker";
import { withImplicitFastModeDefault } from "./composerProviderState";
import { getProviderModelCapabilities } from "../../providerModels";

export interface ComparisonPickerConfig {
  mergerSettings?: ReactNode;
  mergerSummary?: ReactNode;
  selections: ReadonlyArray<ModelSelection>;
  summarySelections: ReadonlyArray<ModelSelection>;
  canIncludeProvider: (instanceId: ProviderInstanceId) => boolean;
  onToggleProvider: (instanceId: ProviderInstanceId) => void;
  onModelChange: (instanceId: ProviderInstanceId, model: string) => void;
  renderOptions: (instanceId: ProviderInstanceId) => ReactNode;
}

export function ComparisonProviderOptions({
  entry,
  selection,
  planModeEnabled,
  onChange,
}: {
  entry: ProviderInstanceEntry;
  selection: ModelSelection;
  planModeEnabled: boolean;
  onChange: (selection: ModelSelection) => void;
}) {
  const modelOptions = withImplicitFastModeDefault(
    getProviderModelCapabilities(entry.models, selection.model, entry.driverKind, planModeEnabled),
    selection.options,
  );
  const input = {
    provider: entry.driverKind,
    instanceId: entry.instanceId,
    models: entry.models,
    model: selection.model,
    modelOptions,
    planModeEnabled,
    prompt: "",
    allowPromptInjectedEffort: false,
  };
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-primary/30 bg-primary/5 px-3 py-2"
      aria-label={`${entry.displayName} comparison options`}
    >
      <span className="text-xs font-medium">{entry.displayName}</span>
      <span className="text-xs text-muted-foreground">{selection.model}</span>
      {shouldRenderTraitsControls(input) ? (
        <TraitsPicker
          {...input}
          isComposerOwned
          onPromptChange={() => undefined}
          onModelOptionsChange={(options) =>
            onChange(createModelSelection(entry.instanceId, selection.model, options))
          }
          size="xs"
        />
      ) : (
        <span className="text-xs text-muted-foreground">No additional options</span>
      )}
    </div>
  );
}
