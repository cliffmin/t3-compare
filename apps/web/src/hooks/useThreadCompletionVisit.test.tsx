import { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useUiStateStore } from "../uiStateStore";
import { useThreadCompletionVisit } from "./useThreadCompletionVisit";

const first = "2026-09-23T12:00:00.000Z";
const later = "2026-09-23T12:01:00.000Z";
let renderer: ReactTestRenderer | undefined;
function Pane({
  id,
  completion,
  entry,
  pane,
}: {
  id: string;
  completion: string | null;
  entry?: string;
  pane: { active: boolean };
}) {
  useThreadCompletionVisit(id, completion, entry);
  return <span>{pane.active ? "Active" : "Visible"}</span>;
}
function visited(id: string) {
  return useUiStateStore.getState().threadLastVisitedAtById[id];
}
function unread(id: string, completion = first) {
  act(() => useUiStateStore.getState().markThreadUnread(id, completion));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useUiStateStore.setState({ threadLastVisitedAtById: {} });
});
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});

describe.each(["source", "shared"])("%s comparison reading", (id) => {
  const pane = (completion: string | null, entry = "route-1", active = false) => (
    <Pane id={id} completion={completion} entry={entry} pane={{ active }} />
  );
  it("keeps explicit unread through new pane objects and activation, then reads a later answer", () => {
    act(() => {
      renderer = create(pane(first));
    });
    expect(visited(id)).toBe(first);
    unread(id);
    act(() => renderer!.update(pane(first, "route-1", true)));
    expect(visited(id)).toBe("2026-09-23T11:59:59.999Z");
    act(() => renderer!.update(pane(later, "route-1", true)));
    expect(visited(id)).toBe(later);
  });
  it("acknowledges direct entry, history reentry and reload without a sidebar click", () => {
    unread(id);
    act(() => {
      renderer = create(pane(first));
    });
    expect(visited(id)).toBe(first);
    unread(id);
    act(() => renderer!.update(pane(first, "history-entry")));
    expect(visited(id)).toBe(first);
    unread(id);
    act(() => renderer!.unmount());
    act(() => {
      renderer = create(pane(first, "history-entry"));
    });
    expect(visited(id)).toBe(first);
  });
  it("waits for the first completion when entering a running thread", () => {
    act(() => {
      renderer = create(pane(null));
    });
    expect(visited(id)).toBeUndefined();
    act(() => renderer!.update(pane(first)));
    expect(visited(id)).toBe(first);
  });
});

it("preserves ordinary native completion acknowledgement without route tracking", () => {
  const pane = (completion: string) => (
    <Pane id="native" completion={completion} pane={{ active: true }} />
  );
  act(() => {
    renderer = create(pane(first));
  });
  expect(visited("native")).toBe(first);
  unread("native");
  act(() => renderer!.update(pane(first)));
  expect(visited("native")).toBe("2026-09-23T11:59:59.999Z");
  act(() => renderer!.update(pane(later)));
  expect(visited("native")).toBe(later);
});
