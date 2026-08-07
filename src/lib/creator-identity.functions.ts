import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { Platform } from "./creator-types";
import {
  connectSocialAccount,
  disconnectSocialAccount,
  getCreatorIdentity,
  saveCreatorIdentityProfile,
  syncSocialAccount,
  type CreatorProfileInput,
} from "./creator-identity.server";

export const getMyCreatorIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getCreatorIdentity(context.supabase as never, context.userId));

export const saveMyCreatorProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreatorProfileInput) => {
    if (!input?.displayName?.trim()) throw new Error("Display name is required.");
    return input;
  })
  .handler(async ({ data, context }) =>
    saveCreatorIdentityProfile(context.supabase as never, context.userId, data),
  );

export const connectMySocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { platform: Platform; handle: string }) => input)
  .handler(async ({ data, context }) =>
    connectSocialAccount(context.supabase as never, context.userId, data),
  );

export const disconnectMySocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) =>
    disconnectSocialAccount(context.supabase as never, context.userId, data.id),
  );

export const syncMySocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) =>
    syncSocialAccount(context.supabase as never, context.userId, data.id),
  );
