# T3 Compare

T3 Compare is a fork of [T3 Code](https://github.com/pingdotgg/t3code): one prompt,
selected providers, native live answers side by side, individual follow-ups and a
shared answer-aware conversation. Read [comparison requirements](docs/specs/comparison.md)
when changing Compare. [README](README.md) covers setup and current limitations.

## Accepted handoffs and builder role

For planner-directed Compare work, read the provided frozen feature spec and mock/reference
before implementation. The handoff identifies the checkout, baseline commit, dirty-work ownership,
allowed scope, validation scenarios, planner destination and delivery finish line. Verify these
against the actual workspace and return a short source-backed approach; resolve routine details
with the planner. Report material missing product decisions instead of inventing behavior.

A private companion may own the canonical product decisions. Its handoff must provide the
relevant contract or an accessible snapshot; general contributors need only this repository.
The comparison document here is the carried-forward compatibility baseline. An explicitly
accepted feature contract may change it; reconcile both product and fork references afterward.
Do not copy private planning history, task IDs or personal evidence into this repository.

An accepted bounded local delivery includes scoped browser/runtime testing, packaging, backup,
installation and launch without a second routine approval. Owner working-app acceptance is
separate. Use the assigned scope; report when a host tool or required access is actually missing.

## Implementation

- Extend T3's existing provider execution, thread lifecycle, composers, timelines,
  state and shared client components. Add comparison coordination and presentation
  around them. Introduce a separate implementation only when the requirement cannot
  reasonably use the existing path.
- Preserve ordinary single-provider behavior, saved records, exact provider/model/options,
  permissions and native workspace semantics. Do not silently substitute configurations.
- Inspect the actual checkout and dirty state. Make the smallest complete change and
  preserve unrelated work. Keep the upstream layout, dependencies, license and attribution.
- Consider affected entry points, web/desktop/mobile clients, providers, contracts,
  reverse actions and local/remote connections. Do not expand scope to redesign them.
- Use existing patterns and vendored references. Read `.repos/effect-smol/LLMS.md`
  before writing Effect code. Keep orchestration pure and complexity at adapter boundaries.
- Shared UI components own their appearance: use existing variants/sizes; put layout on
  parents. Follow the checkout's styling/lint conventions before inventing overrides.
- Avoid continuously repainting animations; measure performance before claiming improvement.

## Development and data

Use Node 24 and Vite+/pnpm: `vp install --frozen-lockfile`, then `vp run dev`.
See [development](docs/operations/development.md) for setup and
[desktop builds](docs/operations/comparison-desktop.md) for profile isolation.

Use isolated `.t3` state and synthetic fixtures for automated tests and test servers;
never point them at installed app state or directly modify live databases. An accepted
local delivery includes a non-destructive installed-app smoke check after backup;
personal-data reproductions, destructive actions and paid provider runs
need explicit scope. Keep credentials, pairing URLs, conversations and logs out of Git.
Never set `VITE_HTTP_URL` or `VITE_WS_URL` for development; use the native single-origin proxy.
Stop only dev/test processes you started, using captured PIDs after confirming identity;
never kill by name or path pattern. For accepted installation, close the installed app
through normal quit after preserving user work. Pause if running/unsaved work cannot be retained.

## Verification

- Run focused tests and scoped lint/typecheck for changed behavior. Backend changes need
  meaningful regression tests. CI owns broad suites; no repository-wide checks unless asked.
- Test observable behavior, not static markup, callback wiring or copies of implementation.
  In async server tests, wait on typed receipts and worker drains, not sleeps or polling.
- For UI changes, exercise the affected flow in a real client using `test-t3-app`;
  use `test-t3-mobile` when native mobile is in scope. Reuse one isolated runtime.
  Verify actual scrolling, visible/hittable popups and reopen behavior where affected.
- Report checks and limitations accurately. Tests, screenshots and agent review do not
  establish owner acceptance or real-provider quality.
- For local installation, preserve an offline data/profile backup and previous app;
  install the exact verified package. Publication, pushes, PRs, merges and access/trust
  changes require explicit authorization.

## Skill triggers and progress

- `frontend-design`: implement visual choices within accepted direction; return material
  redesign questions to the planner.
- `web-design-guidelines`: accessibility/interaction review of affected UI.
- `systematic-debugging`: reproduce and trace failures before changing behavior.
- `vercel-react-best-practices`: measured rendering/subscription/bundle problems; account
  for React Compiler before manual memoization.
- `test-t3-app`: integrated web/desktop interaction with isolated synthetic state.
- `test-t3-mobile`: native mobile verification when affected and in scope.

Read the relevant .agents/skills/<name>/SKILL.md before use. Announce the stage, skill,
its purpose and next checkpoint; do not claim invocation from installation alone.
Report exact tested source, results/limits and package identity to the planner. Preserve the
single assigned runtime. Mark fixes requiring re-verification and identify real blockers.
If the host supports native task renaming, update the current task on meaningful transitions:
`[icon] [stage] · [feature] · [active skill or status]`. Build is 4/7, Validate 5/7, Deliver 6/7;
use 🔵 working, 🔧 fixing, 🟠 externally blocked, 👀 owner review, 🟡 ready, 🔴 failed,
and ✅ for the assigned builder work completed. Explicitly report that owner acceptance is
pending where applicable. The planner's feature completes only on owner acceptance.

Keep upstream guidance under review during upstream updates. Retain native architecture,
focused checks, multi-surface awareness, data/process isolation and attribution. Preserve
fork-specific synthetic-data and accepted-delivery authorization rules when reconciling it.

## Documentation

Document current behavior, setup and non-obvious constraints. Prefer code and tests for
implementation details. Update existing pages; remove obsolete prose instead of appending
history. Do not add role hierarchies, delivery ledgers, task routing or committed scratch plans.
Keep the contributor compatibility reference in the comparison spec and public future scope
in [roadmap](docs/roadmap.md). Product decisions for an assigned change come from its accepted
contract; keep the fork reference accurate when the behavior changes.
Use relevant project skills on demand; their generic suggestions do not override product
requirements, existing components, data boundaries or the user's instructions.

## Code map

- `apps/server`: WebSocket commands, events, projections, reactors and provider adapters.
- `apps/web`: React/Vite UI; `apps/desktop`: Electron shell; `apps/mobile`: React Native.
- `packages/contracts`: typed wire contracts; `packages/client-runtime`: shared client logic.
- `packages/shared`: shared utilities; `.repos`: read-only dependency references.
