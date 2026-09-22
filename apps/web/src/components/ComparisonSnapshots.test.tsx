import { act } from "react";
import { create } from "react-test-renderer";
import { expect, it, vi } from "vite-plus/test";
import { EnvironmentId, ProviderInstanceId } from "@t3tools/contracts";
import type { CompareRun } from "../compareRunStore";
const dispatch = vi.hoisted(() => vi.fn());
vi.mock("../automaticComparison", () => ({ dispatchAutomaticComparison: dispatch }));
vi.mock("../state/use-atom-command", () => ({ useAtomCommand: () => dispatch }));
import { ComparisonSnapshots } from "./ComparisonSnapshots";
it("reopening an old pending automatic comparison preserves it without sending a merge", async () => {
  const run: CompareRun = {
    id: "legacy-waiting",
    createdAt: "2026-09-21T00:00:00Z",
    environmentId: EnvironmentId.make("fixture"),
    prompt: "Historical prompt",
    entries: [],
    automatic: {
      status: "waiting",
      config: {
        direction: "Old direction",
        modelSelection: { instanceId: ProviderInstanceId.make("fixture"), model: "old-model" },
      },
    },
  };
  const before = structuredClone(run);
  let renderer!: ReturnType<typeof create>;
  await act(() => {
    renderer = create(<ComparisonSnapshots run={run} />);
  });
  await act(() => renderer.unmount());
  await act(() => {
    renderer = create(<ComparisonSnapshots run={run} />);
  });
  expect(dispatch).not.toHaveBeenCalled();
  expect(run).toEqual(before);
  await act(() => renderer.unmount());
});
