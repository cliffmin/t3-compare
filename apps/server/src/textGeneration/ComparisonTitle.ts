import {
  GenerateComparisonTitleError,
  type GenerateComparisonTitleInput,
} from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import { DEFAULT_THREAD_TITLE } from "../orchestration/threadTitles.ts";
import { TextGeneration } from "./TextGeneration.ts";
import { formatThreadTitleContext } from "./ThreadTitleContext.ts";

/** Uses the native title service and project policy without creating or updating conversations. */
export const generateComparisonTitle = Effect.fn("generateComparisonTitle")(
  function* (input: GenerateComparisonTitleInput) {
    const query = yield* ProjectionSnapshotQuery;
    const project = yield* query.getProjectShellById(input.projectId);
    if (Option.isNone(project)) {
      return yield* new GenerateComparisonTitleError({
        message: "The comparison project is unavailable.",
      });
    }
    const settings = yield* ServerSettingsService;
    const generation = yield* TextGeneration;
    const { message } = formatThreadTitleContext([{ role: "user", text: input.prompt }]);
    const result = yield* generation.generateThreadTitle({
      cwd: project.value.workspaceRoot,
      message,
      previousTitle: input.previousTitle,
      modelSelection: resolveProjectSettings(yield* settings.getSettings, input.projectId).settings
        .textGenerationModelSelection,
    });
    const title = result.title.trim();
    return {
      title:
        title && title !== DEFAULT_THREAD_TITLE && title !== input.previousTitle ? title : null,
    };
  },
  Effect.mapError((error) => new GenerateComparisonTitleError({ message: error.message })),
);
