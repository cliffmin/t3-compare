# Contributing to T3 Compare

T3 Compare extends [T3 Code](https://github.com/pingdotgg/t3code) with native multi-provider
comparison. Follow [AGENTS.md](AGENTS.md), the [development guide](docs/operations/development.md)
and [comparison requirements](docs/specs/comparison.md).

- Reuse upstream components, execution and state. Preserve single-provider behavior and data.
- Keep changes focused, with meaningful tests and scoped lint/typecheck. Use synthetic
  providers and isolated state; real provider requests use the owner's subscription.
- Inspect the checkout, preserve unrelated work and use `codex/` for new feature branches.
  Use Conventional Commit titles and stage only the intended changes.
- Keep secrets, conversations, runtime data, builds and scratch plans out of Git.
- Push, open PRs, merge and publish only when authorized. Target this fork, not upstream.
  PRs describe the problem, change, validation and limitations; identify AI assistance
  and actual review. UI changes include sanitized images or interaction evidence.
- Keep the `upstream` remote and attribution. Integrate upstream changes separately from
  feature work; review incoming workflows before enabling them in this fork.

[Issues](https://github.com/cliffmin/t3-compare/issues) and
[security reporting](.github/SECURITY.md) belong to this fork. Inherited `t3 triage`
targets upstream. Contributions to T3 itself follow
[upstream's policy](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md).

[Fork CI](.github/workflows/fork-ci.yml) covers formatting, lint, typechecks, web build
and synthetic web/shared-client/server tests. It does not prove desktop packaging,
native mobile behavior or live provider output. Release operations are documented
in the [release guide](docs/operations/release.md).
