# Apify / Instagram integration — technical audit (no code changes)

## A. Current Apify actor

Defined in `src/lib/apify.server.ts` (the only file that talks to Apify):

- Instagram actor: `apify~instagram-profile-scraper`
- TikTok actor: `clockworks~tiktok-scraper`
- Called from `runActor(platform, username)`, invoked by `fetchCreatorFromApify()`, which is called only by `analyzeCreatorHandler()` in `src/lib/analyze.server.ts`.
- Transport: Lovable connector gateway, `POST https://connector-gateway.lovable.dev/apify/acts/{actor}/run-sync-get-dataset-items?timeout=110`, 120s client abort.
- Input sent — Instagram: `{ usernames: [username] }` only. TikTok: `{ profiles: [username], resultsPerPage: 12, shouldDownload*: false }`.
- Output: dataset item array; `mapInstagram(items[0])` / `mapTikTok(items)` normalise it into `CreatorProfile`.
- Purpose: **profile lookup only**. There is no keyword, hashtag, location or search input anywhere in the codebase.

## B. Current profile-analysis capabilities

`analyzeCreatorHandler` (`src/lib/analyze.server.ts`) runs: read cache → TTL check → refresh cooldown → dedup lock → Apify → `generateReport()` (`src/lib/scoring/engine.ts`) → `writeCache` + `saveCreator` + `saveReport` + `recordSearch`.

Fields extracted for Instagram in `mapInstagram`: `username`, `fullName`, `biography`, `profilePicUrlHD`/`profilePicUrl`, `url`, `verified`, `private`, `followersCount`, `followsCount`, `postsCount`, `externalUrls`, `businessCategoryName` (via `cleanCategory`), and up to 12 `latestPosts` (`id`/`shortCode`, `caption`, `url`, `displayUrl`, `likesCount`, `commentsCount`, `videoViewCount`/`videoPlayCount`, `timestamp`). Averages and engagement rate are computed locally.

Fields present in the actor response but currently ignored: everything not listed above. `country` is hard-coded `null`; the raw payload is **not** persisted — `saveCreator` never writes the `creators.raw` column, and the cache stores the already-normalised `CreatorProfile`, not the raw dataset item. So any field we did not map is lost after the run.

## C. Current discovery capabilities

| Query type | Status | Why |
|---|---|---|
| username | SUPPORTED | The only supported input (`usernames: [username]`). |
| keyword | NOT SUPPORTED | Profile-scraper actor takes usernames only; no search code exists. |
| hashtag | NOT SUPPORTED | Same; no hashtag actor configured. |
| location | NOT SUPPORTED | No location input; `country` is set to `null`. |
| place | NOT SUPPORTED | No place-id concept anywhere. |
| bio keywords | NOT SUPPORTED as a query | Bios are stored per analysed profile, but there is no index or search over them. |
| content / category | NOT SUPPORTED as a query | `category` is stored only when Instagram returns `businessCategoryName`. |
| follower range | NOT SUPPORTED as a discovery query | Filtering is possible only over creators already analysed and stored in `creators`. |

## D. Available data fields for @ato.gastro

A. Currently retrieved and stored: followers, following, posts count, avg likes, avg comments, avg views, engagement rate, bio, display name, avatar, profile URL, verified/private flags, external links, business category when present, and up to 12 recent posts with caption, URL, thumbnail, likes, comments, views, timestamp.

B. Available from the actor but not mapped/stored: additional profile metadata and per-post fields the actor emits (e.g. post type, hashtags/mentions arrays, tagged users, location tags on posts, related profiles, business contact fields). Exact availability must be confirmed against one live sample of the actor's raw output — it is not knowable from our code because we discard the raw payload.

C. Unavailable through this integration: audience demographics (age, gender, country split), audience quality/fake-follower analysis, story/reel-level analytics, historical follower growth, and any private insights. Hashtags are only implicitly present inside caption text; they are not extracted.

## E. Missing data fields

Geographic country, reliable content category, audience demographics, growth history, hashtag arrays, per-post location tags — none are captured today.

## F. Location / content / business signals

Signals we already store and could later derive from without new Apify calls: `biography`, `full_name`, `external_links`, `business category` when present, and the captions of up to 12 recent posts (`creator_posts.caption`) — captions contain hashtags and often place names. Signals that would need mapping work but appear to come from the same actor run: per-post location tags and hashtag/mention arrays. No classification exists today, and `country` is deliberately left null rather than guessed.

## G. Recommended future discovery pipeline

The current setup cannot do SEARCH → CANDIDATES. It can do ENRICH → FILTER → RANK over a candidate list. A discovery product needs an additional candidate source, e.g. an Apify hashtag/location/search actor (or an external creator-database API) feeding handles into the existing `analyzeCreatorHandler`. The enrichment, scoring and caching halves are reusable as-is.

## H. Apify operations / scale

- Today: one actor run per profile per fetch. The Instagram actor accepts a `usernames` **array**, so one run could enrich many profiles, but our code always sends exactly one.
- A "search → 50 candidates → enrich 50 → rank 20" flow would need at least 1 search run plus enrichment runs: 50 runs as coded today, or potentially 1 batched run if we passed all handles at once.
- Likely expensive: the candidate-search step and any post-level scraping; enrichment cost scales with profile count.
- Cacheable: every enriched profile (already is), and search/candidate lists (not today).
- Cost in currency cannot be determined from the code — no pricing information exists in the repo.

## I. Cache implications

`src/lib/cache.server.ts` + `social_profile_cache` are keyed strictly on `(platform, username)` with a 24h TTL, 15m refresh cooldown, and a lock for dedup. It caches one profile per row and cannot represent a query like "Instagram + Lisbon + Food + 5K–50K". Discovery would need a separate query-keyed cache; the per-profile cache would then be reused across users for enrichment, which is exactly what it is good at.

## J. What we would need to build next

1. Confirm one raw Instagram actor payload to inventory unmapped fields.
2. Choose a candidate-discovery source (Apify search/hashtag/location actor vs. external API).
3. A query-keyed discovery cache separate from the profile cache.
4. Batched enrichment (multiple usernames per run).
5. A derivation layer for category/location from bio, captions and links — with explicit confidence, never silent invention.

## K. Biggest technical risks

- Discarding the raw payload means every new field requires a re-scrape.
- Discovery actors are rate-limited and slow; a synchronous `run-sync-get-dataset-items` call with a 110s budget will not survive a 50-profile flow.
- Derived category/location is inherently probabilistic and conflicts with the current "never invent data" rule unless surfaced as inferred.
- Cost scales linearly with candidate count and is currently unmeasured.
- Instagram scraper fragility: private accounts, missing `latestPosts`, and provider schema changes already have single-point handling in `mapInstagram`.
