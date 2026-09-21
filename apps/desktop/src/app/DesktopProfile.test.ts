import { describe, expect, it } from "@effect/vitest";
import * as NodePath from "@effect/platform-node/NodePath";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import { resolveDesktopProfilePath } from "./DesktopProfile.ts";

describe("comparison profile isolation", () => {
  it.effect("separates production, development and explicit disposable profiles", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const input = {
        appDataDirectory: "/Users/test/Library/Application Support",
        resolvePath: path.resolve,
      };
      expect(resolveDesktopProfilePath({ ...input, isDevelopment: false })).toBe(
        `${input.appDataDirectory}/t3compare`,
      );
      expect(resolveDesktopProfilePath({ ...input, isDevelopment: true })).toBe(
        `${input.appDataDirectory}/t3compare-dev`,
      );
      expect(
        resolveDesktopProfilePath({
          ...input,
          isDevelopment: false,
          override: "/tmp/fresh-profile",
        }),
      ).toBe("/tmp/fresh-profile");
    }).pipe(Effect.provide(NodePath.layerPosix)),
  );
});
