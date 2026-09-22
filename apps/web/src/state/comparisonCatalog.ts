import { Atom, AsyncResult } from "effect/unstable/reactivity";
import * as Option from "effect/Option";
import type { EnvironmentId } from "@t3tools/contracts";
import { serverEnvironment } from "./server";
import { environmentPresentations } from "./presentation";
import { applyProviderInstanceSettings, deriveProviderInstanceEntries } from "../providerInstances";
import type { ComparisonCatalog } from "../comparisonPreferences";

export const comparisonCatalogAtom = Atom.family((environmentId: EnvironmentId) =>
  Atom.make((get): ComparisonCatalog => {
    const state = get(serverEnvironment.configProjection({ environmentId, input: {} }));
    const projection = Option.getOrNull(AsyncResult.value(state));
    const presentation = get(environmentPresentations.presentationAtom(environmentId));
    const config = projection?.config;
    // A successful stream remains waiting for its next event; that is not a catalog load.
    return {
      authoritative:
        state._tag === "Success" &&
        projection?.source === "live" &&
        presentation?.connection.phase === "connected",
      entries: config
        ? applyProviderInstanceSettings(
            deriveProviderInstanceEntries(config.providers),
            config.settings,
          )
        : [],
      planModeEnabled: true,
    };
  }),
);
