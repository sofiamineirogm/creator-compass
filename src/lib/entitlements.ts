/**
 * Central permission / entitlement system.
 * Browser-safe. Never hard-code plan checks in UI code — call these helpers.
 * Stripe can later drive `plan` without any UI rewrite.
 */

export type Plan = "free" | "creator" | "creator_pro" | "brand" | "agency" | "enterprise";
export type Role = "guest" | "creator" | "brand" | "agency" | "admin";

export interface Viewer {
  userId: string | null;
  email: string | null;
  role: Role;
  plan: Plan;
  /** True when the viewer is a demo persona rather than a real subscription. */
  isDemo: boolean;
}

export const ANONYMOUS_VIEWER: Viewer = {
  userId: null,
  email: null,
  role: "guest",
  plan: "free",
  isDemo: false,
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  creator: "Creator",
  creator_pro: "Creator Pro",
  brand: "Brand",
  agency: "Agency Pro",
  enterprise: "Enterprise",
};

export const ROLE_LABELS: Record<Role, string> = {
  guest: "Guest",
  creator: "Creator",
  brand: "Brand",
  agency: "Agency",
  admin: "Admin",
};

const CREATOR_PAID: Plan[] = ["creator_pro", "agency", "enterprise"];
const BRAND_PLANS: Plan[] = ["brand", "agency", "enterprise"];

const has = (plan: Plan, list: Plan[]) => list.includes(plan);

export function isCreatorSide(v: Viewer): boolean {
  return v.role === "creator" || v.role === "guest" || v.role === "admin";
}

export function isBrandSide(v: Viewer): boolean {
  return v.role === "brand" || v.role === "agency" || v.role === "admin";
}

export function isSignedIn(v: Viewer): boolean {
  return Boolean(v.userId);
}

export function canApplyToCampaign(v: Viewer): boolean {
  if (!isSignedIn(v)) return false;
  if (v.role === "admin") return true;
  return v.role === "creator" && has(v.plan, CREATOR_PAID);
}

export function canSaveCampaign(v: Viewer): boolean {
  return isSignedIn(v);
}

export function canCreateCampaign(v: Viewer): boolean {
  if (!isSignedIn(v)) return false;
  if (v.role === "admin") return true;
  return isBrandSide(v) && has(v.plan, BRAND_PLANS);
}

export function canManageApplicants(v: Viewer): boolean {
  return canCreateCampaign(v);
}

export function canViewPremiumAnalytics(v: Viewer): boolean {
  if (!isSignedIn(v)) return false;
  return v.role === "admin" || has(v.plan, [...CREATOR_PAID, ...BRAND_PLANS]);
}

export function canBoostProfile(v: Viewer): boolean {
  return v.role === "admin" || (v.role === "creator" && has(v.plan, CREATOR_PAID));
}

export function canManageCreators(v: Viewer): boolean {
  return v.role === "admin" || (v.role === "agency" && has(v.plan, ["agency", "enterprise"]));
}

export function canMessage(v: Viewer): boolean {
  return isSignedIn(v);
}

export function canReceiveInvitations(v: Viewer): boolean {
  return v.role === "creator" && has(v.plan, CREATOR_PAID);
}

/** Copy shown when an action is locked behind a plan. */
export function upgradeMessage(action: "apply" | "create_campaign" | "boost" | "premium"): string {
  switch (action) {
    case "apply":
      return "Upgrade to Creator Pro to apply to campaigns.";
    case "create_campaign":
      return "Upgrade to a Brand plan to publish campaigns.";
    case "boost":
      return "Upgrade to Creator Pro to boost your profile.";
    case "premium":
      return "Upgrade to unlock the premium report.";
  }
}
