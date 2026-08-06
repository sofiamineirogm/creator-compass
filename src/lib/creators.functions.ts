import { createServerFn } from "@tanstack/react-start";
import { analyzeCreatorHandler, type AnalyzeInput } from "./analyze.server";
import { parseAnalyzeInput } from "./analyze-input";

export const analyzeCreator = createServerFn({ method: "POST" })
  .inputValidator((input: AnalyzeInput) => parseAnalyzeInput(input))
  .handler(async ({ data }) => analyzeCreatorHandler(data));
