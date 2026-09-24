import { describe, expect, it } from "@effect/vitest";
import {
  GenerateComparisonTitleInput,
  ProjectId,
  DEFAULT_SERVER_SETTINGS,
  TextGenerationError,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import { TextGeneration } from "./TextGeneration.ts";
import { generateComparisonTitle } from "./ComparisonTitle.ts";
const projectId = ProjectId.make("fixture");
const input = { projectId, prompt: "Compare all designs", previousTitle: "Old title" };
const project = {
  id: projectId,
  title: "Fixture",
  workspaceRoot: "/tmp/comparison-fixture",
  defaultModelSelection: null,
  scripts: [],
  createdAt: "2026-09-23T00:00:00.000Z",
  updatedAt: "2026-09-23T00:00:00.000Z",
};
function harness(generate: TextGeneration["Service"]["generateThreadTitle"], exists = true) {
  return Layer.mergeAll(
    Layer.mock(ProjectionSnapshotQuery)({
      getProjectShellById: () => Effect.succeed(exists ? Option.some(project) : Option.none()),
    }),
    Layer.mock(ServerSettingsService)({ getSettings: Effect.succeed(DEFAULT_SERVER_SETTINGS) }),
    Layer.mock(TextGeneration)({ generateThreadTitle: generate }),
  );
}
describe("comparison title generation", () => {
  it.effect(
    "uses only the common prompt, prior title and native project policy; returns without mutation",
    () =>
      Effect.gen(function* () {
        let seen: Parameters<TextGeneration["Service"]["generateThreadTitle"]>[0] | undefined;
        const result = yield* generateComparisonTitle(input).pipe(
          Effect.provide(
            harness((request) => {
              seen = request;
              return Effect.succeed({ title: "Design choices" });
            }),
          ),
        );
        expect(result).toEqual({ title: "Design choices" });
        expect(seen?.message).toBe("USER:\nCompare all designs");
        expect(seen?.previousTitle).toBe("Old title");
        expect(seen?.cwd).toBe(project.workspaceRoot);
        expect(seen?.modelSelection).toEqual(DEFAULT_SERVER_SETTINGS.textGenerationModelSelection);
      }),
  );
  it.effect("bounds provider context and preserves final constraints", () =>
    Effect.gen(function* () {
      let message = "";
      yield* generateComparisonTitle({
        ...input,
        prompt: "Start. " + "x".repeat(25_000) + " Final constraint.",
      }).pipe(
        Effect.provide(
          harness((request) => {
            message = request.message;
            return Effect.succeed({ title: "Bounded" });
          }),
        ),
      );
      expect(message.length).toBeLessThanOrEqual(8_000);
      expect(message).toContain("Start.");
      expect(message).toContain("Final constraint.");
    }),
  );
  it.effect("does not invoke a provider for an unavailable project", () =>
    Effect.gen(function* () {
      const result = yield* generateComparisonTitle(input).pipe(
        Effect.provide(harness(() => Effect.die("must not generate"), false)),
        Effect.result,
      );
      expect(Result.isFailure(result)).toBe(true);
    }),
  );
  it.effect("returns unchanged title as no-op and propagates provider error", () =>
    Effect.gen(function* () {
      expect(
        yield* generateComparisonTitle(input).pipe(
          Effect.provide(harness(() => Effect.succeed({ title: "Old title" }))),
        ),
      ).toEqual({ title: null });
      const result = yield* generateComparisonTitle(input).pipe(
        Effect.provide(
          harness(() =>
            Effect.fail(
              new TextGenerationError({
                operation: "generateThreadTitle",
                detail: "mock unavailable",
              }),
            ),
          ),
        ),
        Effect.result,
      );
      expect(Result.isFailure(result)).toBe(true);
    }),
  );
  it("rejects empty and oversized wire input", () => {
    const decode = Schema.decodeUnknownSync(GenerateComparisonTitleInput);
    expect(() => decode({ ...input, prompt: " " })).toThrow();
    expect(() => decode({ ...input, prompt: "x".repeat(120_001) })).toThrow();
    expect(() => decode({ ...input, previousTitle: "x".repeat(1_001) })).toThrow();
  });
});
