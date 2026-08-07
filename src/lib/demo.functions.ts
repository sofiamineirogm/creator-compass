import { createServerFn } from "@tanstack/react-start";

/**
 * Demo-only server functions. Every handler re-checks DEMO_MODE server-side,
 * so these are inert (and expose nothing) when the flag is off.
 */

export const provisionDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { ensureDemoAccounts } = await import("./demo.server");
  return ensureDemoAccounts();
});

export const loginAsDemoUser = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string }) => {
    if (!input?.key) throw new Error("Missing demo account.");
    return input;
  })
  .handler(async ({ data }) => {
    const { demoSignIn } = await import("./demo.server");
    return demoSignIn(data.key);
  });

export const loadDemoWorld = createServerFn({ method: "POST" }).handler(async () => {
  const { seedDemoWorld } = await import("./demo.server");
  return seedDemoWorld();
});

export const getDemoStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { demoEnabled } = await import("./demo.server");
  return { enabled: demoEnabled() };
});
