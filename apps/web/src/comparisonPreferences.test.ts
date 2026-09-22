import { describe, expect, it } from "vite-plus/test";
import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { deriveProviderInstanceEntries } from "./providerInstances";
import { comparisonSelectionSummary, withComparisonDefaults } from "./compareProviders";
import {
  COMPARISON_PREFERENCES_KEY,
  EMPTY_COMPARISON_PREFERENCES,
  checkedComparisonSelections,
  comparisonSendBlockReason,
  createComparisonPreferencesStore,
  editComparisonPreferences,
  freezeComparisonSelection,
  reconcileComparisonPreferences,
  validateComparisonSelection,
  type ComparisonCatalog,
} from "./comparisonPreferences";

const a = ProviderInstanceId.make("a");
const b = ProviderInstanceId.make("b");
const env = EnvironmentId.make("environment-one");
const other = EnvironmentId.make("environment-two");
const descriptors = [
  {
    id: "reasoningEffort",
    label: "Reasoning effort",
    type: "select" as const,
    options: [
      { id: "medium", label: "Medium", isDefault: true },
      { id: "high", label: "High" },
    ],
  },
  { id: "fastMode", label: "Fast mode", type: "boolean" as const, currentValue: false },
] as const;
function provider(instanceId = a, patch: Partial<ServerProvider> = {}): ServerProvider {
  return {
    instanceId,
    driver: ProviderDriverKind.make("codex"),
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-09-22T00:00:00Z",
    models: [
      {
        slug: "legacy",
        name: "Legacy test",
        isLegacy: true,
        isCustom: false,
        capabilities: { optionDescriptors: descriptors },
      },
    ],
    slashCommands: [],
    skills: [],
    ...patch,
  };
}
function catalog(providers = [provider(), provider(b)], authoritative = true): ComparisonCatalog {
  return {
    entries: deriveProviderInstanceEntries(providers),
    authoritative,
    planModeEnabled: true,
  };
}
const high = createModelSelection(a, "legacy", [{ id: "reasoningEffort", value: "high" }]);
const beta = createModelSelection(b, "legacy", [{ id: "reasoningEffort", value: "medium" }]);
const prefs = editComparisonPreferences(
  editComparisonPreferences(EMPTY_COMPARISON_PREFERENCES, high, true),
  beta,
  true,
);
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("remembered comparison intent", () => {
  it("persists explicit edits and selection order across clients, environments and unchecked toggles", () => {
    const disk = storage();
    const store = createComparisonPreferencesStore(disk);
    store.getState().openDraft("first", env, prefs);
    const frozen = reconcileComparisonPreferences(prefs, catalog());
    store.getState().editDraft("first", env, frozen);
    store
      .getState()
      .editDraft(
        "elsewhere",
        other,
        editComparisonPreferences(EMPTY_COMPARISON_PREFERENCES, beta, true),
      );
    const restart = createComparisonPreferencesStore(disk);
    expect(restart.getState().drafts).toEqual({});
    expect(
      restart.getState().openDraft("second-project", env, EMPTY_COMPARISON_PREFERENCES),
    ).toEqual(frozen);
    expect(restart.getState().environments[other]?.checked).toEqual([b]);
    const unchecked = editComparisonPreferences(frozen, high, false);
    restart.getState().editDraft("second-project", env, unchecked);
    const again = createComparisonPreferencesStore(disk).getState().environments[env]!;
    expect(again.checked).toEqual([b]);
    expect(again.configurations.find((x) => x.instanceId === a)).toEqual(high);
    expect(editComparisonPreferences(again, high, true).checked).toEqual([b, a]);
  });
  it("copies defaults at draft opening without changing another active draft or historical selection", () => {
    const store = createComparisonPreferencesStore(storage());
    store.getState().editDraft("old", env, prefs);
    const old = store.getState().openDraft("old", env, EMPTY_COMPARISON_PREFERENCES);
    const historical = structuredClone(old.configurations);
    store.getState().openDraft("new", env, EMPTY_COMPARISON_PREFERENCES);
    const changed = editComparisonPreferences(prefs, createModelSelection(a, "replacement"), false);
    store.getState().editDraft("new", env, changed);
    expect(store.getState().drafts.old).toBe(old);
    expect(old.configurations).toEqual(historical);
    store.getState().clearDraft("new");
    expect(store.getState().openDraft("new", env, EMPTY_COMPARISON_PREFERENCES)).toEqual(changed);
  });
  it.each([true, false])(
    "reopening an older draft never replaces newer defaults (online=%s)",
    (authoritative) => {
      const disk = storage();
      const store = createComparisonPreferencesStore(disk);
      const x = reconcileComparisonPreferences(prefs, catalog());
      store.getState().editDraft("A", env, x);
      store.getState().openDraft("B", env, EMPTY_COMPARISON_PREFERENCES, catalog());
      const y = editComparisonPreferences(
        x,
        createModelSelection(a, "legacy", [
          { id: "reasoningEffort", value: "medium" },
          { id: "fastMode", value: false },
        ]),
      );
      store.getState().editDraft("B", env, y);
      const persisted = disk.getItem(COMPARISON_PREFERENCES_KEY);
      // This is the same restore operation used by the off -> on toggle.
      expect(
        store
          .getState()
          .openDraft("A", env, EMPTY_COMPARISON_PREFERENCES, catalog(undefined, authoritative)),
      ).toEqual(x);
      expect(disk.getItem(COMPARISON_PREFERENCES_KEY)).toBe(persisted);
      expect(store.getState().drafts.B).toEqual(y);
      expect(store.getState().openDraft("C", env, EMPTY_COMPARISON_PREFERENCES, catalog())).toEqual(
        y,
      );
      expect(createComparisonPreferencesStore(disk).getState().environments[env]).toEqual(y);
    },
  );
  it("keeps an explicit empty checked set instead of reseeding it", () => {
    const disk = storage();
    const store = createComparisonPreferencesStore(disk);
    store.getState().editDraft("empty", env, { ...prefs, checked: [] });
    expect(
      createComparisonPreferencesStore(disk).getState().openDraft("new", env, prefs).checked,
    ).toEqual([]);
  });
  it("tolerates malformed or unavailable storage without destroying native use", () => {
    const disk = storage();
    disk.setItem(COMPARISON_PREFERENCES_KEY, '{"version":99}');
    expect(createComparisonPreferencesStore(disk).getState().environments).toEqual({});
    const store = createComparisonPreferencesStore({
      getItem() {
        throw Error("blocked");
      },
      setItem() {
        throw Error("blocked");
      },
    });
    store.getState().editDraft("one", env, prefs);
    expect(store.getState().environments[env]).toEqual(prefs);
  });
});

describe("catalog authority and exact values", () => {
  it.each(["loading", "offline", "cached", "refresh failure"])(
    "does not rewrite intent for unknown %s state",
    () => {
      const next = reconcileComparisonPreferences(prefs, catalog([], false));
      expect(next).toBe(prefs);
      expect(
        comparisonSendBlockReason(checkedComparisonSelections(next), catalog([], false)),
      ).toContain("Waiting");
    },
  );
  it.each([
    provider(a, { status: "warning", models: [] }),
    provider(a, { status: "error", models: [] }),
    provider(a, { enabled: false, status: "disabled", models: [] }),
    provider(a, { availability: "unavailable", models: [] }),
  ])("does not permanently invalidate transient provider state %#", (unavailable) => {
    expect(
      reconcileComparisonPreferences(prefs, catalog([unavailable, provider(b)])).checked,
    ).toEqual([a, b]);
    expect(validateComparisonSelection(high, catalog([unavailable])).status).toBe("unknown");
  });
  it("unchecks only the missing model, retains config and reason, never auto-rechecks after restoration", () => {
    const next = reconcileComparisonPreferences(
      prefs,
      catalog([provider(a, { models: [] }), provider(b)]),
    );
    expect(next.checked).toEqual([b]);
    expect(next.configurations).toEqual(
      prefs.configurations.map((s) =>
        s.instanceId === b ? freezeComparisonSelection(s, catalog()) : s,
      ),
    );
    expect(next.reasons[a]).toContain("legacy");
    expect(reconcileComparisonPreferences(next, catalog()).checked).toEqual([b]);
    expect(editComparisonPreferences(next, high, true).checked).toEqual([b, a]);
  });
  it("unchecks an absent instance only on authoritative configuration", () => {
    expect(reconcileComparisonPreferences(prefs, catalog([provider(b)])).checked).toEqual([b]);
    expect(reconcileComparisonPreferences(prefs, catalog([provider(b)], false))).toBe(prefs);
  });
  it.each([
    { id: "removedOption", value: "kept" },
    { id: "reasoningEffort", value: "removed-value" },
    { id: "fastMode", value: "false" },
  ])("rejects explicit invalid option $id without normalization", (option) => {
    const invalid = createModelSelection(a, "legacy", [option]);
    expect(validateComparisonSelection(invalid, catalog()).status).toBe("invalid");
    expect(freezeComparisonSelection(invalid, catalog())).toBe(invalid);
    expect(withComparisonDefaults(catalog().entries[0]!, invalid, true).options).toContainEqual(
      option,
    );
    expect(comparisonSendBlockReason([beta, invalid], catalog())).not.toBeNull();
  });
  it("freezes effective defaults against later advertised default drift", () => {
    const selected = freezeComparisonSelection(createModelSelection(a, "legacy"), catalog());
    expect(selected.options).toEqual([
      { id: "reasoningEffort", value: "medium" },
      { id: "fastMode", value: false },
    ]);
    const original = provider();
    const changed = provider(a, {
      models: [
        {
          ...original.models[0]!,
          capabilities: {
            optionDescriptors: [{ ...descriptors[0]!, currentValue: "high" }, descriptors[1]!],
          },
        },
      ],
    });
    expect(freezeComparisonSelection(selected, catalog([changed]))).toEqual(selected);
    expect(validateComparisonSelection(selected, catalog([changed])).status).toBe("valid");
  });
  it("legacy grouping is valid and summaries use capability labels", () => {
    expect(validateComparisonSelection(high, catalog())).toEqual({ status: "valid" });
    expect(comparisonSelectionSummary(high, descriptors)).toBe("legacy · Reasoning effort: high");
    expect(
      comparisonSelectionSummary(
        createModelSelection(a, "legacy", [{ id: "serviceTier", value: "priority" }]),
      ),
    ).toContain("Service tier: priority");
  });
  it("unknown model capability metadata blocks dispatch but preserves explicit intent", () => {
    const entry = provider(a, { models: [{ ...provider().models[0]!, capabilities: null }] });
    expect(validateComparisonSelection(high, catalog([entry])).status).toBe("unknown");
    const implicit = createModelSelection(a, "legacy");
    expect(validateComparisonSelection(implicit, catalog([entry])).status).toBe("unknown");
    expect(freezeComparisonSelection(implicit, catalog([entry]))).toBe(implicit);
    expect(comparisonSendBlockReason([implicit, beta], catalog([entry, provider(b)]))).toContain(
      "capabilities",
    );
    const knownEmpty = provider(a, {
      models: [{ ...provider().models[0]!, capabilities: { optionDescriptors: [] } }],
    });
    expect(validateComparisonSelection(implicit, catalog([knownEmpty])).status).toBe("valid");
    expect(reconcileComparisonPreferences(prefs, catalog([entry, provider(b)])).checked).toEqual([
      a,
      b,
    ]);
  });
  it("requires two valid configurations but leaves native single-provider mode alone", () => {
    expect(comparisonSendBlockReason(null, catalog([], false))).toBeNull();
    expect(comparisonSendBlockReason([high], catalog())).toContain("two");
    expect(comparisonSendBlockReason([high, beta], catalog())).toBeNull();
  });
});
