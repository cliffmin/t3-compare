# Concepts under practice

These are the agentic-engineering ideas this fork is meant to exercise. Each should map to
a contract, code, and ideally a study issue.

| Concept | In this project | Status |
| --- | --- | --- |
| **Native session reuse** | Compare panes are real provider threads (tools, approvals, worktrees), not flattened chat bubbles | In tree; see comparison spec |
| **Answer provenance** | Original completed answers stay frozen when a pane continues; failed launches are not upgraded by later turns | Snapshot logic + tests |
| **Readiness as a decision** | Shared follow-up send is gated on terminal/completed state with explicit reasons | [#5](https://github.com/cliffmin/t3-compare/issues/5) |
| **Fairness disclosure** | Providers differ in tools/permissions; UI should not imply a controlled benchmark | [#6](https://github.com/cliffmin/t3-compare/issues/6) |
| **Bounded decision gate (Jev)** | LLM proposes / Jev chooses / code enforces, default-off, with receipts | [#7](https://github.com/cliffmin/t3-compare/issues/7) (Phase B) |
| **Synthetic vs live evidence** | Fixtures verify workflow; live providers verify value | [demo.md](./demo.md) |

## Explicitly deferred

Dedicated synthesis UI, differences view, claim-level citations, and auto-ranking. They
collide with eval/Arena products and weaken the “workflow harness” story until the core
loop is obvious.
