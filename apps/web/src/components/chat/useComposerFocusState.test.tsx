import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { shouldUseRestingComposerLayout } from "../composerFooterLayout";
import { useComposerFocusState } from "./useComposerFocusState";

let root: Root;
let composer: ReturnType<typeof useComposerFocusState>;
let isResting: boolean;
let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();
function flushFrames() {
  for (const [id, callback] of frames) {
    frames.delete(id);
    callback(0);
  }
}

function ComposerProbe({ comparison = false }: { comparison?: boolean }) {
  const state = useComposerFocusState(comparison);
  useLayoutEffect(() => {
    composer = state;
    isResting = shouldUseRestingComposerLayout({
      ...(comparison ? { comparisonFocused: state.isComposerFocused } : {}),
      isExistingThread: true,
      isMobileViewport: false,
      isScrollCollapsed: state.isComposerScrollCollapsed,
      hasExpandedChrome: false,
      hasMultilinePrompt: false,
      timelineOverflows: true,
    });
  });
  return null;
}

beforeEach(async () => {
  frames.clear();
  // The probe has no DOM output, but ReactDOM needs an event target.
  const document = {
    nodeType: 9,
    addEventListener() {},
    removeEventListener() {},
  };
  const container = {
    nodeType: 1,
    tagName: "DIV",
    namespaceURI: "http://www.w3.org/1999/xhtml",
    ownerDocument: document,
    addEventListener() {},
    removeEventListener() {},
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      document,
      HTMLIFrameElement: EventTarget,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.set(++frameId, callback);
        return frameId;
      },
      cancelAnimationFrame: (id: number) => frames.delete(id),
    }),
  );
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  root = createRoot(container as unknown as HTMLElement);
  await act(() => root.render(<ComposerProbe />));
});

afterEach(async () => {
  await act(() => root.unmount());
  vi.unstubAllGlobals();
});

describe("composer focus state", () => {
  it("stays expanded when the composer loses focus", async () => {
    await act(() => composer.setIsComposerFocused(true));
    expect(isResting).toBe(false);

    // A tool disclosure takes focus away from the editor.
    await act(() => composer.setIsComposerFocused(false));
    expect(isResting).toBe(false);
  });

  it("can collapse again on the next scroll after returning to the end", async () => {
    await act(() => composer.setIsComposerScrollCollapsed(true));
    expect(isResting).toBe(true);

    await act(() => composer.restoreAfterTimelineReachedEnd());
    expect(isResting).toBe(false);

    await act(() => composer.setIsComposerScrollCollapsed(true));
    expect(isResting).toBe(true);
  });

  it("does not move focus into the composer when the timeline reaches the end", async () => {
    await act(() => composer.setIsComposerScrollCollapsed(true));
    await act(() => composer.restoreAfterTimelineReachedEnd());
    expect(isResting).toBe(false);
    expect(composer.isComposerFocused).toBe(false);
  });
});

describe("comparison composer focus ownership", () => {
  it("starts resting and returns to rest after interacting with a timeline or another composer", async () => {
    await act(() => root.render(<ComposerProbe comparison />));
    expect(isResting).toBe(true);
    const editor = new Event("focusin");
    await act(async () => {
      window.dispatchEvent(editor);
      // Browser dispatch permits microtasks between native capture listeners.
      await Promise.resolve();
      composer.markOwnedEvent(editor);
      flushFrames();
    });
    expect(isResting).toBe(false);
    await act(async () => {
      window.dispatchEvent(new Event("pointerdown"));
      flushFrames();
    });
    expect(isResting).toBe(true);
  });

  it("keeps its own portal interaction expanded but releases ownership for another menu", async () => {
    await act(() => root.render(<ComposerProbe comparison />));
    const pointer = new Event("pointerdown");
    const focus = new Event("focusin");
    await act(async () => {
      window.dispatchEvent(pointer);
      composer.markOwnedEvent(pointer);
      window.dispatchEvent(focus);
      composer.markOwnedEvent(focus);
      flushFrames();
    });
    expect(isResting).toBe(false);
    await act(async () => {
      window.dispatchEvent(new Event("focusin"));
      flushFrames();
    });
    expect(isResting).toBe(true);
  });

  it("does not expand on timeline end restoration", async () => {
    await act(() => root.render(<ComposerProbe comparison />));
    await act(() => composer.restoreAfterTimelineReachedEnd());
    expect(isResting).toBe(true);
  });
});
