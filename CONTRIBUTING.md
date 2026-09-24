# Contributing to this fork

This repository is Cliff Min's independent T3 Code fork for one prompt sent to selected providers
with their chosen models/options, then native live side-by-side comparison of individual answers.
It is a general comparison product; coding and the planned AWLA UI/UX case study are examples.
New comparisons do not automatically merge answers; existing records and threads must be preserved.
Upstream owns the original application and architecture. These instructions govern work here;
contributions to upstream follow [upstream's policy](https://github.com/pingdotgg/t3code/blob/main/CONTRIBUTING.md).

The [roadmap](docs/roadmap.md) records current scope and limits; the
[comparison guide](docs/user/composer.md#compare-provider-answers) explains the workflow.
Verify the source revision when reporting behavior. Accepted source/shared follow-ups are part
of this fork; dedicated synthesis UI remains deferred.

## Development

Follow the [development runbook](docs/operations/development.md#first-checkout)
and [repository guidance](AGENTS.md). Use Node 24 and the existing Vite+/pnpm lockfile.
Keep provider credentials, chat databases, logs, pairing URLs, and personal prompts out
of commits. Develop against isolated state, never the installed application's live data.

## Branches and commits

The intended public repository is `cliffmin/t3-compare`. Report fork issues there;
`cliffmin/t3code` is not this release's destination. Publication and repository settings remain
owner decisions. Do not publish private coordination, local receipts, profiles or conversations.

- Start each feature iteration on a new branch from the verified development baseline
  named in the planner's dispatch, recording its branch/ref and commit. Do not assume
  `main` is the latest development baseline. Use `codex/` by default; preserve existing
  branches and dirty work. Documentation-only dispatch may name an existing branch.
- Make each commit one coherent behavior change, with its tests. Keep unrelated cleanup
  separate. Prefer a small complete change over splitting code and its regression test.
- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
  `feat(compare): show native thread activity in each pane`,
  `fix(server): serialize concurrent worktree configuration`, or
  `ci: run fork checks on GitHub-hosted runners`.
- Explain the problem, relevant tradeoff, and validation in the body when they are not
  obvious from the diff. Do not invent test results or retroactively rewrite upstream history.
- Review `git diff` and stage explicit paths or hunks. Avoid sweeping unrelated changes
  into a commit. Inspect the staged diff for private data and generated artifacts.
- Only when explicitly authorized, open focused pull requests against **this fork**, with a Conventional Commit title.
  Squash merge a noisy iteration history; retain individually useful commits when appropriate.
  Pushes, merges, force pushes, public sharing, and releases require the owner's authorization.
- Keep `upstream` pointed at T3. Integrate upstream changes through a separate branch
  and review/CI cycle so regressions can be distinguished from feature work.

## Behavior contracts and scratch work

Track accepted behavior and acceptance criteria in the owning issue. Keep user guidance in
the existing comparison guide; do not duplicate private planning checklists.
Temporary implementation plans, research, and agent scratch stay uncommitted outside the
worktree. A process-documentation update does not accept a pending mock.

Comparison should reuse the native provider execution, live thread state, and timeline
rather than build a parallel flattened renderer. Preserve provider-specific behavior and
existing saved data. Do not claim this invariant is implemented before verification.

## Verification and review

Run focused tests and scoped lint/typecheck locally. Add regression tests for backend
behavior, including failure and concurrency cases. Do not weaken checks to hide failures.
CI owns the broader suites; do not run repository-wide checks locally unless requested.

[Fork CI](.github/workflows/fork-ci.yml) runs formatting, lint, server/contracts/client/web
typechecks, the web production build, web/shared-client tests, and the server suite across
three isolated shards. It requires no provider login or deployment secrets. Tests must use
fixtures or mocked adapters; live provider evaluation is a separate, explicitly authorized check.
Desktop packaging, native mobile behavior, and live model quality are not proven by these jobs.

Explicit mock acceptance authorizes the bounded local verification and packaging sequence.
The planner's dispatch names the checkout, isolated state, permitted tools/surfaces, and
verification owner; no second routine browser/runtime approval is needed within that scope.
Use existing `test-t3-app` and `test-t3-mobile` guidance as applicable. It does not authorize
unrelated computer control or paid live-provider evaluation. Synthetic fixtures are the
default; personal data requires an explicitly approved reproduction and never belongs in Git.
Distinguish static fixtures, backend behavior tests, actual app observations, and Cliff's
working-app acceptance. Record limitations, and measure latency before claiming improvement.

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

For comparison changes, inspect selected configuration, native thread behavior, independent
progress/failures, layout, and saved-result compatibility. Any authorized live demonstration
uses a repeatable nonprivate prompt; distinguish regression tests from model-quality evaluation.

## Reporting

Use [fork issues](https://github.com/cliffmin/t3-compare/issues) for bugs and feature requests.
The [security policy](.github/SECURITY.md) records the private-reporting publication gate. Inherited
`t3 triage` targets upstream; do not use it to send this fork's reports upstream.

## Presenting the project

Describe the comparison additions separately from T3's inherited backend. For portfolio case
studies, record shared inputs and provider access differences, selected/rejected suggestions and
the owner's rationale, authorized follow-through, and observed outcomes. Planned work remains
planned; a coordination strategy such as scatter-gather is not evidence of faster responses,
incremental rendering, or improved quality. Follow the [roadmap's evidence boundaries](docs/roadmap.md).

Link to focused diffs, tests, and reproducible examples. Document measured outcomes and
limitations rather than unsupported performance claims. UI changes need before/after
images or a short interaction recording. Keep evidence local unless review sharing is
authorized; upload sanitized evidence only within that scope, never commit it under
`.github/pr-assets`. Keep this fork experimental while workflow/UI changes continue.
