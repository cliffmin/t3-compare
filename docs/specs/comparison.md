# Comparison requirements

Contributor compatibility baseline. Planner-directed changes carry an explicit accepted
feature contract from the product workspace. Preserve this baseline except for that scoped
change, and update this reference with the resulting behavior. This page remains usable
without access to private planning documents.

Send one prompt to selected providers, compare their native live responses, continue
individual threads and ask a chosen provider to work across completed answers.
Comparison is general-purpose; it does not automatically select a winner or merge answers.

## Native foundation

Reuse T3 provider execution, request construction, thread lifecycle/state, composers,
timelines, approvals/questions, navigation and workspace operations. Comparison adds
coordination and presentation; it must not create a parallel execution or transcript system.
Preserve ordinary single-provider behavior and existing records, IDs and user data.
The selected comparison surface is web/desktop; changes to shared code must account for
mobile and remote consumers without implying comparison parity there.

## Entry and configuration

- Preserve native New chat project selection and shortcuts. New drafts start with Compare off.
- New-chat guidance explains ordinary chat and independent comparison follow-ups. With Compare on,
  show a compact, wrapping selected-provider summary and the existing eligibility/send guard;
  keep this guidance out of existing threads and inline composers.
- Enabling Compare restores valid remembered provider choices and visibly opens the existing
  provider popup. The enabled, bold Compare label independently toggles the popup with pointer
  or keyboard; it never toggles the mode or changes configuration. Preserve focus restoration.
- Require at least two eligible selections. Use authoritative provider/model/capability catalogs,
  including valid legacy models. Preserve selection order and exact supported options,
  permissions and effective defaults in both displayed settings and dispatched requests.
- Remember provider instances, models and options per environment on this client, including
  unchecked providers. Explicit edits persist across new chats and restarts. Preferences must
  not mutate historical snapshots or other active drafts; toggling Compare off does not erase them.
- Never silently substitute unavailable models/options. After an authoritative catalog load,
  uncheck invalid selections, retain their choices for correction and explain why. Do not
  automatically recheck them later. Temporary loading/offline errors preserve preferences and
  block send while eligibility is unknown. Revalidate before dispatch to avoid unintended partial sends.
- Model changes may reset incompatible options using native rules. Selected legacy models remain
  visible/searchable. Present readable capability labels without changing their request keys.

## Workspace and dispatch

- Reuse native Current checkout / New worktree selection, base branch and setup. Explicitly
  enabling Compare defaults to New worktree only where native Git/worktree support exists.
  Do not reapply that default on edits, rerenders, reloads or later thread follow-ups.
- Current checkout uses the selected checkout for every source; New worktree prepares a distinct
  worktree per provider. Preserve explicit overrides and native eligibility/failure behavior.
  Workspace choice does not alter permissions; Current checkout is not read-only.
- Each source uses the exact submitted configuration. Preserve later native per-thread changes
  across navigation/reload. One provider's failure must not block access to the other threads.
- Reopen the same native thread identities without resending prompts or automatically retrying
  uncertain delivery. Use native receipts and authoritative state to reconcile launches. Unknown
  identity/state remains unresolved; unrelated later turns cannot establish initial-send success.
- Keep legacy merge records inert and stored data intact. No automatic merge dispatch or merged-result
  navigation; legacy merge routes resolve safely to the comparison.

## Layout and individual follow-ups

- Native project/title header, one centered shared prompt with left-aligned text, then native
  provider panes in selection order. Hide only the duplicate initial prompt inside panes;
  underlying threads and subsequent user messages retain their full history.
- Show actual provider/model/options and native streaming, activity, tools, approvals, questions,
  errors and completion. Do not invent activity or replace native timelines with flattened answers.
- Panes use available height and wrap at readable widths (approximately 26rem, allowing narrower
  full-width panes). All rows remain reachable without page-level horizontal overflow. Timelines
  and long drafts scroll independently on real wheel/trackpad input.
- Reuse native Scroll to end and follow behavior: follow while at the end, detach on deliberate
  scroll-up, resume on request. Updates must not steal focus or reset a reading position.
- A compact header arrow opens the exact provider thread. Keep workspace controls in native
  thread surfaces, without a comparison-header workspace selector or redundant pane footer.
- Each inline composer continues only its own thread with native attachments, mentions, skills,
  commands, model/options, permissions and workspace controls. It receives no other source answers.
- Source/shared composers start compact without autofocus. Only the actively edited composer
  expands; its owned menus remain usable. Collapse preserves the entire draft and attachments.
  Expanded editors grow to a bounded height, then scroll, preserving timeline space and caret access.

## Shared conversation

- Place an answer-aware composer below the panes, using available height and native bottom padding.
  No separate Follow up title row, answer selector, broadcast mode or Ask one/Continue all toggle.
  Placeholder: “Follow up on your {N} answers, @tag files/folders, $use skills, or / for commands”.
- Send the user's instruction to one selected provider in a linked ordinary native conversation.
  Subsequent sends continue it; preserve its identity, options, draft and history across reload.
  Its output is not a source answer and must not include itself in source context.
- Start from the comparison project/current checkout with native workspace controls. Do not
  arbitrarily inherit a source's isolated worktree or code changes.
- Allow drafting while any source is pending/running/awaiting approval or input, but block shared
  send. Show “Waiting for providers” in the controls row and preserve actionable native controls.
  Derive readiness from live native state regardless of where a turn started; honor reduced motion.
- Once sources are terminal, allow completed answers with visible missing-source notices. With no
  completed answers, block send with an explanation. Unknown/disconnected state is not completion.
  Native shared-thread activity also blocks duplicate sends.
- Snapshot the original prompt and latest completed answer turn per source at each send, labeled
  by provider/model/thread/turn. Include all final answer parts, excluding thinking/tool chatter.
  An earlier completed answer after a failed/stopped turn must be labeled as such. Treat answers as
  reference data, never elevated instructions or tools. Do not silently omit/truncate oversized context.
- Preserve the exact sent snapshot; later source turns do not rewrite history. Refresh context on
  subsequent sends without unintended duplication. Recheck readiness and serialize linked-thread
  creation/submission to prevent rapid-click or concurrent-client duplicates.
- Restore shared drafts from their authoritative reservation, preserving content, attachments,
  options, permissions and workspace. Normalize legacy reserved draft scope without changing
  existing server threads, pending commands or receipt/retry identity; never send automatically.

## Sidebar and group actions

- New comparison roots start collapsed. Selecting a group and expanding it are separate actions;
  preserve explicit expansion choices. Provider rows retain native thread menus/navigation.
- Aggregate membership is deduplicated source threads plus the server-backed shared conversation,
  including archived members where relevant. Exclude unrelated and hidden legacy output records.
  Counts include the shared conversation. Resolve membership afresh and guard uncertain receipts.
- Reuse native pin/unpin, settle/unsettle, snooze/wake, unread, archive/restore, links and applicable
  project actions. Ambiguous workspace/runtime actions stay on individual threads. Native shelves
  remain authoritative; support mixed state and honest partial success/retry without competing root state.
- Snooze/archive preserve native capability, busy and approval guards. Unread covers linked members;
  merely rendering a pane must not immediately clear it. Undo covers successful actions only.
- Root rename requires nonempty trimmed text, persists and never renames children. Regeneration uses
  native title generation/project settings and the original prompt; late results cannot overwrite
  later renames, newer requests or deleted roots. Failures preserve the title.
- Archive/restore uses native handlers and the existing Archive surface. Preserve retryable state
  on partial/storage failure; archived group deletion uses the same aggregate dialog.

## Deletion

- Always show one native-style aggregate confirmation. Cancel changes nothing. “Also delete {N}
  linked threads” defaults checked on each opening. Disclose permanent history deletion and stopping
  running sessions. Unchecked removes only grouping, preserving threads, drafts, worktrees and work.
- When checked members currently have worktrees, show subordinate text: “Also deletes unused
  worktrees and their local changes. Worktrees used elsewhere are kept.” Hide it when unchecked
  or inapplicable. Use current membership, including later shared worktrees, not initial workspace mode.
- Refresh changing membership/disclosure before destructive execution. Unresolved launch/shared-send
  identity blocks cascade while record-only removal remains available. Retain late child identities.
- One aggregate confirmation covers native thread and eligible worktree deletion; no extra per-thread
  dialogs. Reuse native session/terminal/history cleanup, receipts and explicitly confirmed worktree
  removal semantics, including disclosed local changes. Do not change standalone deletion policy.
- Protect main/project checkouts and worktrees used by any surviving thread, including archived and
  outside-group references. Recheck server references/canonical paths with native workspace leases;
  retain noncanonical aliases consistently with native cleanup. Deduplicate automatic/manual cleanup.
- Record only successful deletions; failed members remain references. Retain progress/root on partial
  failure and retry remaining targets. Report cleanup/storage failures accurately. Quiet redundant
  successful worktree-refresh toasts only on this path; preserve actionable failures.
- Active record-only removal navigates to a surviving child or safe fallback. Background removal
  leaves navigation unchanged. No broad filesystem deletion or resurrection of removed groups.

## Verification

Use focused regression tests, isolated synthetic providers and disposable Git worktrees. Check exact
request/configuration parity; independent progress/failure; shared readiness/context/duplicate guards;
reopen/draft persistence; actual scrolling and popup visibility; group partial failures, consent and
survivor protection. Include ordinary native thread behavior when shared components change.
Screenshots or geometry alone do not prove input handling; synthetic answers do not prove model quality.
