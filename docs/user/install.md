# Run T3 Compare

T3 Compare is an independent T3 Code fork. This candidate is distributed as source;
public fork binaries and a hosted demonstration are not provided. Upstream installers,
`npx t3`, Homebrew's `t3-code`, and upstream mobile apps install T3 Code, not this fork.

## Requirements

Use Git, Node.js 24.13.1 or later in the 24.x series, and
[Vite+](https://viteplus.dev/guide/). The lockfile selects the package manager version.
A configured provider is needed to send a prompt, but you can launch the interface first.
Real provider requests use your own credentials, subscription or quota.

## Source quickstart

```sh
git clone https://github.com/cliffmin/t3-compare.git
cd t3-compare
vp install --frozen-lockfile
T3CODE_TELEMETRY_ENABLED=false vp run dev --home-dir "$PWD/.t3"
```

The clone URL is the intended publication destination; access remains restricted until the
owner publishes the candidate. Open the local pairing URL printed by the runner. Its token
is a credential: do not include it in screenshots or reports. The explicit home directory
keeps this checkout's data under the ignored `.t3` directory rather than the installed app's
state. Keep `VITE_HTTP_URL` and `VITE_WS_URL` unset.

Add a Git project and configure the providers you want in Settings. Turn on Compare in the
composer, select at least two provider configurations, then send a shared prompt. See
[Compare provider answers](./composer.md#compare-provider-answers).

Stop the development command with Ctrl-C. Update a source checkout through Git and reinstall
from the lockfile; inherited CLI update commands follow upstream distribution channels.
For development checks and local desktop builds, use the
[development guide](../operations/development.md). Local macOS arm64 packages default to ad-hoc signing, with optional
[stable local signing](../specs/local-development-signing.md). Neither is notarized distribution
or a guarantee about future Keychain prompts.
Windows, Linux, mobile and remote comparison parity have not been release-verified.

## Inherited services

The fork reuses T3's provider/runtime foundation. Starting locally does not make every
operation offline. The server's product analytics default to enabled; the command above
disables them for that process. Other start commands need the same environment variable if
you want the same setting. See [product usage data](./telemetry.md).

Provider/model metadata can come from upstream, and provider authentication or requests
connect to their providers. Remote access, T3 Connect, upstream update channels, app stores
and support links are inherited services, not services operated by this fork. The inherited
`t3 triage` command prepares upstream reports; do not use it to report fork behavior.
Use this fork's issue form with sanitized reproduction details instead. Do not send credentials,
pairing URLs or private conversation history.

## Providers

Open **Settings → Providers** in the web or desktop app, select the environment,
and enable the provider you want. Installation, login, and configuration belong
to that environment's machine, even when you connect from a phone or another
computer.

| Provider    | Install and authenticate                                                                     |
| ----------- | -------------------------------------------------------------------------------------------- |
| Codex       | Install [Codex CLI](https://developers.openai.com/codex/cli), then run `codex login`.        |
| Claude      | Install [Claude Code](https://claude.com/product/claude-code), then run `claude auth login`. |
| Cursor      | Install [Cursor CLI](https://cursor.com/cli), then run `agent login`.                        |
| Grok Build  | Install [Grok Build CLI](https://x.ai/cli), then run `grok login`.                           |
| OpenCode    | Install [OpenCode](https://opencode.ai), then run `opencode auth login`.                     |
| Antigravity | Install and sign in with Google from T3 Code's provider settings.                            |

Provider CLIs must be on the server's `PATH`. If T3 Code cannot find one, set its
**Binary path** in provider settings, especially when using a version manager.
Cursor's executable is `cursor-agent`, although its login command is
`agent login`. Antigravity can use its managed runtime without a `PATH` entry.

When a provider CLI is behind its latest release, its provider card shows the
available version. **Update now** appears only when T3 Code can tell which
installer owns the CLI (its own update command, Homebrew, or a global npm, pnpm,
bun, or Vite+ install) and runs that installer. Otherwise update the CLI the same
way you installed it. Homebrew installs compare against the version Homebrew
offers, which can trail the npm release by a few hours.

Add another provider instance for a separate account or configuration. Each
instance can have its own environment variables, such as API keys or a custom
base URL. Mark secret values as sensitive; after saving, T3 Code does not display
their original values.

For provider-specific setup and accounts, see [Codex](./providers-codex.md),
[Claude](./providers-claude.md), [OpenCode](./providers-opencode.md), and
[Antigravity](./providers-antigravity.md).

## Next steps

- [Compare and follow up](./composer.md#compare-provider-answers).
- [Working with threads](./thread-sidebar.md) and [permission modes](./permission-modes.md).
- [Scope and limits](../roadmap.md).
- [Upstream T3 Code](https://github.com/pingdotgg/t3code) for upstream installation and services.
