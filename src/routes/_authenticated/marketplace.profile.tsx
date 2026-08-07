import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { getMyProfiles, saveBrandProfile, saveCreatorProfile } from "@/lib/marketplace.functions";
import { CATEGORIES } from "@/lib/marketplace-types";
import { useViewer } from "@/hooks/use-viewer";
import { canBoostProfile, isBrandSide, upgradeMessage } from "@/lib/entitlements";

export const Route = createFileRoute("/_authenticated/marketplace/profile")({
  head: () => ({
    meta: [
      { title: "My Marketplace Profile | CreatorIQ" },
      { name: "description", content: "Publish the profile brands see: niche, rates, links and past collaborations." },
      { property: "og:title", content: "My Marketplace Profile | CreatorIQ" },
      { property: "og:description", content: "Set up the profile brands see before they hire you." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { viewer } = useViewer();
  const queryClient = useQueryClient();
  const fetchProfiles = useServerFn(getMyProfiles);
  const saveCreator = useServerFn(saveCreatorProfile);
  const saveBrand = useServerFn(saveBrandProfile);

  const profiles = useQuery({
    queryKey: ["my-profiles"],
    queryFn: () => fetchProfiles({ data: undefined as never }),
  });

  const brandSide = isBrandSide(viewer);

  const [creator, setCreator] = useState({
    display_name: "",
    handle: "",
    headline: "",
    bio: "",
    location: "",
    categories: [] as string[],
    instagram_username: "",
    tiktok_username: "",
    starting_price: "",
    availability: "open",
    is_published: false,
    is_boosted: false,
  });

  const [brand, setBrand] = useState({
    company_name: "",
    industry: "",
    location: "",
    website: "",
    description: "",
  });

  useEffect(() => {
    const c = profiles.data?.creator;
    if (c) {
      setCreator({
        display_name: c.displayName ?? "",
        handle: c.handle ?? "",
        headline: c.headline ?? "",
        bio: c.bio ?? "",
        location: c.location ?? "",
        categories: c.categories ?? [],
        instagram_username: c.instagramUsername ?? "",
        tiktok_username: c.tiktokUsername ?? "",
        starting_price: String(c.startingPrice ?? ""),
        availability: c.availability ?? "open",
        is_published: c.isPublished,
        is_boosted: c.isBoosted,
      });
    }
    const b = profiles.data?.brand as Record<string, any> | null | undefined;
    if (b) {
      setBrand({
        company_name: b["company_name"] ?? "",
        industry: b["industry"] ?? "",
        location: b["location"] ?? "",
        website: b["website"] ?? "",
        description: b["description"] ?? "",
      });
    }
  }, [profiles.data]);

  const persistCreator = useMutation({
    mutationFn: () =>
      saveCreator({
        data: {
          display_name: creator.display_name,
          handle: creator.handle.trim().toLowerCase() || null,
          headline: creator.headline || null,
          bio: creator.bio || null,
          location: creator.location || null,
          categories: creator.categories,
          instagram_username: creator.instagram_username.replace("@", "").toLowerCase() || null,
          tiktok_username: creator.tiktok_username.replace("@", "").toLowerCase() || null,
          starting_price: Number(creator.starting_price) || 0,
          availability: creator.availability,
          is_published: creator.is_published,
          is_boosted: creator.is_boosted,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profiles"] });
      toast.success("Profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const persistBrand = useMutation({
    mutationFn: () => saveBrand({ data: { ...brand } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profiles"] });
      toast.success("Brand profile saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analytics = profiles.data?.creator?.analytics ?? null;

  return (
    <MarketplaceShell
      title={brandSide ? "Brand profile" : "Creator profile"}
      subtitle={brandSide ? "What creators see when they open your brief." : "What brands see before they hire you."}
    >
      {brandSide ? (
        <div className="surface max-w-2xl space-y-4 p-5">
          <Field label="Company name">
            <input value={brand.company_name} onChange={(e) => setBrand({ ...brand, company_name: e.target.value })} className="input-base" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry">
              <input value={brand.industry} onChange={(e) => setBrand({ ...brand, industry: e.target.value })} className="input-base" />
            </Field>
            <Field label="Location">
              <input value={brand.location} onChange={(e) => setBrand({ ...brand, location: e.target.value })} className="input-base" />
            </Field>
          </div>
          <Field label="Website">
            <input value={brand.website} onChange={(e) => setBrand({ ...brand, website: e.target.value })} className="input-base" placeholder="https://" />
          </Field>
          <Field label="About">
            <textarea rows={4} value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} className="input-base py-3" />
          </Field>
          <button
            onClick={() => persistBrand.mutate()}
            disabled={persistBrand.isPending}
            className="h-11 w-full rounded-full bg-ember text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {persistBrand.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="surface space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input value={creator.display_name} onChange={(e) => setCreator({ ...creator, display_name: e.target.value })} className="input-base" />
              </Field>
              <Field label="Handle">
                <input value={creator.handle} onChange={(e) => setCreator({ ...creator, handle: e.target.value })} className="input-base" placeholder="yourname" />
              </Field>
            </div>
            <Field label="Headline">
              <input value={creator.headline} onChange={(e) => setCreator({ ...creator, headline: e.target.value })} className="input-base" placeholder="Fitness creator making training feel doable" />
            </Field>
            <Field label="Bio">
              <textarea rows={4} value={creator.bio} onChange={(e) => setCreator({ ...creator, bio: e.target.value })} className="input-base py-3" />
            </Field>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Niches</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const active = creator.categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setCreator({
                          ...creator,
                          categories: active ? creator.categories.filter((x) => x !== c) : [...creator.categories, c],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        active ? "bg-foreground text-background" : "border border-border text-muted-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram username">
                <input value={creator.instagram_username} onChange={(e) => setCreator({ ...creator, instagram_username: e.target.value })} className="input-base" />
              </Field>
              <Field label="TikTok username">
                <input value={creator.tiktok_username} onChange={(e) => setCreator({ ...creator, tiktok_username: e.target.value })} className="input-base" />
              </Field>
              <Field label="Starting rate">
                <input type="number" value={creator.starting_price} onChange={(e) => setCreator({ ...creator, starting_price: e.target.value })} className="input-base" />
              </Field>
              <Field label="Availability">
                <select value={creator.availability} onChange={(e) => setCreator({ ...creator, availability: e.target.value })} className="input-base">
                  <option value="open">Open to work</option>
                  <option value="limited">Limited availability</option>
                  <option value="booked">Fully booked</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={creator.is_published}
                onChange={(e) => setCreator({ ...creator, is_published: e.target.checked })}
                className="h-4 w-4"
              />
              Publish my profile so brands can find me
            </label>

            <label className={`flex items-center gap-3 text-sm ${canBoostProfile(viewer) ? "" : "opacity-60"}`}>
              <input
                type="checkbox"
                disabled={!canBoostProfile(viewer)}
                checked={creator.is_boosted}
                onChange={(e) => setCreator({ ...creator, is_boosted: e.target.checked })}
                className="h-4 w-4"
              />
              Boost my profile in brand search
              {!canBoostProfile(viewer) ? (
                <span className="text-xs text-muted-foreground">— {upgradeMessage("boost")}</span>
              ) : null}
            </label>

            <button
              onClick={() => persistCreator.mutate()}
              disabled={persistCreator.isPending}
              className="h-11 w-full rounded-full bg-ember text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-auto sm:px-8"
            >
              {persistCreator.isPending ? "Saving…" : "Save profile"}
            </button>
          </div>

          <aside className="surface h-fit p-5">
            <h2 className="font-display text-base font-semibold">Live analytics</h2>
            {analytics ? (
              <dl className="mt-3 space-y-2 text-sm">
                <Row label="Followers" value={analytics.followers.toLocaleString()} />
                <Row label="Engagement" value={`${analytics.engagementRate.toFixed(2)}%`} />
                <Row label="Overall score" value={String(Math.round(analytics.overallScore))} />
                <Row label="Brand" value={String(Math.round(analytics.brandScore))} />
                <Row label="Growth" value={String(Math.round(analytics.growthScore))} />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Link a username above, then run a report from the home page to attach live analytics to your profile.
              </p>
            )}
          </aside>
        </div>
      )}
    </MarketplaceShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
