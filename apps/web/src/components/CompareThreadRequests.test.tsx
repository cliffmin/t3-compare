import { act, useEffect } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { AsyncResult } from "effect/unstable/reactivity";
import * as Cause from "effect/Cause";
import { usePendingRequestAction } from "./CompareThreadRequests";
import type { AtomCommandResult } from "@t3tools/client-runtime/state/runtime";

let renderer: ReactTestRenderer | undefined;
let action: ReturnType<typeof usePendingRequestAction>;
function Probe() {
  const value = usePendingRequestAction();
  useEffect(() => {
    action = value;
  }, [value]);
  return null;
}
afterEach(async () => {
  await act(() => renderer?.unmount());
});

describe("native request settlement", () => {
  it("shows a failed response and permits an explicit retry without duplicate submission", async () => {
    await act(() => {
      renderer = create(<Probe />);
    });
    let finish!: (result: AtomCommandResult<unknown, unknown>) => void;
    const send = vi.fn(
      () =>
        new Promise<AtomCommandResult<unknown, unknown>>((resolve) => {
          finish = resolve;
        }),
    );
    let pending!: Promise<void>;
    await act(() => {
      pending = action.run(send);
    });
    expect(action.busy).toBe(true);
    await act(() => action.run(send));
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(AsyncResult.failure(Cause.fail(new Error("Fixture response failed"))));
      await pending;
    });
    expect(action.error).toBe("Fixture response failed");
    expect(action.busy).toBe(false);
    await act(() => action.run(async () => AsyncResult.success(undefined)));
    expect(action.error).toBe(null);
    expect(action.busy).toBe(false);
  });
  it("handles a transport rejection without leaving controls disabled", async () => {
    await act(() => {
      renderer = create(<Probe />);
    });
    await act(() =>
      action.run(async () => {
        throw new Error("Fixture transport disconnected");
      }),
    );
    expect(action.error).toBe("Fixture transport disconnected");
    expect(action.busy).toBe(false);
  });
});
