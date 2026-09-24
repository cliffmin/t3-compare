import * as NodeAssert from "node:assert/strict";

// Manually invoke through the authorized app-browser adapter on an isolated draft.
// Run after a real pointer or keyboard activation; AX open state misses an
// unanchored Base UI popup whose positioning ancestor stays transparent.
export async function assertModelPickerVisible(tab) {
  const result = await tab.playwright.evaluate(() => {
    const search = document.querySelector('[role="dialog"] input[placeholder="Search models..."]');
    if (!search) return { visible: false, reason: "No model search" };
    const rect = search.getBoundingClientRect();
    let opaque = true;
    for (let element = search; element; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (Number(style.opacity) === 0 || style.visibility === "hidden" || style.display === "none")
        opaque = false;
    }
    const x = (Math.max(0, rect.left) + Math.min(innerWidth, rect.right)) / 2;
    const y = (Math.max(0, rect.top) + Math.min(innerHeight, rect.bottom)) / 2;
    const hit = document.elementFromPoint(x, y);
    const inViewport =
      rect.width > 0 && rect.height > 0 && x > 0 && x < innerWidth && y > 0 && y < innerHeight;
    return {
      visible: opaque && inViewport && (hit === search || search.contains(hit)),
      opaque,
      inViewport,
      hitSearch: hit === search || search.contains(hit),
      rect: rect.toJSON(),
      focused: document.activeElement === search,
    };
  });
  NodeAssert.ok(
    result.visible,
    `Model picker is not visibly positioned: ${JSON.stringify(result)}`,
  );
  return result;
}
