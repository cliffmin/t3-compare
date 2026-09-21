import { createModelSelection } from "@t3tools/shared/model";
import { getComposerProviderState } from "./components/chat/composerProviderState";
import { useCompareRunStore } from "./compareRunStore";
import {
  EnvironmentId,
  ThreadId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";
import { deriveProviderInstanceEntries } from "./providerInstances";
import {
  selectComparisonModels,
  updateComparisonSelection,
  comparisonSelectionSummary,
} from "./compareProviders";

function provider(id: string, overrides: Partial<ServerProvider> = {}): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(id),
    driver: ProviderDriverKind.make("codex"),
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-09-20T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
    ...overrides,
  };
}

describe("selectComparisonModels", () => {
  it("keeps custom instances separate and prefers defaults over catalog order", () => {
    const entries = deriveProviderInstanceEntries([provider("codex"), provider("personal")]);
    const options = [
      { slug: "first", name: "First" },
      { slug: "default", name: "Default", isDefault: true },
    ];
    const models = new Map(entries.map((entry) => [entry.instanceId, options]));
    expect(selectComparisonModels(entries, models, () => null)).toEqual([
      { instanceId: "codex", model: "default" },
      { instanceId: "personal", model: "default" },
    ]);
  });

  it("excludes disabled, unavailable and errored providers and models blocked for this prompt", () => {
    const entries = deriveProviderInstanceEntries([
      provider("ready"),
      provider("disabled", { enabled: false }),
      provider("unavailable", { availability: "unavailable" }),
      provider("failed", { status: "error" }),
      provider("empty"),
    ]);
    const models = new Map(
      entries.slice(0, 4).map((entry) => [
        entry.instanceId,
        [
          { slug: "offline", name: "Offline", isDefault: true, isUnavailable: true },
          { slug: "blocked", name: "Blocked", isDefault: true },
          { slug: "usable", name: "Usable" },
        ],
      ]),
    );
    expect(
      selectComparisonModels(entries, models, (_, model) =>
        model === "blocked" ? "Unsupported attachment" : null,
      ),
    ).toEqual([{ instanceId: "ready", model: "usable" }]);
  });
});

describe("comparison configuration dispatch", () => {
  it("keeps different efforts for two instances and drops stale options when replacing a model", () => {
    const first = createModelSelection(ProviderInstanceId.make("codex"), "model-a", [
      { id: "reasoningEffort", value: "high" },
    ]);
    const second = createModelSelection(ProviderInstanceId.make("personal"), "model-a", [
      { id: "reasoningEffort", value: "low" },
    ]);
    const selected = updateComparisonSelection([first], second);
    const models = [
      {
        slug: "model-a",
        name: "Model A",
        isCustom: false,
        capabilities: {
          optionDescriptors: [
            {
              id: "reasoningEffort",
              label: "Reasoning effort",
              type: "select" as const,
              options: [
                { id: "low", label: "Low" },
                { id: "medium", label: "Medium", isDefault: true },
                { id: "high", label: "High" },
              ],
              currentValue: "medium",
            },
          ],
        },
      },
    ];
    const prepared = selected.map(
      (selection) =>
        getComposerProviderState({
          provider: ProviderDriverKind.make("codex"),
          model: selection.model,
          models,
          modelOptions: selection.options,
          planModeEnabled: false,
        }).modelOptionsForDispatch,
    );
    expect(prepared).toEqual([
      [{ id: "reasoningEffort", value: "high" }],
      [{ id: "reasoningEffort", value: "low" }],
    ]);
    const changed = updateComparisonSelection(
      selected,
      createModelSelection(first.instanceId, "model-b"),
    );
    expect(changed[0]).toEqual({ instanceId: "codex", model: "model-b" });
    expect(changed[1]).toBe(second);
    expect(first.options).toEqual([{ id: "reasoningEffort", value: "high" }]);
  });

  it("records the submitted options without losing explicit false values", () => {
    const run = {
      id: "comparison-options-test",
      createdAt: "2026-09-20T00:00:00.000Z",
      environmentId: EnvironmentId.make("test-env"),
      prompt: "Compare this",
      entries: [
        {
          threadId: ThreadId.make("thread-test"),
          instanceId: ProviderInstanceId.make("cursor"),
          model: "model-a",
          options: [{ id: "fastMode", value: false }],
        },
      ],
    };
    useCompareRunStore.getState().recordRun(run);
    expect(useCompareRunStore.getState().getRun(run.id)?.entries[0]?.options).toEqual([
      { id: "fastMode", value: false },
    ]);
    expect(comparisonSelectionSummary(run.entries[0]!)).toContain("fast Mode: false");
    useCompareRunStore.getState().removeRun(run.id);
  });
});
