import type { EnvironmentId, OrchestrationShellSnapshot } from "@t3tools/contracts";
import { appAtomRegistry } from "./rpc/atomRegistry";
import { environmentSnapshotAtom } from "./state/shell";

/** Await the native receipt in the authoritative stream before capturing an Undo guard. */
export function waitForComparisonReceipt(environmentId: EnvironmentId, sequence: number) {
  const atom = environmentSnapshotAtom(environmentId);
  return new Promise<OrchestrationShellSnapshot>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    const timeout = setTimeout(() => {
      unsubscribe?.();
      reject(
        new Error(
          "The thread changed, but its confirmed state has not arrived. Reconnect to inspect it.",
        ),
      );
    }, 10_000);
    const finish = (snapshot: OrchestrationShellSnapshot | null) => {
      if (!snapshot || snapshot.snapshotSequence < sequence) return;
      clearTimeout(timeout);
      unsubscribe?.();
      resolve(snapshot);
    };
    unsubscribe = appAtomRegistry.subscribe(atom, finish);
    finish(appAtomRegistry.get(atom));
  });
}
