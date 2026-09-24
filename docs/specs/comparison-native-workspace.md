# Native comparison entry and workspace choice

Cliff accepted this as the current delivery: remove comparison-header workspace controls,
preserve native New chat project picker/shortcuts, and allow the native Current checkout /
New worktree composer choice shown in his t3 screenshot. This supersedes forced comparison
worktree isolation in prior specs. Baseline5fde5915aeefb28bde109ca65a61e11eed0dc528, compare.13.

## Contract

Comparison header keeps native project/title breadcrumb and centered shared prompt. Remove
Workspace/Choose provider selector, workspace-details control, helper text, targeted header
editor/Git/script controls and Actions in provider thread button. Individual Open thread actions
remain; native individual threads retain full workspace functionality. Reuse native components;
remove unused comparison-only plumbing without altering shared native capabilities.

New chat button and keyboard entry preserve native project picker and shortcuts: multiple
projects use native picker; existing one-project/direct-project/Shift shortcuts retain native
behavior. Fix only evidenced parity defects, not a second picker or new navigation layer.

In comparison composer, enable existing native Current checkout / New worktree control and
branch behavior. Honor user's chosen mode in actual requests, not merely its displayed label.
Current checkout sends each selected provider into the chosen native checkout (same files),
without creating per-provider worktrees or unrequested checkout/setup. New worktree creates a
separate worktree for each provider through native preparation using selected base/start-from-origin
behavior. Keep existing native defaults; do not silently override mode when toggling Compare.
Provider runtime permissions remain exactly selected, independent of workspace mode. Do not
claim Current checkout is read-only. A concise comparison-specific shared-files explanation near
the workspace selection may clarify behavior; no extra approval dialog or invented advice mode.

Follow native eligibility and failure behavior for branch/project settings, existing checkout,
worktree setup, and non-Git projects. Do not add a repository-free product flow. If comparison
currently unconditionally requires Git/base branch, apply those restrictions only where native
selected mode requires them; identify any material native-provider support barrier before changing
contracts. No simulated isolation, shared worktree for New worktree mode, duplicate provider
execution path, cancellation/retry redesign, or permission widening.

Preserve prompts/attachments/context, exact models/options, original snapshots, remembered
provider selection, independent partial failures, native child menu/actions and saved old runs.
Existing worktree-backed comparisons continue opening correctly. No migration or deletion of
existing worktrees, branches, history, credentials or user files.

## Verification and delivery

Builder starts read-only approach: identify forced-worktree UI, dispatch/validation points and
native single-provider request construction to reuse. Preserve existing dirty docs/specs/fixtures.
Use codex/comparison-native-workspace branch from verified baseline. Synthetic isolated projects
and mocked providers only; actual sends to real providers or edits to installed projects excluded.
Verify request parity and real synthetic workspace identity: Current checkout creates no extra
worktree, all selected children target chosen checkout; New worktree yields distinct child paths
and requested base; no unexpected Git checkout or setup when Current checkout. Check native
permissions/options/context unchanged, one failure independent, mode switch/draft/project switch
and old comparison reopen. Verify multi-project picker/button/shortcut and direct shortcuts, header
removal, individual thread workspace actions remain. Record desktop/web/mobile applicability and
source-only limits. Focused tests, scoped lint/typecheck/web build; bounded independent review of
workspace dispatch changes via advisor before install. No broad unrelated audits.

Target compare.14; planner reviews actual app, validates exact package/source/signature, performs
offline data/profile backup and rollback, installs/launches and preserves/archives builder for
Cliff's testing. Ad-hoc packaging remains allowed while persistent signing trust confirmation is
unresolved; no Keychain fix claim. No push/PR/merge/publication or paid-provider evaluation.
