# T3 Compare roadmap

One prompt, selected providers and models, and independent answers shown live side by side.
The product is for general comparison: idea exploration, writing, UI/UX review, and coding
are examples. Reuse T3's native provider execution and thread experience as this develops.

This is the canonical product direction, status, and roadmap. Changes require a scoped implementation and review; listing work here does not authorize execution.
The fork remains experimental. Upstream supplies the agent and client foundation; its adoption,
releases, and performance claims are not evidence for this fork.

## Current implementation and remaining acceptance

Status as of 2026-09-24; version labels describe this snapshot, not a permanently current install.

| Work                           | Implemented                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Still pending                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local comparison, Compare.21   | Select provider/model/options; compare native live responses; follow up independently or across latest completed answers; preserve shared drafts across reload; use native aggregate pin, settle, snooze, archive/restore and confirmed deletion. Compact composers and independent scrolling have focused client evidence. Compare controls default to separate worktrees where supported; aggregate deletion discloses current worktree cleanup in one confirmation. Local macOS arm64 package installed and launched. | Owner working-app acceptance and public-release approval. Separate worktrees require a supported Git project; current-checkout comparisons follow native project and provider eligibility. Non-Git controls were checked, not end-to-end provider execution. Groups/preferences stay on this client. |
| Persistent local macOS signing | Opt-in exact-certificate signing and artifact verification are implemented, tested, and independently reviewed in source.                                                                                                                                                                                                                                                                                                                                                                                                | Owner certificate approval, signed packages, installation, and an observed subsequent update without recurring Keychain prompts.                                                                                                                                                                     |

Local fixtures and focused checks support implementation claims; they do not establish model
quality or complete working-app acceptance. The selected comparison surface is web/desktop;
mobile and multi-device/remote comparison parity have not been accepted for this iteration.
Public fork-specific binaries are not yet provided. See the [user guide](user/composer.md#compare-provider-answers)
for the current workflow.

## Planned product work

- Collect owner feedback on the installed comparison workflow. Dedicated synthesis mode,
  differences view and claim-level source-link interface remain deferred.
- Keep the general comparison purpose clear while exposing workspace context where useful.
  Preserve independent responses, exact submitted settings, and access to each provider thread.
- Develop AI Workshop LA (AWLA) UI/UX review as the first portfolio case study of the general
  product, using the evidence plan below. This does not make comparison AWLA-specific.

## Planned AWLA case study

Use one bounded UI/UX question with a shared prompt, screenshots, relevant source, and explicit
constraints. Record what each provider actually received, its model/options, and differences
in tools, workspace, browser access, or permissions. Shared input does not imply identical access.

Show the individual suggestions, which the owner chose or rejected, and the owner's rationale.
Then document authorized follow-through and the observed outcome with suitable before/after
evidence. Keep model recommendations, owner decisions, implementation, and observations distinct.
If an outcome has not been observed, leave it pending. The case study is planned; it is not a
completed AWLA redesign or a model benchmark, and no quality, adoption, or performance gain
has been established by it.

## Engineering experiments, not measured results

Scatter-gather is a possible coordination strategy: distribute work to selected providers and
collect their results. It does not inherently provide incremental UI updates or a speedup.
Evaluate any change while preserving independently streamed responses, native lifecycle handling,
and useful partial results when another provider fails. Do not make automatic answer merging
a prerequisite for comparison.

Candidates include profiling multi-pane memory use and render responsiveness, reducing app
dispatch/render overhead, and maintaining native-component and request reuse. Define a scenario
and baseline before measuring. Separate app overhead from provider generation latency when
recording first-response or completion time; faster model output is not an app performance gain.
Record failure behavior, provider/model/access differences, and comparison limits. No performance
benefit is claimed yet; experiments need their own bounded scope and evidence.
