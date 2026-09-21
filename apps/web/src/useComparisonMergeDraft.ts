import { useState } from "react";
import type { ModelSelection } from "@t3tools/contracts";
import type { CompareMerge } from "./compareRunStore";
import { DEFAULT_MERGE_INSTRUCTIONS } from "./compareMerge";

function initialDraft(merge: CompareMerge | undefined) {
  return {
    versionId: merge?.threadId ?? null,
    chosen: merge?.modelSelection ?? (null as ModelSelection | null),
    instructions: merge?.instructions ?? DEFAULT_MERGE_INSTRUCTIONS,
    direction: merge?.direction ?? "",
  };
}

/** A different saved version starts from that version's settings, never a prior draft's edits. */
export function useComparisonMergeDraft(merge: CompareMerge | undefined) {
  const [saved, setSaved] = useState(() => initialDraft(merge));
  const draft = saved.versionId === (merge?.threadId ?? null) ? saved : initialDraft(merge);
  if (draft !== saved) setSaved(draft);
  return {
    ...draft,
    setChosen: (chosen: ModelSelection | null) => setSaved((current) => ({ ...current, chosen })),
    setInstructions: (instructions: string) =>
      setSaved((current) => ({ ...current, instructions })),
    setDirection: (direction: string) => setSaved((current) => ({ ...current, direction })),
  };
}
