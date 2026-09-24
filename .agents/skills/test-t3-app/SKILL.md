---
name: test-t3-app
description: Test T3 Code's web and desktop UI through its built-in Browser panel against isolated development state. Use for browser verification, browser pairing recovery, and test fixtures. Use test-t3-mobile for native mobile verification.
---

# Test T3 web and desktop

## Authority and tools

Use this skill for task-authorized isolated verification. Explicit mock acceptance covers
necessary browser/runtime verification within the planner's bounded dispatch, without a
second routine approval. The dispatch identifies checkout, isolated state, tools/surface,
and verification owner. It does not authorize unrelated browser/computer control, personal
data access, or paid provider evaluation. A documentation-only task grants no runtime authority.

Prefer T3's built-in Browser panel when its tools are available. If unavailable, use only
an existing browser tool named in the authorized dispatch (for example Codex's `cua_repl`).
Follow that tool's own documentation; the `preview_*` calls below apply only to T3's panel.
If neither path is available, report the blocker. Do not install a new automation system.
Native mobile testing is separate scope: use [test-t3-mobile](../test-t3-mobile/SKILL.md).

## Start the app

Reuse this task's healthy dev server. Otherwise run `vp run dev` from the
repository root and retain its terminal session. Use the worktree's ignored
`.t3` state and read the actual ports and pairing URL from the dev-runner output.
Never run against `~/.t3/userdata` or set `VITE_HTTP_URL` or `VITE_WS_URL`.

Test with meaningful synthetic project and thread data by default. Personal data is
permitted only for an explicitly approved, minimized reproduction. Read
[references/sqlite-fixtures.md](references/sqlite-fixtures.md) only when
inspecting or seeding SQLite. Stop the test server before direct fixture writes.

## Use the Browser panel

Call `preview_status`, then `preview_open` if the Browser panel is
closed. Navigate to the complete startup pairing URL once with
`preview_navigate`, then use `preview_snapshot` and T3's interaction tools.
If the token was consumed or expired, run `node apps/server/src/bin.ts pair`
for a fresh one. Keep using the same tab.

## Verify and retain

Exercise the affected flow and capture evidence with the tested revision and limitations.
Distinguish fixture rendering from actual request/state behavior and owner acceptance. Keep
the server, state, and panel available while the user inspects or iterates.
An assistant turn ending is not teardown. Stop only processes you started,
using retained terminal sessions or captured PIDs.

When sharing is requested, start with `vp run dev --share` and give the user
a fresh complete pairing URL that you have not consumed. Keep other credentials
out of screenshots, commits, and replies.
