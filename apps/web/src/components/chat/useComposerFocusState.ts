import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export function useComposerFocusState(
  comparison = false,
  formRef?: RefObject<HTMLFormElement | null>,
) {
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isComposerScrollCollapsed, setIsComposerScrollCollapsed] = useState(false);

  const ownedEvents = useRef(new WeakSet<Event>());
  const markOwnedEvent = useCallback((event: Event) => {
    ownedEvents.current.add(event);
  }, []);
  useEffect(() => {
    if (!comparison) return;
    // React capture includes this form's portals. A generic floating-layer
    // selector would also match a different composer's menu.
    let frame: number | null = null;
    const onInteraction = (event: Event) => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      // Browser dispatch can run microtasks between native listeners, before
      // React capture marks the event. Resolve ownership after dispatch.
      frame = window.requestAnimationFrame(() => {
        frame = null;
        // Focus guards can stop React's focus capture when a popup restores
        // its editor. DOM containment still identifies that owned target.
        const inForm =
          formRef?.current &&
          event.target instanceof Element &&
          formRef.current.contains(event.target) &&
          !event.target.closest('[data-chat-composer-collapsed-controls="true"]');
        setIsComposerFocused(ownedEvents.current.has(event) || Boolean(inForm));
      });
    };
    window.addEventListener("pointerdown", onInteraction, true);
    window.addEventListener("focusin", onInteraction, true);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onInteraction, true);
      window.removeEventListener("focusin", onInteraction, true);
    };
  }, [comparison, formRef]);

  // Reaching the end of the timeline lifts a scroll collapse without moving
  // DOM focus to the editor.
  const restoreAfterTimelineReachedEnd = useCallback(() => {
    setIsComposerScrollCollapsed(false);
  }, []);

  return {
    markOwnedEvent,
    isComposerFocused,
    setIsComposerFocused,
    isComposerScrollCollapsed,
    setIsComposerScrollCollapsed,
    restoreAfterTimelineReachedEnd,
  };
}
