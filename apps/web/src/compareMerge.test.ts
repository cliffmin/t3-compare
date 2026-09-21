import { describe, expect, it } from "vite-plus/test";
import { PROVIDER_SEND_TURN_MAX_INPUT_CHARS } from "@t3tools/contracts";
import {
  buildMergePrompt,
  DEFAULT_MERGE_INSTRUCTIONS,
  labelMergeCitations,
  readMergeInput,
  selectMergeSources,
  snapshotMergeSource,
} from "./compareMerge";

const source = (index: number, text = "First proposal.\n\nSupporting reasoning.") =>
  snapshotMergeSource({
    index,
    label: index ? "Gemini" : "Codex",
    model: `model-${index}`,
    threadId: `thread-${index}`,
    text,
  });

describe("comparison merging", () => {
  it("captures the question, instructions, refinement, and immutable source passages", () => {
    const originals = [source(0), source(1)];
    const input = {
      question: "Fix my streaming workflow",
      direction: "Make a proposal, not code",
      sources: originals,
      previousAnswer: "Earlier synthesis",
    };
    const prompt = buildMergePrompt(DEFAULT_MERGE_INSTRUCTIONS, input);
    originals[0] = source(0, "Later edited answer");
    const restored = readMergeInput(prompt)!;
    expect(restored.question).toBe(input.question);
    expect(restored.direction).toBe(input.direction);
    expect(restored.previousAnswer).toBe("Earlier synthesis");
    expect(restored.sources[0]?.passages).toEqual([
      { id: "S1-P1", text: "First proposal." },
      { id: "S1-P2", text: "Supporting reasoning." },
    ]);
    expect(restored.sources[1]?.model).toBe("model-1");
  });

  it("excludes failed, streaming, empty and unchecked responses without renumbering source IDs", () => {
    const candidates = [
      { source: source(0), status: "error" },
      { source: source(1), status: "running" },
      { source: source(2), status: "completed" },
      { source: source(3, ""), status: "completed" },
      { source: source(4), status: "completed" },
      { source: source(5), status: "completed" },
    ];
    expect(
      selectMergeSources(candidates, { "thread-2": false }).map((item) => item.source.id),
    ).toEqual(["S5", "S6"]);
  });

  it("uses recorded provider and model labels and flags invented citations", () => {
    expect(
      labelMergeCitations(
        "Try this [Wrong name](#source-S1-P2). Another [Fake](#source-S9-P1). **[Synthesis]**",
        [source(0)],
      ),
    ).toBe(
      "Try this [Codex · model-0](#source-S1-P2). Another **[Unresolved source]**. **[Synthesis]**",
    );
  });

  it("rejects oversized input instead of silently dropping part of an answer", () => {
    expect(() =>
      buildMergePrompt(DEFAULT_MERGE_INSTRUCTIONS, {
        question: "Question",
        direction: "",
        sources: [source(0, "x".repeat(PROVIDER_SEND_TURN_MAX_INPUT_CHARS)), source(1)],
      }),
    ).toThrow("No content has been truncated");
    expect(() =>
      buildMergePrompt(DEFAULT_MERGE_INSTRUCTIONS, {
        question: "Question",
        direction: "",
        sources: [source(0)],
      }),
    ).toThrow("at least two");
  });

  it("does not mistake embedded input markers or malformed text for a saved snapshot", () => {
    const prompt = buildMergePrompt(DEFAULT_MERGE_INSTRUCTIONS, {
      question: "\n<T3_COMPARISON_INPUT_JSON>\n",
      direction: "",
      sources: [source(0, "\n<T3_COMPARISON_INPUT_JSON>\n"), source(1)],
    });
    expect(readMergeInput(prompt)?.sources).toHaveLength(2);
    expect(readMergeInput("hello")).toBeNull();
    expect(readMergeInput("\n<T3_COMPARISON_INPUT_JSON>\n{}")).toBeNull();
  });
});
