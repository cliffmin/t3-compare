# Contributing to this fork

This repository is Cliff Min's independent T3 Code fork for comparing provider answers
and generating source-linked synthesis. Upstream owns the original application and
architecture. These instructions govern work here; contributions to upstream follow
[upstream's policy](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md).

## Development

Follow the [development runbook](docs/operations/development.md#first-checkout)
and [repository guidance](AGENTS.md). Use Node 24 and the existing Vite+/pnpm lockfile.
Keep provider credentials, chat databases, logs, pairing URLs, and personal prompts out
of commits. Develop against isolated state, never the installed application's live data.

## Branches and commits

- Branch from the fork's current `main` for each bounded change. Use `feat/`, `fix/`,
  or `codex/` prefixes. Preserve existing branches and uncommitted work.
- Make each commit one coherent behavior change, with its tests. Keep unrelated cleanup
  separate. Prefer a small complete change over splitting code and its regression test.
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
  `feat(compare): retain sources across merge revisions`,
  `fix(server): serialize concurrent worktree configuration`, or
  `ci: run fork checks on GitHub-hosted runners`.
- Explain the problem, relevant tradeoff, and validation in the body when they are not
  obvious from the diff. Do not invent test results or retroactively rewrite upstream history.
- Review `git diff` and stage explicit paths or hunks. Avoid sweeping unrelated changes
  into a commit. Inspect the staged diff for private data and generated artifacts.
- Open focused pull requests against **this fork**, with a Conventional Commit title.
  Squash merge a noisy iteration history; retain individually useful commits when appropriate.
  Do not force-push shared branches or publish a release without the owner's authorization.
- Keep `upstream` pointed at T3. Integrate upstream changes through a separate branch
  and review/CI cycle so regressions can be distinguished from feature work.

## Verification and review

Run focused tests and scoped lint/typecheck locally. Add regression tests for backend
behavior, including failure and concurrency cases. Do not weaken checks to hide failures.
CI owns the broader suites; do not run repository-wide checks locally unless requested.

[Fork CI](.github/workflows/fork-ci.yml) runs formatting, lint, server/contracts/client/web
typechecks, the web production build, web/shared-client tests, and the server suite across
three isolated shards. It requires no provider login or deployment secrets. Tests must use
fixtures or mocked adapters; live provider evaluation is a separate, explicitly authorized check.
Desktop packaging, native mobile behavior, and live model quality are not proven by these jobs.

The stable branch-protection check is `Fork CI required`. Before enabling it on `main`,
publish the workflow and get a successful run on the actual change. Require pull requests,
resolved conversations, and passing checks; disable force pushes and branch deletion.
A solo maintainer need not require another person's approval. Branch protection is a GitHub
setting and is not activated merely by committing these files.

Inherited workflows are restricted to `pingdotgg/t3code`. This fork's CI uses GitHub-hosted
runners, read-only permissions, pinned action revisions, frozen dependency installation,
and cancellation of superseded runs. Publishing and deployment remain separate decisions.
When syncing upstream, review new workflows before enabling them in the fork.

## AI-assisted development

AI tools may assist design, implementation, and review. The author remains accountable
for understanding and verifying the change. In the pull request, state the model/harness
used, the substantive assistance, what you reviewed, and what remains unverified. Never
use generated claims as test evidence or upload credentials/private conversations as fixtures.

For synthesis changes, inspect attribution, unsupported claims, disagreement handling,
failed providers, input limits, and saved-result behavior. Use a repeatable nonprivate prompt
for a live demonstration; distinguish automated regression tests from model-quality evaluation.

## Presenting the project

Describe the comparison and synthesis additions separately from T3's inherited backend.
Link to focused diffs, tests, and reproducible examples. Document measured outcomes and
limitations rather than unsupported performance claims. UI changes need before/after
images or a short interaction recording, uploaded as review evidence rather than committed
under `.github/pr-assets`. Keep this fork experimental while workflow/UI changes continue.
