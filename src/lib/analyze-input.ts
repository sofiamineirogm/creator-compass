import { normalizeUsername, type Platform } from "./creator-types";

export interface AnalyzeInput {
  platform: Platform;
  username: string;
  refresh?: boolean;
}

/** Client-safe validator shared by the UI and the server function. */
export function parseAnalyzeInput(input: AnalyzeInput): AnalyzeInput {
  const username = normalizeUsername(String(input?.username ?? ""));
  if (!username) {
    throw new Error("Enter a valid username — letters, numbers, dots and underscores only.");
  }
  const platform = input?.platform === "tiktok" ? "tiktok" : "instagram";
  return { platform, username, refresh: Boolean(input?.refresh) };
}
