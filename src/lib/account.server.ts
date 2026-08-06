/**
 * Server-only helpers for the authenticated account area.
 * All queries run through the caller's RLS-scoped Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Platform } from "./creator-types";

type Db = SupabaseClient<any, any, any>;
type Row = Record<string, any>;

export interface SavedCreatorItem {
  id: string;
  creatorId: string;
  platform: Platform;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  followers: number;
  engagementRate: number;
  overallScore: number | null;
  savedAt: string;
}

export interface HistoryItem {
  id: string;
  platform: Platform;
  username: string;
  searchedAt: string;
}

async function creatorIdFor(db: Db, platform: Platform, username: string): Promise<string | null> {
  const { data } = await db
    .from("creators")
    .select("id")
    .eq("platform", platform)
    .eq("username", username)
    .maybeSingle();
  return data ? ((data as Row)["id"] as string) : null;
}

export async function listSavedCreators(db: Db, userId: string): Promise<SavedCreatorItem[]> {
  const { data, error } = await db
    .from("saved_creators")
    .select(
      "id, created_at, creator_id, creators(platform, username, full_name, avatar_url, followers, engagement_rate)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data as Row[]) ?? [];
  const ids = rows.map((r) => r["creator_id"] as string);
  const scores = new Map<string, number>();
  if (ids.length > 0) {
    const { data: reports } = await db
      .from("reports")
      .select("creator_id, overall_score, created_at")
      .in("creator_id", ids)
      .order("created_at", { ascending: false });
    for (const report of ((reports as Row[]) ?? [])) {
      const key = report["creator_id"] as string;
      if (!scores.has(key)) scores.set(key, Number(report["overall_score"]));
    }
  }

  return rows.map((row) => {
    const creator = (row["creators"] ?? {}) as Row;
    return {
      id: row["id"] as string,
      creatorId: row["creator_id"] as string,
      platform: creator["platform"] as Platform,
      username: creator["username"] as string,
      fullName: creator["full_name"] ?? null,
      avatarUrl: creator["avatar_url"] ?? null,
      followers: Number(creator["followers"] ?? 0),
      engagementRate: Number(creator["engagement_rate"] ?? 0),
      overallScore: scores.get(row["creator_id"] as string) ?? null,
      savedAt: row["created_at"] as string,
    };
  });
}

export async function listHistory(db: Db, userId: string, limit = 12): Promise<HistoryItem[]> {
  const { data, error } = await db
    .from("search_history")
    .select("id, platform, username, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((row) => ({
    id: row["id"] as string,
    platform: row["platform"] as Platform,
    username: row["username"] as string,
    searchedAt: row["created_at"] as string,
  }));
}

export async function toggleSaved(
  db: Db,
  userId: string,
  platform: Platform,
  username: string,
): Promise<{ saved: boolean }> {
  const creatorId = await creatorIdFor(db, platform, username);
  if (!creatorId) throw new Error("Analyse this creator before saving them.");

  const { data: existing } = await db
    .from("saved_creators")
    .select("id")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from("saved_creators").delete().eq("id", (existing as Row)["id"]);
    if (error) throw new Error(error.message);
    return { saved: false };
  }

  const { error } = await db
    .from("saved_creators")
    .insert({ user_id: userId, creator_id: creatorId });
  if (error) throw new Error(error.message);
  return { saved: true };
}

export async function isSaved(
  db: Db,
  userId: string,
  platform: Platform,
  username: string,
): Promise<boolean> {
  const creatorId = await creatorIdFor(db, platform, username);
  if (!creatorId) return false;
  const { data } = await db
    .from("saved_creators")
    .select("id")
    .eq("user_id", userId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  return Boolean(data);
}

export async function logSearch(
  db: Db,
  userId: string,
  platform: Platform,
  username: string,
): Promise<void> {
  const creatorId = await creatorIdFor(db, platform, username);
  await db
    .from("search_history")
    .insert({ user_id: userId, platform, username, creator_id: creatorId });
}
