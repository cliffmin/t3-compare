# T3 Compare: extending an AI coding workspace for comparison

T3 Compare lets a user send one prompt to selected AI providers, read their responses side
by side, continue each conversation independently, and ask a chosen model to work across
the completed answers. It is an independent fork of T3 Code.

## Problem and scope

Comparing answers across separate tools requires repeating prompts and manually carrying
context between conversations. The product brings those steps into one workspace while
keeping each provider's native conversation available.

The initial scope is a general comparison workflow for web and Electron. A dedicated
synthesis interface, verified ranking of models, and a differences view are outside the
current release. Providers can have different tools, permissions, subscriptions and context;
the interface does not make their answers a controlled benchmark.

## Contribution and attribution

Cliff defined product behavior, directed UI iterations and acceptance criteria, and used
AI agents for implementation, debugging and review. T3 Code supplies the provider adapters,
event-sourced server, typed WebSocket protocol and application foundations. The fork adds
comparison coordination, presentation, saved comparison state and follow-up workflows.

This is AI-assisted development. Agent review and automated checks provide evidence about
specific behavior; they do not establish human line-by-line review or prove model accuracy.

## Engineering choices

### Reuse native conversations

Comparison panes retain the application's existing thread lifecycle and provider execution.
Users can continue a source independently or open its full thread. This preserves native
activity, approvals and permissions while adding a shared comparison surface.

### Preserve what an answer actually represents

A saved original answer should not change when its conversation continues. A failed,
interrupted or unresolved launch should not become a successful answer merely because a
later turn completed. The snapshot logic records original identity and completion evidence,
and tests these distinctions explicitly.

See [snapshot implementation](../../apps/web/src/comparisonSnapshots.ts) and
[regression cases](../../apps/web/src/comparisonSnapshots.test.ts), including preservation
of original answers, unresolved launch evidence, interrupted partial text and undecodable
saved storage. These tests document intended behavior; release verification identifies
which checks ran against the published revision.

### Exercise the interaction with synthetic providers

Deterministic providers make it possible to test shared prompts and follow-ups without
spending provider quota or using private conversations. The README walkthrough contains
actual app captures with prepared responses and states that limitation explicitly.
Synthetic fixtures test application behavior; they do not demonstrate model reasoning,
real-provider reliability or tool-access equivalence.

## Current limits and next step

Comparison groups and preferences are client-local. Clearing site data can remove them.
The project makes no claim of native mobile parity, every-platform validation or production
adoption. Source installation is the first distribution path.

The next design iteration will examine how clearly users can start a comparison, understand
provider state and decide what to do with the answers. Its before/after evidence can extend
this case study once the changes are implemented and tested.
