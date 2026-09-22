import type {
  AssetCreateUrlInput,
  AssetCreateUrlResult,
  ChatFileAttachment,
  EnvironmentId,
} from "@t3tools/contracts";
import type { AtomCommandResult } from "@t3tools/client-runtime/state/runtime";
import { readPreparedConnection } from "./state/session";
import { resolveFileAttachmentUrl } from "./components/ChatView.logic";
import { toastManager } from "./components/ui/toast";

/** The native attachment download path, shared by full threads and comparison panes. */
export async function downloadChatAttachment({
  attachment,
  environmentId,
  createAssetUrl,
}: {
  attachment: ChatFileAttachment;
  environmentId: EnvironmentId;
  createAssetUrl: (input: {
    environmentId: EnvironmentId;
    input: AssetCreateUrlInput;
  }) => Promise<AtomCommandResult<AssetCreateUrlResult, unknown>>;
}) {
  const connection = readPreparedConnection(environmentId);
  if (!connection) {
    toastManager.add({ type: "error", title: "The environment is not connected." });
    return;
  }
  try {
    const url = await resolveFileAttachmentUrl({
      attachment,
      environmentId,
      httpBaseUrl: connection.httpBaseUrl,
      createAssetUrl,
    });
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.name;
    anchor.click();
  } catch (error) {
    toastManager.add({
      type: "error",
      title: "Could not download " + attachment.name,
      description: error instanceof Error ? error.message : "The attachment is unavailable.",
    });
  }
}
