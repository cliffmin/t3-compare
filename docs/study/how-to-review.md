# How to review this work

Intended for hiring managers, peers, or anyone evaluating the fork as a portfolio study.

## Five-minute path

1. **README** — problem, fork relationship, study framing, demo honesty.
2. **[goals.md](./goals.md)** — what success means (and does not).
3. **[contribution-and-ai.md](./contribution-and-ai.md)** — authorship boundary.
4. **[Engineering case study](../internals/comparison-case-study.md)** — problem, choices, limits.
5. **Skim** [`docs/specs/comparison.md`](../specs/comparison.md) headings for product rigor
   (you do not need to read every line).

## Evidence of engineering judgment

- Snapshot provenance: `apps/web/src/comparisonSnapshots.ts` and
  `apps/web/src/comparisonSnapshots.test.ts`.
- Fork CI: [`.github/workflows/fork-ci.yml`](../../.github/workflows/fork-ci.yml).
- Active experiments: issues labeled `study-experiment`.

## What not to over-read

- Star/fork counts (near zero; study phase, source preview).
- Synthetic README screenshots (workflow only; see [demo.md](./demo.md)).
- Historical closed issues marked `[archive]` (superseded by the consolidated spec).

## Suggested interview prompts

- Why keep native threads instead of a parallel compare transcript?
- What must never happen when freezing an “original answer”?
- How would you feature-gate a Jev readiness decision without breaking default installs?
