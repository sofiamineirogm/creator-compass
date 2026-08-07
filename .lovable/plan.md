# Apify Instagram field audit — @ato.gastro (plan only)

One real run was made against the current actor (`apify~instagram-profile-scraper`, input `{ usernames: ["ato.gastro"] }`) through the connector gateway. Everything below comes from that single response.

## A. Raw fields found

Exact top-level keys returned:

`inputUrl`, `id`, `username`, `url`, `fullName`, `biography`, `externalUrls[]`, `externalUrl`, `externalUrlShimmed`, `followersCount`, `followsCount`, `isBusinessAccount`, `businessCategoryName`, `private`, `verified`, `profilePicUrl`, `profilePicUrlHD`, `latestIgtvVideos[]`, `latestPosts[]`, `fbid`.

Each `externalUrls[]` entry has: `title`, `url`, `link_type`, `lynx_url`, `image_url`, `is_pinned`, `media_type`, `media_accent_color_hex`, `creation_source`.

Answering the specific checklist:

| Asked | Present? | Evidence |
|---|---|---|
| location | NO structured field | Only free text inside `biography` ("📍Av. Dom Vasco da Gama 43C, Lisboa") |
| country | NO | No field at all |
| city | NO structured field | Free text in bio only |
| post location | NOT OBSERVABLE | `latestPosts` came back **empty** in this run |
| hashtags | NO | No hashtag array; would only appear inside post captions |
| mentions | NO | Same |
| post type | NOT OBSERVABLE | `latestPosts` empty |
| media type | Partially | `externalUrls[].media_type` (always `"none"` here) — link media, not post media |
| business metadata | PARTIAL | `isBusinessAccount: true`, `businessCategoryName: "None"`, `fbid`, `link_type: "facebook_page"` |
| related profiles | NO | Not returned |
| contact information | NO structured field | Phone/WhatsApp only as bio text ("☎️215842337, WhatsApp 969873476") |

**Critical finding:** this run returned `latestPosts: []` and `latestIgtvVideos: []`. With the current mapper, that yields avg likes/comments/views of 0 and an engagement rate computed from nothing. The stored 651/27/4646 figures came from an earlier run that did include posts, so post return is **not guaranteed** with the current input.

## B. Fields worth persisting

From the confirmed response only:

- `id` (Instagram numeric user id) — stable identity key that survives handle renames; useful for similarity and dedup.
- `isBusinessAccount` (boolean) — direct business classification signal.
- `fbid` — secondary stable identifier / business linkage signal.
- `externalUrls[]` with `link_type` and full url (we currently drop `link_type` and keep only title+url) — a `maps.app.goo.gl` link is a strong geographic signal, a `linktr.ee` link is a creator/commerce signal, `facebook_page` confirms business.
- `biography` — already stored; explicitly the only carrier of address, city and phone. Keep as the raw source for later derivation.
- The raw dataset item itself, into the existing `creators.raw` column (already exists, currently never written). This removes the need to re-scrape whenever we want a field we did not map.

Signal mapping to the five goals:
1. Geographic relevance — bio text, Google Maps external link.
2. Content classification — bio text, post captions when present.
3. Business classification — `isBusinessAccount`, `businessCategoryName`, `fbid`, `facebook_page` link type.
4. Creator similarity — `id`, follower counts, link types, derived category.
5. Discovery ranking — engagement metrics already stored, plus the above as filters.

## C. Fields not worth persisting

`inputUrl` (echo of our own input), `externalUrlShimmed` and `lynx_url` (redirect wrappers that expire), `image_url` / `media_accent_color_hex` / `creation_source` / `is_pinned` on links (cosmetic), `externalUrl` (duplicate of `externalUrls[0].url`), `profilePicUrl` low-res when the HD variant exists.

## D. Proposed normalized structure

Additions only — nothing existing changes:

```text
CreatorProfile {
  ...existing fields
  externalId: string | null        // Instagram numeric "id"
  isBusinessAccount: boolean
  facebookId: string | null        // "fbid"
  externalLinks: {
    title, url,
    linkType: string | null        // NEW: "external" | "facebook_page" | ...
  }[]
}
```

Persistence uses existing columns where possible: `creators.raw` for the full payload, `creators.external_links` for the enriched link objects. `externalId`, `isBusinessAccount` and `facebookId` have no column today — they could live inside `raw` first, and only get promoted to columns when discovery actually queries them. No new tables.

Nothing derived (city, country, category) is added — those stay null until an explicit, clearly-labelled inference step is built.

## E. Batch enrichment changes required

The actor input is `usernames: []` — an array — so **one run can process multiple profiles**; the dataset returns one item per username. Changes required:

1. `runActor()` in `src/lib/apify.server.ts` takes `string[]` instead of `string` (its current signature is the only blocker).
2. `fetchCreatorFromApify()` returns a map keyed by username instead of a single profile; `mapInstagram` is already per-item and needs no change.
3. `analyze.server.ts` keeps its single-profile path; a new batch path acquires locks per username, writes cache per username, and skips handles already fresh in cache before the run.
4. The synchronous `run-sync-get-dataset-items?timeout=110` call will not hold for large batches — batching needs the async run + poll pattern, or small chunks (≈5–10 usernames).
5. Per-username failure handling: one bad handle currently throws for the whole call; batch mode must map errors per item.

## F. Risks

- **Posts are not guaranteed.** This live run returned zero posts, which silently produces zero engagement metrics. This is the highest-value thing to investigate before any discovery work.
- `businessCategoryName` returns the literal `"None"` even for an obvious restaurant — it is not a usable category source.
- All geographic and contact data is unstructured bio text; any extraction is inference and must be labelled as such.
- CDN avatar URLs and `lynx_url` values expire; do not treat them as stable.
- Batching increases blast radius: one run failure affects N profiles, and sync-run timeouts scale with batch size.
- Persisting `raw` grows the table and may contain data we should not retain indefinitely.
