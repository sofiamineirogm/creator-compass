import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseAnalyzeInput } from "./analyze-input";
import type { AnalyzeInput } from "./analyze-input";
import {
  isSaved,
  listHistory,
  listSavedCreators,
  logSearch,
  toggleSaved,
} from "./account.server";

export const getSavedCreators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listSavedCreators(context.supabase, context.userId));

export const getSearchHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listHistory(context.supabase, context.userId));

export const toggleSavedCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AnalyzeInput) => parseAnalyzeInput(input))
  .handler(async ({ data, context }) =>
    toggleSaved(context.supabase, context.userId, data.platform, data.username),
  );

export const getSavedState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AnalyzeInput) => parseAnalyzeInput(input))
  .handler(async ({ data, context }) => ({
    saved: await isSaved(context.supabase, context.userId, data.platform, data.username),
  }));

export const recordUserSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AnalyzeInput) => parseAnalyzeInput(input))
  .handler(async ({ data, context }) => {
    await logSearch(context.supabase, context.userId, data.platform, data.username);
    return { ok: true };
  });
