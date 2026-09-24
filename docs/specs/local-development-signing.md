# Stable local macOS signing

Cliff accepted persistent local development signing on 2026-09-22 after recurring T3 Compare Safe Storage prompts across ad-hoc updates. No UI mock is applicable.

## Outcome
Future local development packages reuse one persistent code-signing identity so macOS can recognize the same application across updates. Preserve bundle ID, app data, encrypted credentials and current comparison behavior. A one-time transition approval may remain necessary.

## Scope
Baseline fff64a30ab7eebd9ea75a1f0aca10ce30da5cba7 in the existing isolated t3-compare-clarity checkout. Preserve dirty docs/specs. Inspect read-only first and return source-backed approach to planner; implement after READY on codex/local-signing. Configure an explicit opt-in local signing path, distinct from Developer ID/notarized distribution and ad-hoc builds. Reuse a persistent local certificate/private key held outside Git; fail clearly if the requested identity is unavailable. Document repeatable local packaging and identity lifetime. Do not expose private keys or passwords.

No Keychain data deletion, broad access grant, blanket root trust, plaintext storage, credential migration, paid membership, public release, push or PR. User handles any password or OS approval privately. Prefer Apple Certificate Assistant for certificate creation; explain any material trust/access requirement before proceeding.

## Verification and finish line
Run relevant required repository checks and packaging tests. Verify explicit local signing does not silently fall back to ad-hoc and leaves distribution defaults intact. Verify two changed app builds share the signer and designated requirement while code hashes differ; deep strict signatures pass. Package next local version compare.12 with exact source/hash and handoff. Use synthetic data for developer tests. Planner performs offline backups and safe install, retaining old bundle and data. Actual absence of repeated Keychain prompts requires an observed post-transition update launch, not just signature checks. Report this limitation honestly if owner approval blocks it.
