/** Separate Chromium storage and its single-instance lock before any Electron session exists. */
export function resolveDesktopProfilePath(input: {
  appDataDirectory: string;
  isDevelopment: boolean;
  override?: string | undefined;
  resolvePath: (...parts: string[]) => string;
}) {
  return input.resolvePath(
    input.appDataDirectory,
    input.override?.trim() || (input.isDevelopment ? "t3compare-dev" : "t3compare"),
  );
}
