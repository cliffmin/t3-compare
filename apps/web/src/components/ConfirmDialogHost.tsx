import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import {
  completeConfirmDialogClose,
  readConfirmDialogState,
  registerConfirmDialogHost,
  respondToConfirmDialog,
  subscribeConfirmDialog,
} from "../confirmDialog";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

type ConfirmationCopy = {
  readonly title: string;
  readonly description: string | null;
};

function resolveConfirmDialogCopy(message: string): ConfirmationCopy {
  const normalizedMessage = message.trim();
  const lines = normalizedMessage.split("\n");
  const questionLineIndex = lines.findIndex((line) => line.trim().endsWith("?"));

  if (questionLineIndex >= 0) {
    const title = lines[questionLineIndex]!.trim();
    const description = lines
      .filter((_, index) => index !== questionLineIndex)
      .join("\n")
      .trim();
    return { title, description: description || null };
  }

  const questionMarkIndex = normalizedMessage.indexOf("?");
  if (questionMarkIndex >= 0) {
    return {
      title: normalizedMessage.slice(0, questionMarkIndex + 1).trim(),
      description: normalizedMessage.slice(questionMarkIndex + 1).trim() || null,
    };
  }

  return {
    title: "Confirm action",
    description: normalizedMessage || "This action requires your confirmation.",
  };
}

export function ConfirmDialogHost() {
  const state = useSyncExternalStore(
    subscribeConfirmDialog,
    readConfirmDialogState,
    readConfirmDialogState,
  );

  useEffect(() => registerConfirmDialogHost(), []);

  const copy = resolveConfirmDialogCopy(state.status === "idle" ? "" : state.message);
  const confirmVariant = state.status === "idle" ? "default" : state.variant;
  const onCancel = () => respondToConfirmDialog(false);
  const onConfirm = () => respondToConfirmDialog(true);

  return (
    <AlertDialog
      open={state.status === "confirming"}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) completeConfirmDialogClose();
      }}
    >
      <ConfirmationContent
        title={copy.title}
        description={copy.description}
        variant={confirmVariant}
        onConfirm={onConfirm}
      />
    </AlertDialog>
  );
}

/** Shared native confirmation presentation, with optional aggregate-action controls. */
export function ConfirmationContent({
  title,
  description,
  variant = "default",
  onConfirm,
  footer,
  disabled = false,
}: {
  title: string;
  description: ReactNode;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  footer?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <AlertDialogPopup className={footer ? "max-w-2xl" : "max-w-lg"}>
      <AlertDialogHeader>
        <AlertDialogTitle className="wrap-anywhere">{title}</AlertDialogTitle>
        {description ? (
          <AlertDialogDescription className="whitespace-pre-line">
            {description}
          </AlertDialogDescription>
        ) : null}
      </AlertDialogHeader>
      <AlertDialogFooter className={footer ? "flex-row flex-wrap items-center" : undefined}>
        {footer ? <div className="mr-auto min-w-0 flex-1 basis-64">{footer}</div> : null}
        <div className={footer ? "ml-auto flex shrink-0 gap-2" : "contents"}>
          <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
          <Button variant={variant} disabled={disabled} onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </AlertDialogFooter>
    </AlertDialogPopup>
  );
}
