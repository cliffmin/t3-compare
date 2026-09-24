# Behavior and acceptance specifications

Keep one concise, durable contract per bounded feature here. A spec records the accepted
outcome and mock revision, verified development baseline (branch/ref and commit), behavior,
exclusions, relevant failure and data-compatibility cases, acceptance scenarios, required
checks, and delivery stopping point. Identify proposed versus accepted behavior explicitly.
This policy does not accept any pending mock or authorize implementation.

Comparison panes reuse native T3 thread execution, state and timeline components;
grouping and layout must not create a second thread implementation. As relevant, scenarios
cover request/configuration parity with a normal thread, streaming/activity, failure and
cancellation, and reopening the same thread. Live model outputs need not be identical.
Follow-up controls and other product differences require explicit scope.

Link the contract from the owning issue and planner continuity instead of duplicating its
checklist. Keep temporary implementation plans, research, raw logs, screenshots, runtime data,
and agent scratch outside Git. Review evidence records tested revision, scenario, observations,
checks and limitations; it must not invent human or independent review. Keep the contract
current when accepted behavior changes. A merged PR records implementation history.

Older specs retain the worktree names and branches used for their original delivery as
provenance. Those checkouts may no longer exist; use the current repository `main` and the
planner's current-state handoff for a new assignment.

Builder packaging and assigned delivery work must finish before archival. Preserve the
handoff, tested revision and package; install/launch the exact verified build within authorized
scope with data/configuration and rollback preserved. Working-app acceptance remains the
owner's decision. See [contribution guidance](../../CONTRIBUTING.md).
