import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import { scopeThreadRef, scopedThreadKey } from "@t3tools/client-runtime/environment";
import type { CompareRun } from "./compareRunStore";
import type { SidebarListItem, SidebarSection } from "./components/Sidebar.logic";
import { comparisonSidebarGroups } from "./comparisonSidebar";

const environmentId = EnvironmentId.make("test");
const key = (id: string) => scopedThreadKey(scopeThreadRef(environmentId, ThreadId.make(id)));
const row = (id: string, section: SidebarSection): SidebarListItem => ({
  kind: "thread",
  key: key(id),
  section,
});
const selection = { instanceId: ProviderInstanceId.make("test"), model: "fixture" };
const run: CompareRun = {
  id: "run",
  environmentId,
  createdAt: "2026-09-21T00:00:00.000Z",
  prompt: "Prompt",
  entries: ["a", "b", "c"].map((id) => ({ ...selection, threadId: ThreadId.make(id) })),
  merges: [
    {
      threadId: ThreadId.make("merge"),
      createdAt: "2026-09-21T00:00:00.000Z",
      modelSelection: selection,
      instructions: "combine",
      direction: "",
      output: { title: "Saved", answer: "Answer", sources: [] },
    },
  ],
};

describe("comparison sidebar lifecycle", () => {
  it("shows the latest output in the parent's shelf and leaves other versions in their shelves", () => {
    const first = run.merges![0]!;
    const versioned = {
      ...run,
      merges: [
        first,
        { ...first, threadId: ThreadId.make("merge-two") },
        { ...first, threadId: ThreadId.make("merge-three") },
      ],
    };
    const { groups, byThread } = comparisonSidebarGroups(
      [versioned],
      [
        row("a", "active"),
        row("merge", "active"),
        row("merge-two", "active"),
        row("merge-three", "settled"),
      ],
    );
    expect(groups[0]?.output?.threadId).toBe("merge-two");
    expect(byThread.has(key("merge"))).toBe(true);
    expect(byThread.has(key("merge-two"))).toBe(true);
    expect(byThread.has(key("merge-three"))).toBe(false);
  });
  it("does not move active, snoozed or settled sessions into a pinned parent's shelf", () => {
    const { groups, byThread } = comparisonSidebarGroups(
      [run],
      [row("a", "pinned"), row("b", "active"), row("c", "snoozed"), row("merge", "settled")],
    );
    expect(groups).toHaveLength(1);
    expect([...groups[0]!.groupedKeys]).toEqual([key("a")]);
    expect(groups[0]?.output).toBeUndefined();
    expect(["b", "c", "merge"].some((id) => byThread.has(key(id)))).toBe(false);
  });
  it.each(["pinned", "active", "snoozed", "settled"] as const)(
    "groups visible members within %s only",
    (section) => {
      const { groups } = comparisonSidebarGroups(
        [run],
        [row("a", section), row("b", section), row("merge", section)],
      );
      expect([...groups[0]!.groupedKeys]).toEqual([key("a"), key("b"), key("merge")]);
      expect(groups[0]?.output?.threadId).toBe("merge");
      expect(groups[0]?.groupedKeys.has(key("c"))).toBe(false);
    },
  );
  it("does not expose a parent or output when all members are hidden or filtered out", () => {
    const result = comparisonSidebarGroups([run], [row("unrelated", "active")]);
    expect(result.groups).toEqual([]);
    expect(result.byThread.size).toBe(0);
  });
  it("restores the group as a shelf reopens and keeps same-title runs independent", () => {
    const other = {
      ...run,
      id: "other",
      entries: [{ ...selection, threadId: ThreadId.make("other") }],
      merges: [],
    };
    expect(comparisonSidebarGroups([run, other], []).groups).toHaveLength(0);
    const { groups } = comparisonSidebarGroups(
      [run, other],
      [row("a", "settled"), row("other", "settled")],
    );
    expect(groups.map((group) => [group.run.id, group.anchorKey])).toEqual([
      ["run", key("a")],
      ["other", key("other")],
    ]);
  });
});

it("assigns overlapping native rows once without swallowing the later group's unique children", () => {
  const other = {
    ...run,
    id: "overlap",
    entries: [run.entries[0]!, { ...selection, threadId: ThreadId.make("unique") }],
    merges: [],
  };
  const { groups, byThread } = comparisonSidebarGroups(
    [run, other],
    [row("a", "active"), row("merge", "active"), row("unique", "active")],
  );
  expect(groups.map((g) => [...g.groupedKeys])).toEqual([
    [key("a"), key("merge")],
    [key("unique")],
  ]);
  expect(byThread.size).toBe(3);
  expect(groups[1]?.anchorKey).toBe(key("unique"));
});

it("groups the linked follow-up without making it a comparison source and releases rows when the root is removed", () => {
  const linked: CompareRun = {
    ...run,
    followUp: { threadId: ThreadId.make("follow-up"), draftId: "follow-up-draft" },
  };
  const rows = [row("a", "active"), row("follow-up", "active"), row("unrelated", "active")];
  const grouped = comparisonSidebarGroups([linked], rows);
  expect([...grouped.groups[0]!.groupedKeys]).toEqual([key("a"), key("follow-up")]);
  expect(linked.entries.map((entry) => entry.threadId)).toEqual(["a", "b", "c"]);
  const removed = comparisonSidebarGroups([], rows);
  expect(removed.byThread.size).toBe(0);
  expect(rows.flatMap((item) => (item.kind === "thread" ? [item.key] : []))).toEqual([
    key("a"),
    key("follow-up"),
    key("unrelated"),
  ]);
});
