# Comparison pane polish

## Accepted scope
Cliff accepted the four-item proposal with “go” on 2026-09-22, authorizing implementation without another mock. Reference: t3 native centered Scroll to end pill; compare screenshot shows fixed-height panes and branch/Open thread footer. Baseline cbc9bb974be4d853a2d03c38ad20a943db1d8eb8, manual t3-compare-clarity checkout. Preserve all unrelated dirty documentation/specs and source backups. Branch codex/comparison-pane-polish.

## Behavior
- Reuse t3's native centered Scroll to end pill, down arrow, glass styling, focus handling and follow-to-end behavior in each provider pane. Show it only when that pane is away from its end. Activating it reaches that pane's end and restores following; other pane scroll positions remain independent. Avoid duplicating the control if a small shared component can preserve ordinary t3 behavior.
- A single row of provider panes fills the available height below the shared header/prompt, removing the existing fixed/rem cap and blank strip. Continue responsive provider wrapping with readable minimum widths. Multiple rows remain readable and vertically reachable; don't shrink long responses into tiny panes or clip providers. Test tall/short windows, prompt expansion and sidebar changes. Preserve keyboard and wheel scrolling.
- Remove the per-pane bottom footer. Preserve branch/workspace information in the existing workspace details surface, associated with the correct provider. Do not create a new bulky permanent strip.
- Place a compact Open thread action (external/open arrow) in each provider header; accessible name and tooltip explain opening that provider's thread to continue. Remove the misleading / stop wording. Navigation opens the same underlying thread, follow-ups remain there, existing deleted/unavailable-thread disabling preserved.

## Compatibility/exclusions
Retain native timelines, streaming/activity, requests/approvals/questions, errors, exact model/config labels, independent scroll and saved-run identity. No provider execution/configuration change, follow-up composer, automatic merge, AWLA work, live paid runs, broad refactor or public release. Signing source is already reviewed but certificate trust remains a separate owner gate; no trust/Keychain changes in this UI task.

## Verification and delivery
Builder read-only approach before planner READY. Run relevant focused tests/scoped lint/typecheck/web build and actual-client synthetic cases: 1/2/3/4 providers; wide single row and narrow wrapped rows; end/away/streaming follow on independent panes; long/wrapped config labels and prompt; header action navigating same thread; workspace branch identity; no footer gap. Test ordinary single-provider control if shared extraction changes it. Do not use real chats/credentials for fixtures. Recreate isolated runtime from preserved synthetic fixtures when needed; previous runtime is stopped and metadata is stale.

Package next UI test version compare.12 using existing ad-hoc path if persistent signing is still blocked; do not claim Keychain issue fixed. Use exact source/hash manifest, include dirty-doc provenance separately. Planner owns safe offline backups/install/launch, then owner tests. No push, PR, merge, publication or unrelated cleanup. Preserve handoff and archive builder after packaging/delivery work; actual owner acceptance remains pending.
