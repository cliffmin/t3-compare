# T3 Compare scope

Compare sends one prompt to selected providers and displays their native live threads.
Users can follow up independently or send a custom instruction with completed answers
to one chosen provider. See [requirements](specs/comparison.md) and the
[user guide](user/composer.md#compare-provider-answers).

Comparison targets web and Electron desktop. Groups and preferences are client-local;
mobile and multi-device comparison parity are not supported commitments. Public
Compare binaries are not provided. Real providers require their own authentication.

## Future scope

- Refine comparison usability from working-app feedback.
- Dedicated synthesis controls, differences and claim-level source links are deferred.
- Optional reduced-context comparisons are deferred.

Future items are not implementation instructions. Preserve native T3 reuse and the
current product while addressing the user's selected task.
