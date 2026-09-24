# Remembered comparison configuration and simplified header

Owner accepted the full refinement proposal on 2026-09-22 and explicitly waived another UI mock/review before build. This authorizes scoped implementation, isolated verification, packaging and local installation; working-app acceptance remains separate.

## Baseline and outcome

Baseline: installed compare.10, application commit `6c66d3a4cee22bd3044ab7f1497919de32a8ad4e`. New branch `codex/comparison-preferences` in the existing isolated feature checkout. Preserve preexisting documentation/spec dirty work and retained runtime. This contract supersedes the historical merged-navigation requirement in comparison-clarity.md for this iteration.

Make comparison setup repeatable across new chats and restarts while preserving exact user choices, and remove obsolete merged-result navigation.

## Accepted behavior

- Center the shared native prompt bubble horizontally in the comparison content area (excluding sidebar). Keep text left-aligned and a readable capped width; preserve native message presentation and responsive panes.
- Rename `Actions for` to `Workspace:` with `Choose provider` placeholder, visibly grouped with native Open/Git controls. Explain that it chooses the workspace for those actions, not providers receiving the prompt. No arbitrary default target; retain exact-thread script handoff and scoped native actions.
- Remove all merged-result navigation from comparison: saved-result tabs/buttons and sidebar result entries. New sends never merge. Preserve old stored records and underlying threads without deletion or destructive migration. Legacy merged deep links normalize to the comparison view, keeping records inert. Remove only safely obsolete runtime merger code; do not broaden into schema/history deletion or unrelated cleanup.
- Remember selected provider instances, stable selection order, each model and supported option values across new chats, projects in the same environment, and application restarts. Preferences are client-local and scoped per environment/server; no cloud sync or cross-environment substitution. Retain configuration for unchecked providers so rechecking restores it. New chat Compare mode starts off; turning it on restores valid remembered selections and opens the picker. Toggling mode off must not erase choices. Save explicit configuration edits, not only when turning mode off.
- Keep remembered choices separate from immutable settings recorded on historical runs and per-draft active state. Changing defaults must not mutate an existing comparison or a different active draft. No automatic resend/retry.
- Never silently substitute a model or explicit option value. Validate against a successfully loaded authoritative catalog/capability set, including legacy models. If the exact saved model or configuration is genuinely unavailable, uncheck that provider, retain its old choice for explanation/correction, and show a concise reason in the picker. Do not automatically recheck it later without user choice. A temporary loading/offline/refresh failure must not overwrite preferences or falsely mark an old model removed; disable sending while availability is unknown. Missing provider instances likewise remain excluded with an understandable reason when reconciliation is authoritative.
- Unsupported/removed option IDs or values invalidate that provider selection; do not quietly replace them with defaults. Preserve user intent when advertised defaults change: remember effective selected settings rather than a moving implicit default where descriptors expose defaults. A model deliberately changed by the user may reset incompatible options using normal native rules.
- Require two valid checked providers before comparison send. Revalidate before dispatch, no partial unintended sends for invalid selections. Keep single-provider flow unchanged.
- Legacy is a grouping, not unavailability: keep valid legacy selections, automatically expand/reveal a selected legacy model when reopening the picker, and include legacy models in search. Do not assert live GPT model availability from hardcoded names.
- Render readable option labels using capability labels where supplied, otherwise sensible formatting (e.g. Reasoning effort, Fast mode, Service tier), avoiding raw camelCase fragments. Labels do not alter dispatch keys or values.

## Verification

Focused tests and actual-client synthetic fixtures must establish:
1. Configure multiple providers/options; send or leave draft; create a new chat, Compare initially off, enable and get the same selections/order/options. Verify restart/reload, toggling off/on, unchecked configuration restoration, separate environments and immutable past run settings.
2. Catalog loading/offline does not erase preferences. Authoritative missing model, removed provider, invalid option ID/value unchecks only affected selections with explanation, never substitutes and never sends until at least two valid selections. Selected legacy remains selected and visible; search reaches it.
3. Deterministic request payloads match restored options. No unintended duplicate sends. Existing ordinary single-provider behavior and native comparison timelines remain intact.
4. Shared prompt centered at wide/narrow widths; workspace selector remains understandable and targets exact provider; no merged tabs/sidebar entries; old records remain byte-equivalent where untouched and old merged URL resolves safely without dispatch.
5. Run focused regression suite, scoped lint/typecheck, production web build, independent desktop arm64 package (next version compare.11). Record exact commands, source revision, evidence and limitations. No repo-wide checks, live paid providers, backend redesign or performance-improvement claim.

## Delivery

Builder first returns a concise source-backed technical approach for planner review. After READY, complete implementation, checks, actual-client evidence and package; preserve handoff/package outside the worktree. Reuse the retained healthy isolated runtime where possible; builder is verification owner, planner independently reviews via cua_repl. Never develop against installed or upstream live data. Planner then performs safe offline backup, installs/launches exact build, verifies identity/history, preserves and archives builder. No push/PR/merge/public release, new accounts/access or destructive changes authorized.
