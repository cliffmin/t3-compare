import { act, useEffect } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import type { CompareMerge } from "./compareRunStore";
import { useComparisonMergeDraft } from "./useComparisonMergeDraft";

let renderer: ReactTestRenderer | undefined;
let draft: ReturnType<typeof useComparisonMergeDraft>;
function Probe({ merge }: { merge: CompareMerge }) {
  const current = useComparisonMergeDraft(merge);
  useEffect(() => {
    draft = current;
  }, [current]);
  return null;
}
const version = (id: string): CompareMerge => ({
  threadId: ThreadId.make(id),
  createdAt: "2026-09-21T00:00:00.000Z",
  modelSelection: { instanceId: ProviderInstanceId.make(id), model: id },
  instructions: `instructions-${id}`,
  direction: `direction-${id}`,
});
afterEach(async () => {
  await act(() => renderer?.unmount());
});

describe("merge version edit settings", () => {
  it("preserves edits on the same version but resets all settings when navigating to another saved version", async () => {
    const first = version("one");
    const second = version("two");
    await act(() => {
      renderer = create(<Probe merge={first} />);
    });
    await act(() => {
      draft.setDirection("unsaved");
      draft.setInstructions("custom");
      draft.setChosen(second.modelSelection);
    });
    await act(() => {
      renderer!.update(<Probe merge={{ ...first }} />);
    });
    expect(draft.direction).toBe("unsaved");
    await act(() => {
      renderer!.update(<Probe merge={second} />);
    });
    expect([draft.direction, draft.instructions, draft.chosen]).toEqual([
      second.direction,
      second.instructions,
      second.modelSelection,
    ]);
    await act(() => {
      renderer!.update(<Probe merge={first} />);
    });
    expect([draft.direction, draft.instructions, draft.chosen]).toEqual([
      first.direction,
      first.instructions,
      first.modelSelection,
    ]);
  });
});
