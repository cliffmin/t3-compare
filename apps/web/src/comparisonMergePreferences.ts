import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ModelSelection } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

const decodePreferences = Schema.decodeUnknownSync(
  Schema.Struct({
    selections: Schema.Record(Schema.String, ModelSelection),
    directions: Schema.Record(Schema.String, Schema.String),
  }),
);

/** Model preferences survive new prompts; direction is scoped to one composer draft. */
export const useComparisonMergePreferences = create<{
  selections: Record<string, ModelSelection>;
  directions: Record<string, string>;
  select: (environmentId: string, selection: ModelSelection) => void;
  direct: (draftKey: string, direction: string) => void;
}>()(
  persist(
    (set) => ({
      selections: {},
      directions: {},
      select: (environmentId, selection) =>
        set((state) => ({ selections: { ...state.selections, [environmentId]: selection } })),
      direct: (draftKey, direction) =>
        set((state) => ({ directions: { ...state.directions, [draftKey]: direction } })),
    }),
    {
      name: "t3code:comparison-merger:v1",
      merge: (saved, current) => {
        try {
          return { ...current, ...decodePreferences(saved) };
        } catch {
          return current;
        }
      },
    },
  ),
);
