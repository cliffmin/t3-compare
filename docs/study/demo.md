# Demo status

## Synthetic walkthrough (available)

The README walkthrough uses **actual app captures with synthetic providers** (Fixture Alpha /
Fixture Beta). They exercise shared prompt, independent follow-up, and shared follow-up
wiring without paid provider calls. They do **not** demonstrate live model quality or
tool-access differences.

See README § “A short walkthrough” and `docs/assets/compare-demo/`.

## Live-provider demo (not recorded yet)

A screen recording of a real multi-provider coding task (two authenticated coding agents,
visible tools/approvals, then a shared follow-up) is **planned and not yet published**.

Until that exists:

- Do not infer production usage from screenshots.
- Prefer reading the case study + tests for portfolio evaluation.
- When a live demo is added, link it here first, then in the README above the synthetic
  section, still labeled as live providers and disposable/sanitized.

## Checklist for the live demo (when recorded)

- [ ] Disposable repo or fixture project; no secrets in frames
- [ ] At least two real providers with visibly different tools or permissions if possible
- [ ] Shared prompt → pane follow-up → shared follow-up
- [ ] 60–90 seconds; captions for each step
- [ ] Cost/subscription note (uses operator’s own quotas)
