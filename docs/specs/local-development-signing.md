# Local macOS signing

Local packages may opt into one persistent signing identity, separate from ad-hoc
builds and Developer ID/notarized distribution. Preserve bundle identity, app data and
encrypted credentials. An explicitly requested identity must fail clearly if unavailable;
never silently fall back to ad-hoc signing. Keep certificates/private keys outside Git
and leave distribution defaults unchanged.

Do not delete Keychain data, widen access, change trust or migrate credentials as part
of packaging. The user handles OS approvals privately. See the
[development guide](../operations/development.md) for build configuration.

Verify changed builds retain their signer/designated requirement and pass signature
checks. Absence of recurring Keychain prompts requires observing an actual subsequent
update; signature checks alone do not establish it.
