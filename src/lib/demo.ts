/** Demo / test-account configuration. Browser-safe. */
import type { Plan, Role } from "./entitlements";

export interface DemoPersona {
  key: string;
  label: string;
  description: string;
  role: Role;
  plan: Plan;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: "free_creator",
    label: "Free Creator",
    description: "Browse campaigns, no applications",
    role: "creator",
    plan: "free",
  },
  {
    key: "pro_creator",
    label: "Pro Creator",
    description: "Apply, message and boost profile",
    role: "creator",
    plan: "creator_pro",
  },
  {
    key: "brand",
    label: "Brand",
    description: "Publish campaigns and review applicants",
    role: "brand",
    plan: "brand",
  },
  {
    key: "agency",
    label: "Agency",
    description: "Everything a brand has, plus roster tools",
    role: "agency",
    plan: "agency",
  },
];

export function isDemoMode(): boolean {
  return String(import.meta.env["VITE_DEMO_MODE"] ?? "").toLowerCase() === "true";
}

export function personaFor(role: Role, plan: Plan): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.role === role && p.plan === plan);
}
