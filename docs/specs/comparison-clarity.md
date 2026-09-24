# Native comparison experience

Status: revision 04 mock accepted by the owner on 2026-09-22, with an explicit request to reuse the original T3 header code where possible. Working-app acceptance remains pending. Owner selected follow-ups in the individual provider thread; no inline comparison composer in this iteration.

## Reference and baseline

Accepted reference: comparison-clarity mock r04, SHA-256 `884e10c2e3f13a0c3136e7e7f9a505cd823a5ac45f4f9086c9b896edac2654f9`. The private planner handoff holds the local artifact path. Earlier mock revisions are superseded. Mock catalogs, text, timings and activity are synthetic, not production data or timing requirements.

Baseline: `codex/automatic-comparison-merge` at `4c1513bb61bc60cc6e5eda7dd4e45cd5e5c95512`; implementation branch `codex/comparison-clarity` starts there. Preserve the separately authorized uncommitted documentation alignment. No upstream integration is included.

## Outcome and behavior

A user sends one prompt to selected provider instances with chosen models and supported options, then compares each actual thread's live activity and answer.

- Expose provider selection/model/options clearly before submission. Use the actual connected catalog/capability descriptors, not mock model names. Require at least two eligible selections for comparison; explain unavailable providers. Model changes reset incompatible options. Freeze the effective settings for display with the run and send those same settings.
- Reuse native provider execution, request construction, thread state and timeline components. Do not introduce a parallel provider lifecycle or flatten assistant text into a replacement transcript. Inspect and reuse/extract native `ChatHeader`/`WorkspacePageHeader` and user-message presentation where feasible, avoiding duplicated route-global state. Explain any concrete reuse limitation in the approach review.
- Shared top: normal T3-style project/title/actions header, then one normal user prompt bubble. Below: provider identity and recorded settings, followed by the provider's native timeline (working timer, thinking/activity, tools/reasoning disclosures when supplied, streaming, completed work summary and final content).
- Hide only the duplicated initial prompt presentation inside comparison panes. Preserve the message in each underlying thread and in individual-thread view. Never globally drop subsequent user messages or alter history.
- Native approval/question handling, failure and cancellation must remain usable and thread-scoped. Preserve native scroll behavior and activity expansion. Do not invent thinking text or timers in production. One provider's error or pending request must not obscure others.
- Wrap provider panes in stable selection order based on actual available content width. Target existing 26rem readable minimum; allow one full-width pane below it. Wide windows fit all when possible; narrower windows create rows without horizontal page overflow. Page scroll reaches later rows and each timeline scrolls independently. Support long code/table content without forcing the overall layout wider.
- Header workspace actions target a explicitly chosen provider thread/worktree, never an arbitrary first provider or every provider. The accepted mock's action target picker is the reference; reuse existing action implementations and permission flow. Project/title represents the comparison; do not manufacture a shared worktree. Actions must be disabled with a reason when unavailable. Source review found native script actions coupled to the full thread terminal controller; a clearly labeled handoff to script actions in the exact selected provider thread is allowed. Reuse native Open/Git actions directly; do not duplicate terminal machinery or present a nonfunctional Add action button.
- Remove automatic merge creation, merger settings/selection and merged-answer navigation from new comparison flow. Preserve existing stored records, provider threads, IDs, settings and history. Provide a separate read-only Saved merged results entry for earlier results, with no new merge dispatch. Old pending automatic merge records must not resume creating merges merely on reopen. Do not destructively migrate historical data.
- Preserve ordinary single-provider use and the ability to open the exact underlying provider thread. Navigation/reopen must not resend initial requests or substitute later threads. No automatic retries after failure or uncertain delivery.

## Boundaries

Desktop/web comparison is the selected surface; assess shared effects and report mobile/remote limitations without a mobile redesign. No public release preparation, new providers, account/auth redesign, synchronization infrastructure, paid live evaluations or permanent journey viewer. Existing display theme and native behavior govern styling; the standalone HTML is a layout reference, not a component replacement.

Follow-up input: open the exact individual provider thread to send follow-ups. Do not add inline comparison composers. Comparison panes still handle native approvals/questions and retain live activity.

## Acceptance and evidence

Record tested revision, check/evidence and limits for each applicable scenario:

1. Two and four provider submissions use the selected instances/models/options with normal-thread request parity. Inspect deterministic dispatch evidence, not just labels. Unavailable provider and invalid selection fail visibly without partial unintended dispatch.
2. Concurrent thinking, tool activity, streaming, completion, failure/cancellation and approval/question examples match native thread behavior and remain bound to the correct thread. Expand completed work. Verify final output arrives even when session completion precedes buffered content.
3. Shared header and one initial user bubble render above the grid. No duplicate initial prompt in panes; opening individual threads still shows it. Header actions select the correct workspace without performing actual push/PR during verification.
4. Verify wide, two-column and single-column widths with four providers, sidebar changes, long content and independent scroll. No clipped fourth provider or page-level horizontal overflow.
5. Reopen/navigate while active and after completion: same thread identities, preserved selected settings/history, no duplicate dispatch. Ordinary single-provider flow remains functional.
6. Historical merged results remain readable; stored data is preserved. New comparisons and reopened legacy pending records never dispatch merges. No destructive migration.
7. Measure submission-to-dispatch, provider-event timing and event-to-render separately with deterministic fixtures before/after relevant changes. Do not claim live provider speed improvement from fixture timing. Paid live evaluations are excluded.
8. Run focused tests, scoped lint/typecheck and production web build appropriate to changed modules, plus desktop packaging checks. Follow repository guidance, not repository-wide test runs. Verify actual client behavior with synthetic fixtures in isolated state; direct projection fixtures alone do not prove backend request behavior.

## Delivery

Builder first returns a source-backed approach for planner review. After ready, implement, test, exercise the real client, fix in-scope defects and package the independent desktop app. Preserve existing identity/profile/data separation and upstream attribution. Return changed paths, checks, scenario evidence, unresolved limits, package identity/checksum and install/rollback instructions. No push, PR, merge, public sharing or paid evaluation. Keep raw evidence local and synthetic.

Planner reviews delivery, installs and launches the exact verified build with recoverable backup/data preservation, resolves assigned defects, preserves the package and handoff, then archives the builder. Owner accepts the working app separately. Finish packaging and assigned delivery before archival.
