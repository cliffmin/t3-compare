import * as NodeAssert from "node:assert/strict";

// Manually invoked through the authorized app-browser adapter, not a CI runner.
// Uses real wheel input; evaluation only reads layout and waits for paint.
// In the app-browser REPL, import this module and pass the selected isolated tab:
// await checkWheelScroll(tab, '[data-comparison-thread="fixture-id"] .scrollbar-gutter-both', 'up');
// Use a hydrated long-history fixture or a draft longer than the input viewport.
// Start away from the requested boundary; compare the returned outer offsets to
// prove the intended pane consumed the gesture. Restore test drafts afterwards.
export async function checkWheelScroll(tab, selector, direction = "up") {
  const cdp = await tab.capabilities.get("cdp");
  const read = async () => {
    const response = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const e = document.querySelector(${JSON.stringify(selector)});
        if (!e) throw Error('Missing scroll target');
        const r = e.getBoundingClientRect();
        let left = Math.max(0, r.left), right = Math.min(innerWidth, r.right);
        let top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
        for (let p = e.parentElement; p; p = p.parentElement) {
          if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowY)) {
            const b = p.getBoundingClientRect();
            top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
          }
        }
        const x = (left + right) / 2, y = top + Math.min(24, (bottom - top) / 2);
        const hit = document.elementFromPoint(x, y);
        return { top: e.scrollTop, height: e.clientHeight, scrollHeight: e.scrollHeight,
          x, y, visible: bottom > top && right > left && !!hit && (hit === e || e.contains(hit)),
          outer: document.querySelector('[data-comparison-scroll]')?.scrollTop ?? null };
      })()`,
      returnByValue: true,
    });
    return response.result.value;
  };
  const before = await read();
  NodeAssert.ok(before.visible, `Scroll target is clipped or covered: ${selector}`);
  await tab.scroll([before.x, before.y], direction, 1);
  await cdp.send("Runtime.evaluate", {
    expression:
      "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    awaitPromise: true,
  });
  const after = await read();
  const result = { selector, direction, before, after };
  NodeAssert.ok(
    direction === "up" ? after.top < before.top : after.top > before.top,
    `Intended target did not scroll: ${JSON.stringify(result)}`,
  );
  return result;
}
