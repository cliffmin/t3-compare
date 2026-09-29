# Contribution boundary and AI assistance

## Upstream (T3 Code)

[T3 Code](https://github.com/pingdotgg/t3code) supplies provider adapters, event-sourced
server, typed WebSocket protocol, and the web/desktop/mobile application foundation.
Upstream MIT attribution is retained. Upstream stars, releases, and installers are **not**
claims about this fork.

## This fork

Cliff’s contribution is **product direction for comparison**: behavior and acceptance
criteria, UI decisions for the compare surface, and directing AI-assisted implementation,
debugging, and review. The fork adds comparison coordination, presentation, saved
comparison state, and follow-up workflows on top of native threads.

Do not assume Cliff manually authored every line. Do assume Cliff owns the contracts and
whether a change is accepted.

## AI-assisted development

Implementation often uses coding agents (for example ChatGPT, Codex, Cursor). Agent output
is not merge-ready by default. Expected loop:

1. Written contract (inputs, allowed actions, forbidden outcomes).
2. Agent proposes a minimal patch + tests.
3. Human (or documented review) accepts, requests changes, or rejects.
4. Optional later: bounded decision models (e.g. Jev) behind a feature flag for specific
   gates—not as unsupervised co-authors of the product.

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for PR expectations and AI attribution.
