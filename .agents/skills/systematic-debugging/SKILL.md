---
name: systematic-debugging
description: Investigate a reproducible bug, failing test or unexpected behavior before choosing a fix. Use for provider, state, UI and packaging defects.
license: MIT
---

# Systematic debugging

Adapted from obra/superpowers for T3 Compare.

1. Read the failure and relevant changes. Reproduce with isolated synthetic state;
   record expected and observed behavior. If intermittent, gather evidence first.
2. Trace the failing value/event through native request, adapter, receipt, projection
   and UI boundaries as applicable. Compare with a working native single-thread path.
   Inspect only needed fields; never dump environments, secrets or conversations.
3. State a specific hypothesis and make the smallest diagnostic change that tests it.
   Change one variable at a time. A failed hypothesis is evidence, not a reason to
   stack speculative fixes.
4. Add a focused regression for observable behavior, then correct the originating
   defect using existing T3 components. Avoid unrelated refactors and new lifecycle code.
5. Run the relevant checks and real-client interaction when applicable. Distinguish
   observed results from assumptions; report unresolved limits.

For asynchronous server behavior, wait on native typed receipts and worker drains,
not sleeps or condition polling. For UI failures, reproduce actual input, scrolling
and visible/hittable controls; geometry or an accessibility tree alone is insufficient.

After repeated failed attempts, revisit the reproduction, assumptions and system
boundary before trying another patch. Ask the user only for a material scope/access
or product decision. Do not infer that repeated failure proves an architecture rewrite
is necessary. If the cause is external or still unknown, say so and retain evidence.
