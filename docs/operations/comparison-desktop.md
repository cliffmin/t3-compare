# Local T3 Compare desktop

T3 Compare is an independent local macOS build. It does not register upstream's
`t3code` URL schemes and ships without an update feed. Updates are manual; About
shows the package version and source commit. Local builds default to ad-hoc signing, with optional
[stable local signing](../specs/local-development-signing.md); they are not Developer ID
signed or notarized.

The installed app uses `~/data/t3-compare-poc/userdata` for its backend, preserving
the comparison prototype's data. This home-relative default also works on a fresh
machine; no upstream data is adopted. `T3CODE_HOME` explicitly overrides the backend
home. Development without an override uses `~/data/t3-compare-poc/dev`.

Chromium storage and the instance lock are separate from the backend home:
`~/Library/Application Support/t3compare` for installed builds, and `t3compare-dev`
for development. `T3COMPARE_PROFILE_DIR` explicitly overrides both userData and
sessionData for disposable testing. Set both home and profile overrides for a
fresh-state test. Changing only `T3CODE_HOME` does not isolate the desktop profile.

Build a local arm64 ZIP using Node 24 and the existing Rust/Apple build tools:

```sh
node scripts/build-desktop-artifact.ts --platform mac --target zip --arch arm64 \
  --build-version "0.0.42-compare.local" --output-dir /path/to/local/artifacts
```

Before opening a newer build on existing state, back up the comparison home while
its app is closed. Keep the previous app and backup recoverably. Do not copy a live profile or import
cookies/Keychain wholesale. Export validated comparison records from a coherent
offline snapshot and preserve ambiguous records for review. Backend restore may
be required when rolling back across a schema migration; keep post-upgrade data
before restoring a backup. Never restore comparison data into upstream's home.
