# Comparison sidebar actions

## Accepted outcome and baseline

Cliff's September 23 native T3 menu/delete-dialog references and direct request authorize this
bounded refinement through local implementation, verification, packaging, installation and launch.
This revision supersedes the earlier grouping-only root deletion and no-bulk-lifecycle restrictions.
Delivered baseline: `d3b1010ca4acdd9a731c3d59c5e79c6bb66f18cb` (Compare.20).
Target: Compare.21. The latest direct refinement requests one aggregate deletion confirmation and
subordinate worktree information; it supersedes the earlier separate-worktree-confirmation requirement. Builder owns application implementation/build; planner owns scope/delivery.
No additional mock required for reuse of the supplied native presentation.

Comparison roots expose appropriate native actions through the existing context-menu and accessible
menu trigger. Provider rows remain ordinary native threads with their original menus and behavior.
Reuse native components, action hooks, eligibility checks, confirmations and state rather than
introducing a second thread lifecycle. Ordinary single-thread behavior must remain unchanged.

## Membership and scope

Group operations target deduplicated source threads plus the linked, server-backed shared follow-up
conversation. Include archived members where applicable. Exclude unrelated threads and hidden legacy
merge/output records from aggregate lifecycle/deletion. Counts and explanatory copy include the shared
conversation; do not describe only provider count when more conversations will be affected.

Missing/loading/disconnected is not proof of deletion. Resolve latest membership/state at confirmation
and recheck during execution. Prevent duplicate operation dispatch. Uncertain initial launches or
shared-send receipts disable destructive cascade until identities resolve; grouping-only removal
remains available. Never resurrect removed roots, create unintended sends or lose late child identity.
An owned unsent shared draft can be cleaned by confirmed cascade; grouping-only removal preserves it.

## Appropriate native menu actions

- Pin/Unpin comparison; Settle/Unsettle comparison; Snooze/Wake comparison.
- Rename comparison; Regenerate title; Mark unread.
- Copy comparison link/ID and project settings/filter where the project is unambiguous.
- Archive comparison; Delete comparison…; restoration through the existing Archive surface.

Omit ambiguous branch/workspace/runtime actions (for example New thread on branch); those remain on
individual native threads. Preserve native separators, icons, shortcuts and disabled reasons where
applicable. Do not add meaningless items merely to match menu length.

Bulk lifecycle uses existing per-member/native batch handlers. Skip already-satisfied members; expose
both meaningful directions for mixed state with affected counts. Pin clearing on settle, native wake
on activity and successful-only Undo follow native rules. Snooze preflights every target for capability,
approval/input/queued-work guards; pick one native preset/custom timestamp for the group. Recheck before
each action. Partial success is reported truthfully and retry targets only the remainder; do not undo
concurrent owner changes to simulate atomicity. Retain native confirmation settings where appropriate.

Native shelves remain authoritative. Group rows follow the anchor shelf; members on other shelves
remain native rows. Successful group actions normally converge members; mixed states/activity/partial
failures may split them. Do not create competing root pin/settle/snooze state or force children between
shelves. Aggregate action scope still covers all linked members, not only currently visible rows.

Mark unread uses native state for all targets; root indication derives any unread linked member.
Merely rendering embedded panes must not immediately erase the explicit unread action. Opening/reading
and subsequent activity should follow coherent native semantics, with a regression test.

## Root title

Rename validates nonempty trimmed text, supports cancel, persists/reloads, updates sidebar/header and
never renames children. Regenerate title changes only the root. Add the smallest typed operation around
native TextGeneration.generateThreadTitle/context formatting and project text-generation settings,
using the original common prompt and previous root title; preserve authentication, input limits and
capability/error handling. Do not invoke child metadata regeneration, rename children or create a
conversation. Apply completion only if the root still exists and no later manual rename/regeneration
superseded it. Errors retain the existing title. Test generation with mocks, not real provider calls.

## Archive and restore

Archive applies native archive to all linked conversations and removes the root from active shelves
only when appropriate. Running/uncertain work blocks archive using native guards; do not silently stop
it. Preflight and recheck. Preserve visible/retryable root state on partial failure and distinguish
successful archive from navigation/follow-up failure. Persist comparison archive state without ghost
roots. Extend the existing Archive surface to restore the comparison and its linked conversations;
no separate archive system. Archived comparison rows retain native-style Restore/Unarchive and Delete
context actions, reusing the same aggregate delete dialog so removal does not require restoration first.
Preserve native individual archive/restore and unavailable-member notices.
Root persistence failure must not falsely report complete success.

## Delete confirmation and worktrees

Reuse original T3 confirmation presentation (shared dialog/footer extension is preferred over a new
visual implementation). Title: Delete comparison “{title}”? Body describes permanent conversation
history deletion when selected. Cancel is always a no-op. Always show aggregate confirmation, even if
the ordinary single-thread confirmation preference is disabled.

A checkbox resets to checked each time the dialog opens, lower-left in the same footer row as Cancel
and Confirm (wrap cleanly on narrow windows). Label: “Also delete {N} linked threads”. Do not append
worktree wording to that label or the main body. When checked and current linked members include
worktrees that may be cleaned up, place quiet muted text below the checkbox/label: “Also deletes
unused worktrees and their local changes. Worktrees used elsewhere are kept.” Align beneath the
label, keep Cancel and Confirm together, and hide this explanation when unchecked or no linked
worktree exists.

Cliff accepted this actual-current-worktree rule on September24. It applies equally to older records,
comparisons initially using the current checkout, and worktrees added through later native/shared
follow-ups. This supersedes initial-mode-only visibility and resolves the known-mode P1/legacy gate.
Do not infer or backfill original workspace choice. Provisional initialEnvMode metadata is unnecessary
for this rule; remove its unshipped addition if it has no other consumer. Resolve disclosure and
cleanup scope from the same fresh aggregate membership, including archived/shared members. If scope
changes after opening, update the existing dialog rather than silently deleting undisclosed worktrees;
retain existing membership/reconnection guards and avoid launching additional modal confirmations.

Unchecked: remove only the comparison record/grouping; retain conversations, worktrees, drafts and
running work, returning children to native placement. Active-root removal navigates to a surviving
native child or normal safe fallback; background removal leaves current navigation alone.

Checked: resolve latest membership and use native thread deletion including native session/terminal
cleanup. Disclose that running sessions will stop. Preserve root/progress until all intended outcomes
are known, report failures and allow retry of remaining targets without repeating successes. The set
of deleted thread keys contains only successful deletions, never the whole planned batch. A failed
member remains a surviving reference. Storage failure cannot be reported as successful root removal.

The aggregate checked Confirm consumes consent for both linked-thread and eligible worktree deletion.
Do not open subsequent per-thread/per-worktree confirmation dialogs. Use a narrowly scoped option on
the existing native deletion flow: session stop, terminal/history cleanup, native thread deletion,
receipts, draft cleanup and navigation remain native. For eligible linked worktrees use native
explicitly confirmed removal semantics, including local changes (currently force:true), as disclosed
in this one dialog. Do not silently substitute a new clean-only deletion policy. Native standalone
thread/worktree deletion and its settings remain unchanged.

Explicit aggregate cleanup must work with automatic cleanup enabled or disabled. Coordinate/deduplicate
native cleanup so an already-removed tree is not falsely reported failed and no tree is removed twice.
Include outside-comparison AND archived references in survivor checks; main/project checkouts and
worktrees still used by any surviving thread remain. Failed member deletion remains a reference.
Recheck server references and canonical paths immediately before removal. Use the native resolved-path
workspace lease; retain noncanonical alias targets consistently with native automatic cleanup and
report that outcome rather than claiming removal. Do not claim alias/canonical lease unification.
Retain live-session/terminal
protections. Report thread deletion separately from cleanup failure. No broad filesystem deletion,
unrelated trees, hidden legacy outputs, or changes to standalone native worktree policy.

## Accepted Compare controls and deletion feedback — September24

These bounded refinements join Compare.21 and supersede the prior open-only label behavior in
comparison-follow-up. Enabling Compare in a fresh native draft defaults the workspace selector to
New worktree when native Git/worktree support is available. Reuse native workspace selection and
bootstrap, preserving chosen base branch and per-provider worktree isolation. Do not initialize a
repository or silently fake support in a non-Git/unsupported project; retain native availability
behavior. Apply this default only on the explicit off-to-on action, never rerenders, popup opening,
provider configuration edits, reloads or existing child/shared thread follow-ups. A deliberate later
workspace selection while Compare remains enabled is preserved. Ordinary single-provider entry
keeps its native default and behavior.

Clicking the enabled Compare label toggles its existing provider popup open AND closed, including
pointer interactions when the popup is already open. Preserve keyboard activation, focus restoration,
bold enabled label, hand cursor, selected providers/options/draft and mode switch independence.
Clicking the label does not turn Compare off; clicking the switch remains the mode control.

Trace the reported green “Worktrees updated” toast to its actual native source. Routine successful
status-refresh/cleanup feedback during checked comparison deletion should be quiet, not a second
confirmation or duplicate success popup. Suppress only that redundant feedback for this path if
confirmed by source/runtime. Preserve actionable cleanup failures/retained outcomes and normal
standalone worktree notifications. Do not silence all toasts or change global notification settings.

## Verification and delivery

Use isolated synthetic fixtures/disposable worktrees exclusively for lifecycle and destructive tests.
Never archive/delete/settle/pin owner conversations or remove owner worktrees during verification.
No paid/live title generation. Exercise native context menu and keyboard/menu trigger, all supported
non-costly actions, mixed states/shelf convergence, unread, title race/error, archive/restore/reload,
checked/unchecked/cancel deletion, running and uncertain states, durable storage failures, partial
success/retry, late arrivals, archived/outside survivor references and cleanup failure. Assert actual
native backend effects where feasible; label mocked/source-only checks honestly. Include ordinary
native thread regression checks and retain previous Compare composer/scroll behavior.

For21 specifically, cover actual linked-worktree helper presence/absence, legacy and local-origin
shared-worktree presentation, checked/unchecked and active/Archive dialog reuse, one aggregate confirmation,
auto cleanup on/off, same-worktree dedupe, partial failures/retries and native standalone confirmations.
Use disposable actual Git repositories/worktrees to verify eligible removal (including local changes
under the disclosed native consent), retained outside/archived references, main/project-root protection
and cleanup failure. Preserve evidence; no owner worktree deletion.

Verify local-origin shared dirty worktree deletion with automatic cleanup ON/OFF and visible consent;
label repeated click and keyboard open/close without switch/configuration changes; Compare enabling
selects New worktree, manual override persists, supported base branch/bootstrap yields isolated trees,
non-Git/unsupported native behavior, and no unrelated single-provider change. Confirm actual toast
wording/source and quiet successful deletion while errors remain. Use focused automated regression
coverage plus isolated real-client checks; no broad repeat of already-passed suites without new risk.

Run repository-required focused tests, lint/typecheck and production build. Independent advisor review
uses a fixed revision. Preserve dirty release-preparation docs and prior feature evidence. Preserve
source/package/handoff; planner backs up installed data/profile offline, waits for provider work to
finish, installs/launches exact verified Compare.21 and checks identity. Installed menu/dialog smoke
must be read-only or Cancel-only. Working-app acceptance remains Cliff's separate step. Ad-hoc signing
is permitted; no claim that Keychain prompts are fixed. No push/PR/merge/publication or trust changes.

## Accepted enable-popup regression repair — September24, Compare.22

Cliff reports enabling Compare no longer visibly opens its provider configuration. Fix the native
popup anchor/visibility behavior while retaining Compare.21 label toggle and independent switch,
enable-only New worktree default, manual workspace override, selected configurations and draft.
Accessibility open/focus state alone is insufficient: actual pointer off-to-on must show a visibly
positioned popup. Cover native label pointer/keyboard close/open, repeated switch sequences,
new draft/project/reload and relevant layout/hydration conditions. Use a reproducing meaningful
regression tied to the cause; preserve native BaseUI semantics rather than another overlay system.

Cliff also requests a current-feature/UI regression pass. Exercise existing compare entry/provider
availability/config persistence/options, native workspace choice and distinct worktree dispatch,
independent and shared answer-context sends/readiness, long-answer and draft wheel scrolling,
focus/compact composers, saved draft/reload, group actions/one-confirm cleanup and ordinary native
single-thread behavior. Run repository-required checks and record scenario/source/results/limits.
Use isolated synthetic data and mock providers; no paid-provider or production-data testing.
Fix concrete in-scope regressions, surface material behavior choices, and do not claim zero bugs.

The regression pass also reproduced completed native work with stale local launch=pending, leaving
shared readiness and group actions blocked after reload. Reconcile pending/uncertain launch only from
the same thread's exact initial user message and authoritative settled original turn, with null pending
start and no active/starting session or streaming text. Observe unresolved launch even when its original
snapshot already exists; preserve that snapshot. Missing identity, unrelated later turns and unknown
pending state remain unresolved. Error/interruption may establish launch but never successful answer
status. Do not replay prompts or broaden the native command runtime. Record the proven blocking
mechanism separately from any unproven reason a dispatch callback did not finish.

Owner separately authorizes removing the seven pictured saved comparisons and attributable generated
work, preserving both Compare and upstream T3 configuration. Planner owns exact inventory and native
operational cleanup, outside this code change; never reset whole state/profile or delete project roots.
Directory reorganization follows the stable verified/owner-accepted app and scoped cleanup. No source
relocation during active implementation; no publication authority. Detailed private operational
inventory/handoff belongs outside the application repository.
