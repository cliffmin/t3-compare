---
name: vercel-react-best-practices
description: Consult targeted React performance guidance when profiling or reviewing Compare rendering, subscriptions, repeated work or bundle growth. Not a blanket refactoring checklist.
license: MIT
---

# React performance reference

Selected from Vercel React Best Practices for this React/Vite application.
Measure the affected scenario first; preserve native T3 state and component reuse.
The app uses React Compiler: inspect existing compiler/memoization behavior before
adding manual optimization. Do not add Next.js, SWR or other dependencies to apply a rule.
Read only the relevant references below. Recommendations require evidence of local fit.

- [async-parallel](rules/async-parallel.md)
- [async-defer-await](rules/async-defer-await.md)
- [bundle-barrel-imports](rules/bundle-barrel-imports.md)
- [bundle-conditional](rules/bundle-conditional.md)
- [client-event-listeners](rules/client-event-listeners.md)
- [client-localstorage-schema](rules/client-localstorage-schema.md)
- [rerender-defer-reads](rules/rerender-defer-reads.md)
- [rerender-derived-state](rules/rerender-derived-state.md)
- [rerender-derived-state-no-effect](rules/rerender-derived-state-no-effect.md)
- [rerender-functional-setstate](rules/rerender-functional-setstate.md)
- [rerender-lazy-state-init](rules/rerender-lazy-state-init.md)
- [rerender-simple-expression-in-memo](rules/rerender-simple-expression-in-memo.md)
- [rerender-move-effect-to-event](rules/rerender-move-effect-to-event.md)
- [rerender-use-ref-transient-values](rules/rerender-use-ref-transient-values.md)
- [rerender-no-inline-components](rules/rerender-no-inline-components.md)
- [rerender-split-combined-hooks](rules/rerender-split-combined-hooks.md)
- [js-batch-dom-css](rules/js-batch-dom-css.md)
- [js-index-maps](rules/js-index-maps.md)
- [js-set-map-lookups](rules/js-set-map-lookups.md)
