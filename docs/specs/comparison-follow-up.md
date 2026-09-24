# Comparison follow-up and native inline composers

Status: accepted for local delivery. CMP-001; accepted visual reference r07, comparison-composer
preview retained by the planner. Baseline 442e8125b1968abc58bff0eed623b7fa0bb700fb (compare.14).
Initial delivery compare.15; spacing refinement delivered compare.16; scroll/control correction delivered compare.17; accepted compact-prompt refinement targets compare.18. This supersedes the individual-thread-only follow-up restriction, not native
thread execution or existing workspace semantics. No broadcast or automatic answer merging.

## User outcome and layout

Keep the original shared prompt above responsive native provider panes. Each pane includes the
native individual-thread composer, timeline/activity, approval/question controls and completion
behavior. Its send continues that same thread and does not inject other providers' answers.
Preserve normal per-thread scrolling, full-height use and responsive stacking.

Below the panes, add a shared answer-aware composer. It always uses the original prompt and
current completed provider answers as context for the user's custom instruction, sent to one
selected provider/model. No Ask one/Continue all toggle and no Using N answers selector. Placeholder:
“Follow up on your {N} answers, @tag files/folders, $use skills, or / for commands”, where N is the
comparison source-provider count. Individual panes retain native placeholder wording and actual
mention/skill/command, attachment, model/options and permission behavior. Reuse native composer,
request construction and timeline rather than copy a reduced imitation.

The shared send starts a linked ordinary conversation; its native output appears below the
comparison and later shared sends continue it. Keep the source comparison visible and allow normal
navigation to that conversation. Do not restore old merged-result tabs, stored merged versions or
winner selection. This conversation is not another source answer and cannot include itself.
Preserve its identity, options and relationship across reload/reopen. Shared composer follows
native model/provider switching rules; never silently switch targets or lose the draft.

Use the comparison's project and native current-checkout context for this new follow-up thread,
with native workspace/permission controls available. Do not arbitrarily select a provider's
isolated worktree or inherit its code changes. If the user selects New worktree, use native setup.
Existing comparison workspace choice and each provider's separate workspace remain unchanged.

## Accepted installed-app spacing refinement — 2026-09-23

Cliff requested this directly after testing Compare.15; no new mock approval is needed. Remove the
separate visible “Follow up” heading above the shared composer. Keep the answer-aware placeholder
inside the input unchanged. Keep the existing shared-thread open arrow accessible once applicable,
without reserving an empty title row before a result exists.

Move the shared composer toward the bottom of the available Compare view, with native comfortable
bottom padding. Eliminate the unused region below its workspace strip shown in the owner screenshot.
Use the available height naturally, retaining useful source/result space rather than adding a large
artificial spacer. Avoid a fixed viewport position or overlay that covers content. Preserve wrapped
source rows, short windows, growing multiline drafts, notices, result history and independent native
scrolling. No provider dispatch, readiness, context, persistence or configuration behavior changes.

Verify empty shared draft and existing shared result at wide/tall, normal desktop and narrow/short
sizes. Record composer/workspace bottom gap and no clipping/overlap/horizontal overflow. Focused
layout checks are sufficient for this refinement; do not add tests that only assert class strings.
Deliver the next installed actual app through the established local delivery sequence.

## Accepted scroll regression repair and Compare control — 2026-09-23

Cliff reports Compare.16 cannot scroll provider threads and their prompt boxes. This is a regression,
not accepted behavior. Target Compare.17. Reproduce with long provider answers and overflowing drafts,
identify scroll ownership/height/overflow causes, and preserve the lower shared composer without
sacrificing independent native scrolling. Keep normal single-provider thread/composer behavior.
Source panes, overflowing individual prompt text, shared-result history and shared prompt text must
scroll on actual wheel/trackpad gestures in the intended area. Wrapped source rows must stay reachable.
Do not substitute scrolling the entire comparison for scrolling an answer or input inside its pane.
Retain native follow/end behavior and keyboard/caret reachability.

In the new-chat composer, Compare is bold while enabled and normal weight while disabled. Its label
and switch are separate controls: clicking the enabled Compare label toggles the existing comparison
provider popup open/closed, with hand cursor and keyboard activation, without changing enabled state, selected
providers, options or draft. Switching off unbolds Compare and restores native single-provider mode.
The switch remains independently usable; no enclosing label click may toggle it accidentally.
Do not add a second configuration system. Label behavior when disabled must not silently enable Compare.

Verification must include a repeatable automated interaction regression in the existing app harness:
long content, actual scroll input and assertions that the intended content/scroll position changes,
not class names or programmatic assignment of scroll offsets. Show the relevant failure on the old
revision and passing result after correction. Check both an ordinary native thread and embedded
comparison, wide/wrapped/short layouts, input growth, and shared draft/result states. Check label
click preserves toggle and configuration; off removes bold and on restores it. Scoped checks plus
actual installed-app scrolling smoke complete delivery. If native control is unavailable, report that
exact limit; browser geometry or screenshots cannot be described as native interaction proof.

## Live readiness and failure behavior

While ANY linked source provider is pending, running, or awaiting approval/input, allow drafting
but block shared send. Show the native-sized spinning status instead of the send arrow and put
“Waiting for providers” with dots cycling 1–3 in the controls row between permissions and
attachment/send. No separate waiting explanation underneath. Respect reduced-motion preferences
and avoid an unnecessary continuously repainting view. Native controls must make an approval,
question, cancellation or error actionable in its pane.

Derive readiness from current authoritative native thread/turn state regardless of entry point:
inline pane, full thread or another client. Reopening Compare while a provider is processing must
show waiting. Do not rely on original run completion or local click flags. Follow native shared
conversation processing semantics as well; prevent duplicate send while its own request is active.

Once all sources are terminal (completed, failed or stopped), restore arrow. Allow shared send
with available completed answers and a concise visible missing-source notice. Never include partial
streaming/tool output as a completed answer. If no completed source answer exists, keep send disabled
with a useful explanation. Deletion/unavailable source is a visible missing source, not endless
pending. An unhydrated/disconnected state must not be falsely treated as completed; use native
loading/reconnection/error state and preserve draft.

## Context integrity

At each shared send, snapshot the original prompt and latest completed assistant answer turn for
each source, labeled with provider/model and stable thread/turn identity. Include all final answer
parts belonging to that turn, not thinking/tool chatter. If a later turn failed/stopped, an earlier
completed answer may be included only labeled as the last completed answer alongside the missing
latest-turn notice. Source answers are reference material, not system instructions. The user's
follow-up remains the instruction. Do not turn answer text into tools, elevated roles or unescaped
message delimiters.

Persist the exact context sent with that turn. Subsequent provider edits/turns cannot rewrite a
prior snapshot. Later shared sends refresh from the then-current completed source answers. Preserve
native history semantics without unintentionally duplicating old snapshots on every request. Use
existing native limits/error handling; do not silently truncate or drop answers. Report actionable
context-size errors. Recheck readiness when sending and prevent duplicate linked-thread creation
or duplicate submission under rapid clicks/concurrent clients using established store/lock patterns.

## Configuration and navigation

Create provider threads with exactly the submitted provider/model, effort/reasoning, supported
options, permissions and workspace. Their inline and full-page composers display these values and
subsequent requests use them. Preserve explicit later changes via native persistence; navigation or
reload must not reset them to the original Compare configuration. Invalid/unavailable settings need
native explicit correction, never a silent fallback. Preserve saved runs and original snapshots.

New comparison sidebar roots start collapsed; later explicit expansion state persists normally.
Selecting root and toggling its expansion are separate actions. Provider-header open arrow navigates
the main view to the existing native thread, not a modal or duplicate. Returning via comparison title
reflects current live provider state. Preserve native child actions and record-only root deletion;
linked follow-up conversations survive root deletion, like source threads.

## Scope and implementation review

Builder first returns a source-backed read-only approach identifying native composer/request reuse,
source state/readiness, final-answer extraction, persistence/concurrency and exact configuration
carryover. Identify material support barriers before modifying behavior. Planner reviews READY.
Keep the smallest complete change; avoid parallel execution/session systems and unrelated refactors.
Preserve desktop/web compatibility and shared contracts; report mobile/remote applicability and
unverified cases. Minimal context and paid/live-provider experiments remain out of scope.

## Acceptance checks and local delivery

Use isolated synthetic projects/mock providers, actual client sends and native receipts, not only
projection fixtures. Verify:
- Initial exact provider options survive creation, inline/full-thread follow-up and reload; explicit
  later edits remain. Exercise provider-specific option shapes and unavailable configuration.
- Inline follow-up stays in its thread and triggers shared waiting; full-thread/other-client follow-up
  triggers the same state after returning. Waiting input/approval remains actionable.
- Shared send snapshots latest completed answers with labels and custom instruction, targets one
  chosen provider, creates one linked thread, displays native output, and continues correctly after
  reload. Context/body/request parity includes mentions, skills, attachments, permissions and workspace.
- Mixed completion/failure/stopped/deleted sources, no completed answers, reconnect, oversized context,
  rapid/concurrent sends and source-state changes do not cause silent omissions or duplicate dispatch.
- New roots collapsed, explicit expansion retained, open arrow uses existing full thread navigation;
  root deletion preserves children/follow-up thread; historical comparisons reopen.
- Wide/narrow layout, native scroll controls, draft focus and keyboard behavior, waiting animation,
  reduced motion, pane controls and full-height sizing. No real provider cost or personal-data fixtures.

Run meaningful focused tests, scoped typecheck/lint and required build. Advisor arranges bounded
independent review at a fixed revision before installation; resolve material findings and verify
exact final source/package identity. Planner backs up offline data/profile and prior app, installs
and launches the exact verified package for owner testing. Preserve source and dirty work before
builder archival. Working-app acceptance remains Cliff's. No push, PR, merge, publication or trust
changes. Ad-hoc packaging remains allowed without claiming the Safe Storage issue is fixed.

## Accepted compact prompts and native follow behavior — 2026-09-23

Cliff requests this bounded refinement directly after testing17; no further mock needed. Reuse
native T3 resting-composer presentation shown in his first two screenshots. Scope is the embedded
source and shared composers in a comparison; ordinary single-thread presentation remains native.

- After initial comparison submission/navigation, all source and shared composers start collapsed;
  do not autofocus/expand the shared follow-up or any source editor on mount/hydration.
- Only the composer currently being used expands. Focusing/clicking another source/shared composer
  collapses the previous one. Clicking/reading a timeline must not expand its editor merely because
  its pane becomes active. Leaving composers for other content allows all to rest.
- Preserve native compact single-line presentation for empty placeholder or retained draft preview.
  Collapsing never truncates/deletes the actual draft, attachments, mentions or selected options.
  Refocus restores the full draft and normal editing/caret behavior, including multiline text.
- Keep composer controls and owned popups usable through pointer and keyboard. Focus entering a
  model/options/attachment/mention menu must not collapse/dismiss the composer or lose the draft.
  Keep essential errors, approval/input notices and waiting/send semantics visible and functional.
- Expanded embedded composers use a smaller content-driven minimum, retaining comfortable padding
  and controls. Eliminate gratuitous blank rows; grow with actual multiline text/attachments up to
  a bounded editor height, then scroll within the editor. Preserve17short-pane cap and readable
  controls. Explain the current whitespace source before implementation; no global T3 restyle.
- Preserve native live-follow: initially show the live edge while answers arrive, follow new output
  when already at the end, detach when user scrolls up, and resume via Scroll to end. Focus/resting
  transitions and source updates must not steal focus, reset a draft, force a reading user down or
  break target scrolling. Shared-source busy/readiness behavior remains unchanged.

Verification: focused native composer/state tests and actual-client synthetic checks for empty and
multiline retained drafts; source-to-source-to-shared focus transitions; initial all-collapsed;
owned popup/keyboard operation; long draft growth/actual wheel; short/wrapped source answer scrolling;
streaming follow at end versus deliberate scroll-up detachment and Scroll to end resumption. Exercise
ordinary thread as compatibility control. Do not send real provider prompts for tests. Preserve
runnable actual-wheel assertions from17 and provide concrete before/after dimensions for reduced
empty space. Preserve submitted context/configuration behavior. Package exact reviewed18source and
planner safely installs/launches with offline rollback once app idle. Native checks stop on owner
activity; report limits explicitly. Working-app acceptance remains Cliff's decision.


### Installed verification correction — shared draft hydration

Installed18 verification found the shared composer disabled after reopening saved comparisons.
The authoritative run, source threads and stored draft referenced valid matching projects. Native
persisted-draft normalization interpreted the colon in Compare's reserved draft key as a legacy
scoped-thread separator, overriding the explicit draft environment/thread identity on hydration.
The behavior predates18. This is a delivery-blocking correction within CMP-001, not a project/data
migration or a change to native single-thread draft semantics.

New comparison follow-up reservations use colon-free deterministic draft IDs. Existing reserved
keys and user draft content remain intact. Before mounting an unpromoted shared draft, reconcile
mismatched scope from the authoritative comparison reservation using native draft-store methods;
preserve text, attachments, model/options, permissions and workspace selections. Existing server
threads and pending delivery commands retain their original identities and receipt/retry behavior.
No automatic send, new destination, live-profile rewrite or global migration change is authorized.

Verify new creation, existing colon-key hydration/reopen, exact content/options preservation,
server-shell and pending-delivery safety, then full isolated reload and installed native shared
composer availability, compact focus transfer and no-send draft handling. Target19 must include
reviewed18 compact/scroll behavior and this bounded correction. Preserve18 package/evidence and
all prior source/data backups. Working-app acceptance remains Cliff's.

Compare.21 workspace default and deletion-feedback refinements are owned by
[comparison sidebar actions](comparison-sidebar-actions.md#accepted-compare-controls-and-deletion-feedback--september24).
