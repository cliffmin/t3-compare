# T3 Compare

T3 Compare is Cliff Min's private, experimental fork of
[T3 Code](https://github.com/pingdotgg/t3code). Upstream supplies the provider adapters,
typed WebSocket server, event-sourced orchestration, and web/desktop/mobile foundation.
Upstream's users, maintainers, hosted services, and release claims are not this fork's.
Preserve its license, copyright notices, and attribution.

## Direction and authority

The product direction is one prompt sent to selected providers with their selected models/options,
followed by native live side-by-side comparison of individual answers. This is a general comparison
product; coding and the planned AWLA UI/UX case study are examples, not application-specific limits.
New comparisons do not automatically merge answers. Preserve existing saved records and underlying
threads; historical navigation follows the accepted feature specifications. Do not revive permanent
dev-journey infrastructure.

The [roadmap](docs/roadmap.md) owns product direction, current status, planned work, and unmeasured
experiments. [Feature specifications](docs/specs/README.md) own accepted behavior and checks;
roadmap entries do not authorize execution. Portfolio evidence must distinguish shared inputs and
access differences, model suggestions, owner choices/rationale, implemented follow-through, and
observed outcomes. Do not turn planned demonstrations or engineering strategies into claimed
results, benchmarks, or measured improvements.

Comparison must reuse native provider execution, thread state, and timeline behavior,
including streaming, activity/thinking, completion, errors, approvals, and questions.
Do not substitute a flattened answer renderer or duplicate provider lifecycle for the
normal thread experience. Engineering details belong in the accepted application spec.

Cliff owns product scope and acceptance. The planner translates owner-selected scope into
mocks/specs and owns builder coordination and delivery review.
Builders own application implementation and builds within their dispatch. Explicit mock
acceptance authorizes the bounded local spec/build/verify/package/install sequence; working-app
acceptance remains Cliff's decision. A documentation-only task does not accept a mock or
authorize application work. Pushes, PRs, merges, public sharing/releases, paid provider
evaluations, and changes to access or destructive scope need separate authorization.

Preserve unrelated work and runtime/data boundaries. Prefer the smallest complete change;
measure performance before claiming improvement. Consider affected web, desktop, mobile,
and remote paths without broadening an accepted feature into a platform rewrite.

## A small glossary

Use the canonical [product aliases](docs/internals/glossary.md#product-names) and verify installed
versions when describing behavior. When communicating, use this language:

- **you** means the agent reading this file and changing this fork.
- **we, us, and maintainers** refer to this fork's contributors; Cliff owns its product and acceptance decisions. Upstream maintainers retain their own authority over T3 Code.
- **user** means the person using T3 Code to direct coding agents.
- **agent** means the coding agent a user runs inside T3 Code. Depending on context, that may also include you.
- **provider** means the agent runtime or harness T3 Code talks to, such as Codex, Claude, Cursor, or OpenCode.
- **client** means the web, desktop, or mobile UI.
- **environment** means one running T3 server and the machine, filesystem, provider credentials, and state it owns.
- **project** means an environment-local workspace record rooted at a directory.
- **thread** means the durable conversation and work history for a project.
- **turn** means one user-to-agent cycle, including follow-up work such as checkpointing.
- **T3 home** means the base data directory. Runtime state normally lives below its userdata directory.

## The three ways to hurt yourself

1. **Killing by pattern.** Never `pkill -f`, `pgrep | kill`, or `kill` a PID you found by matching a name, path, or worktree string. Your own agent process has this worktree's path in its argv, and this machine runs several other dev servers at once. Kill only a PID you captured at spawn, or the owner of your port from `ss -H -ltnp` after confirming `/proc/<pid>/cwd` is your worktree.
2. **Writing to the live install.** `~/.t3/userdata` is the developer's real T3 Code database, in use while you work. Reading or copying personal live data is permitted only for an explicitly approved reproduction (see Test data). Never start a server against it, never open it read-write, never clean it up.
3. **Baking in origins.** Never set `VITE_HTTP_URL` or `VITE_WS_URL` for dev. Dev is single-origin and Vite proxies `/api`, `/ws`, `/oauth`, and `/.well-known`. Setting them bakes localhost into the bundle and silently breaks every remote browser.

## Hit every surface

The most common defect in this repo is a change that works on the path you tested and is missing everywhere else. Before calling frontend work done, walk this list and say which entries applied:

- **Entry points.** A behavior reachable from the chat view is usually also reachable from Settings, the command palette, and a keybinding. Fixing one is not fixing the feature.
- **Clients.** Web, desktop (wraps web, adds Electron shell/IPC), and mobile (React Native, separate navigation). Shared logic lives in `packages/client-runtime`
- **Providers.** Codex, Claude, Cursor, Grok, OpenCode, and Antigravity each have an adapter. Provider-shaped features need a decision per adapter, even if the decision is "not supported here".
- **Contracts.** Anything crossing the wire is typed in `packages/contracts`. Change the schema and the server, web, mobile, and desktop all follow.
- **Reverse states.** If you added a way in, add the way out and the way to see it. Snooze needs unsnooze. Close needs reopen. A one-way door is a bug.
- **Connection modes.** Local, remote/relay, and tunnel behave differently. Multi-device and multi-environment cases are real.
- **Docs.** Check whether the change makes existing guidance inaccurate. Apply the [documentation rules](#documentation) before adding anything.

## Dev servers

- `vp i` installs. Worktrees get this from the t3.json setup script; if module resolution looks broken, it probably did not run.
- `vp run dev` starts server and web. In a worktree, state defaults to that worktree's gitignored `.t3`, which deliberately outranks an ambient `T3CODE_HOME` so you cannot land on shared state by accident. An explicit `--home-dir` still wins.
- Ports derive from the worktree path and are stable across restarts, but read the real ones from the `[dev-runner]` line since occupied ports shift.
- Sharing over the tailnet is three steps: run `vp run dev --share` in the background, wait for the `pairingUrl:` line in its output, then give that full URL to an unpaired browser. Do not wire up `tailscale serve` by hand, open the URL yourself, or consume the user's pairing link. A browser with the reusable dev cookie can use the bare origin. If a normal one-time token was consumed, mint a fresh one with `node apps/server/src/bin.ts pair`. It carries standard scopes, while the startup URL carries admin scopes needed for Connections settings.
- To reuse web dev auth across worktrees, configure one fixed `T3CODE_DEV_AUTH_TOKEN` in the main checkout's gitignored `.env`. The `t3.json` setup links that file into worktrees. Never commit or publish the token or a startup URL. See [Reusable dev credential](docs/operations/development.md#reusable-dev-credential).
- Stop what you started, by the PID you tracked. See rule 1.

## Test data

Use meaningful synthetic fixtures by default, including realistic thread/activity/error
states. Keep them in isolated worktree state; do not import personal prompts, conversations,
credentials, or runtime databases merely to make a preview realistic.

Only an explicitly approved reproduction may read or copy personal data. Minimize and
redact the selected records; keep them outside Git and review uploads. Never point a test
server at live state or open live state read-write. Snapshot an approved SQLite source
read-only with `VACUUM INTO` to a fresh destination; do not overwrite existing test state.
A plain live file copy is unsafe. Never symlink live data. Copy only explicitly needed
settings/secrets within the approved scope; data flows into isolation, never back to live state.


## Verifying

- Smallest proof that the change works. `vp test run <files>` for the tests you touched, targeted lint and typecheck for the scope you changed.
- Test meaningful logic or observable behavior. Do not render components to static markup to assert props or attributes, or add tests that merely assert callback wiring or mirror the implementation.
- **Do not run repo-wide checks.** No `vp check`, no `vp run -r test`, no `vp run -r typecheck` unless I ask. CI owns the full suite.
- Backend behavior changes ship with focused tests for that behavior.
- The server is event-sourced and its async flows emit typed receipts. Wait on receipts and worker drains, never on sleeps or polling. A test that needs a timeout to pass is wrong.
- Within accepted feature scope, user-visible frontend changes get an integrated real-client pass using `test-t3-app` or, when native mobile verification is in scope, `test-t3-mobile`. The planner coordinates one environment and identifies its verification owner; other agents do not independently launch duplicate servers. Mock acceptance includes the necessary scoped browser/runtime verification without a second routine approval. Dispatch must identify the checkout, isolated state, allowed surface/tools, and evidence required; it does not authorize unrelated browser or computer control. Without that authority, obtain it before launching verification.

For authorized mobile verification, a missing or outdated native client is a build step, not a blocker. Run `node scripts/mobile-native-client.ts ensure <ios|android> <device-id>` on the simulator host before starting Metro. It checks the local Expo fingerprint and builds/installs when needed. See `test-t3-mobile` for the full workflow.

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Conventional commit titles, plain language: `fix(web): new threads no longer spike CPU`.
- Body: the problem, change, relevant validation and limitations. State actual model/harness assistance and who reviewed what; do not imply human or independent review that did not occur.
- UI changes need before/after images. Motion or timing needs a short video.
- Within explicitly authorized PR/review sharing scope, upload sanitized evidence to GitHub. Never commit PR-only screenshots or assets such as `.github/pr-assets/`.
- One concern per PR. If the description says "also", split it.
- When babysitting: poll checks and comments newer than the last push, verify each bot finding against the source, fix real ones, dismiss false positives with a written reason. Stay quiet when nothing is new. Stop when the bots are green on the latest commit.

## Documentation

Most code changes do not need an internal documentation change. Agents can read the code.

- `docs/internals/` is for architectural decisions and their reasons, constraints that span components, and implementation traps that are hard to discover from the source. Before adding a paragraph, ask what a maintainer would get wrong without it. If reading the relevant code answers the question, leave it out.
- Do not document every feature, enumerate fields or methods, narrate control flow, maintain file catalogs, or append PR summaries. Types, tests, and code already record the implementation. The glossary defines shared vocabulary; it is not a feature index.
- Keep a local implementation explanation in a nearby code comment. Use an internal doc when the reasoning crosses boundaries or needs context the code cannot carry well. Link to the relevant source instead of copying it.
- When a documented decision or constraint changes, rewrite or remove the affected text. Do not append another account of the new behavior. A new internal page needs a distinct, durable reason to exist.
- `docs/user/` helps users accomplish tasks. Give each major feature a concise section explaining what it does, how to start, and anything unintuitive. A settings path is useful; descriptions of visible buttons, icons, layouts, animations, or every UI state are not. Before adding text, ask what task or decision it helps the user with.
- Keep user docs in the shipped product's voice, without implementation details or contributor tooling. Update the relevant feature section when how to use it changes. A UI tweak does not need a documentation entry, and a new control does not need its own page.
- `docs/operations/` holds maintainer setup, release, and debugging procedures. Keep instructions for operating an installed T3 Code server in the user guides.

## Plans and work artifacts

- Durable behavior and acceptance contracts belong in [`docs/specs/`](docs/specs/README.md). Record accepted scope, exclusions, failure states, scenarios, checks, and accepted mock reference there; link from the issue and planner continuity rather than copying checklists. This is distinct from temporary implementation planning.
- Use the verified development baseline named in the planner's dispatch, with its branch/ref and commit recorded. Start each new feature iteration on a new branch from that baseline; do not assume `main` is latest. Verify physical checkout, HEAD, and dirty state, preserving unrelated work. A docs-only dispatch may name an existing branch.

- Do not commit implementation plans, research notes, or agent scratch files. Keep temporary working material outside the worktree. `.plans/` is gitignored only as a safety net for legacy tooling.
- Finish builder packaging and assigned delivery before archival; preserve the tested revision, package and handoff. Installation must use the exact verified build with data/configuration and rollback preserved.
- Track active maintainer work in the GitHub issue or project item that owns it. Follow `CONTRIBUTING.md`; do not create public tracking artifacts without authorization.
- A merged PR is the implementation record. Close or update its tracking item when the work lands; do not preserve a duplicate implementation checklist. Keep the durable behavior spec current when accepted behavior changes.

## How it works

Clients send typed WebSocket requests. The server turns them into _commands_, a pure _decider_ turns commands into persisted _events_, and a _projector_ derives the read model the UI renders. Provider CLIs run as subprocesses; per-provider _adapters_ translate their native protocols into orchestration events. Side effects run in queue-backed _reactors_ that emit _receipts_ when milestones land. Each turn ends with a _checkpoint_, a hidden git ref, so the app can diff and restore.

Full glossary with file links: `docs/internals/glossary.md`

## Where code lives

- `apps/server` - WebSocket, orchestration, providers, checkpointing. Effect-heavy: read `.repos/effect-smol/LLMS.md` before writing Effect code.
- `apps/web` - React/Vite UI. `apps/desktop` wraps it, `apps/mobile` is React Native, `apps/marketing` is the site.
- `packages/contracts` - Effect/Schema contracts plus small derived helpers. No heavy runtime logic.
- `packages/shared` - shared runtime utils, subpath exports, no barrel.
- `packages/client-runtime` - client code shared by web and mobile.
- `.repos/` - vendored read-only references. Prefer their patterns over invented ones. Never edit or import from them. Sync with `vpr sync:repos` when bumping the matching dependency.

## Taste

- Complexity belongs at the adapter boundary. Orchestration stays pure, UI stays dumb.
- Inferred types over annotations. `any` is the enemy.
- Comments describe how a thing is used, and move when the code moves. To be used mostly to describe functions, not to annotate every line of behavior.
- Our users drive agents all day and notice a dropped frame, a lying spinner, and a stale label. No continuously repainting animations; they peg the GPU on high-refresh displays.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Additional tips

- Browser/computer use stays within explicit task authority, including the accepted feature verification scope above; ask only for a material expansion.
- Security is important, but should not be over-indexed on, especially for dev mode/maintainer-only features.
