# Instagram discovery actor research (plan only)

All facts below were verified live against the Apify API through the project's connector: the store listing for Instagram actors, and the actual input schema of `apify/instagram-scraper`. Nothing was scraped beyond that.

## 1. Verified actor options

### apify/instagram-scraper — id `shu8hvrXbJbY3Eb9W`
Input schema (read from its live build) exposes:
- `search` (free-text query) + `searchType` with enum **`hashtag` | `profile` | `place` | `user`**
- `searchLimit` — integer, min 1, **max 250**
- `resultsType` — `posts` | `details` | `comments` | `reels` | `mentions`
- `directUrls[]`, `resultsLimit` per URL, `onlyPostsNewerThan` date filter
- Schema note: "URLs always take priority over search queries — and they cannot be combined"; search queries may be comma-separated (multiple terms per run).
- No follower filter of any kind in the schema.
- Pricing (from the store record): pay-per-event, `result` $0.0027 each at FREE tier, down to $0.0005 at DIAMOND.
- Production signals: 15.9M runs in the last 30 days, 99.4% success, rating 4.76.

This is the only actor found that does **profile / place / hashtag search** in one place.

### apify/instagram-hashtag-scraper — id `reGe1ST3OBgYZSsZJ`
Hashtag → posts (with locations, captions, other hashtags). $0.0026/result. 476k runs/30d but a lower 3.39 rating and a higher failure share. Returns posts, from which owner usernames are harvested.

### apify/instagram-api-scraper — id `RB9HEZitC8hIUXAha`
Supports "search keywords and URL lists" for posts, profiles, places, hashtags. Notably prices a separate `search-result` event at $0.006 (more than double a normal result). Rating 3.0, ~668k runs/30d — the weakest quality signal of the Apify-owned set.

### apify/instagram-profile-scraper — id `dSCLg0C3YEZ83HzYX` (our current actor)
Enrichment only, `usernames` array. $0.0026/profile, plus an **`about-account` add-on at $0.007/profile that returns date joined and the account's country** — directly relevant to our missing geographic data. Store description also advertises `location` and `related profiles` in output.

### apidojo/instagram-scraper — id `culc72xb7MP3EbaeX`
Third-party, "location, audio, tag, and profile" URLs, $0.0005/post, 4.86 rating, 472k runs/30d. Cheapest per post but URL-driven, not a search API.

### scraping_solutions/instagram-scraper-followers-following-no-cookies — id `jWD4G57HhqYY0mFhd`
Followers/following lists for a username, $0.00085/result. Not keyword discovery, but a strong **lookalike expansion** source: take a known Lisbon food account and harvest who it follows.

## 2. Comparison

| Actor | Discovery method | Location | Keyword | Hashtag | Profile data | Scale | Complexity | Main limitation |
|---|---|---|---|---|---|---|---|---|
| apify/instagram-scraper | search: profile/place/hashtag/user + URLs | Yes (place search) | Yes (profile/user) | Yes | Yes (`resultsType: details`) | 250 search results/run | Low | No follower filter; search results differ from logged-in feed |
| apify/instagram-hashtag-scraper | hashtag → posts | Post-level only | No | Yes | No (post owners only) | High | Medium (must extract owners) | Returns posts, not creators; lower reliability rating |
| apify/instagram-api-scraper | keyword + URL lists | Yes | Yes | Yes | Yes | High | Low | Lowest rating (3.0); search events cost ~2× |
| apidojo/instagram-scraper | URL-driven (location/tag/profile) | Via location URL | No | Via tag URL | Partial | Very high, cheapest | Medium (need URLs first) | Not a search entry point |
| scraping_solutions followers/following | account graph | No | No | No | Minimal (id, username, name) | High | Low | Only expands from a seed account |
| **apify/instagram-profile-scraper (current)** | none | `about-account` add-on returns country | No | No | Full | Batched usernames | — | Enrichment only |

## 3. How each feeds our existing pipeline

Our enrichment stays exactly as-is: `{ usernames: [...] }` → `mapInstagram` → `CreatorProfile`. Each discovery option produces a username list:

- instagram-scraper, `searchType: place` → place results → posts at that place → post owner usernames.
- instagram-scraper, `searchType: profile` → matching accounts directly (cleanest handle source).
- hashtag scrapers → posts → `ownerUsername` per post → dedupe.
- followers/following → usernames directly.

Target flow is unchanged from the brief:
```text
discovery actor -> candidate usernames -> dedupe against creators table
  -> existing profile scraper (batched) -> CreatorProfile
  -> classification (bio/captions/links) -> follower + relevance filter -> ranking
```

## 4. The Lisbon food example

A. **Yes**, candidates are findable — but through post owners, not a direct "creators in Lisbon" query.

B. Mechanism: run `apify/instagram-scraper` twice —
   - `searchType: place`, `search: "Lisboa"` → place pages → `resultsType: posts` on those places;
   - `searchType: hashtag` on `#lisboafood`, `#comidalisboa`, `#restaurantelisboa` → posts.
   Collect `ownerUsername` from both, union, dedupe.

C. Realistically: `searchLimit` caps at 250 per run; each place/hashtag can yield tens to hundreds of posts. A few hundred raw candidates per query set is realistic; after deduping and dropping brands/venues, expect a much smaller creator pool.

D. Enrichment: batched `usernames` arrays through the existing profile scraper, skipping anything already fresh in `social_profile_cache`.

E. **Follower filtering happens after enrichment, in our code** — no actor exposes a follower filter. This is the single biggest cost driver: we pay to enrich profiles we then discard.

F. Relevance (content / business / geography) is computed in our code from enriched data: bio text, external link types, captions, plus the `about-account` country add-on if we choose to pay for it.

## 5. Cost and scale

Prices below are the live FREE-tier pay-per-event rates read from the Apify store record; effective cost depends on the account's tier and Apify's 20% margin, and total spend must still be confirmed in the Apify console.

Per-candidate enrichment: $0.0026 (+$0.007 if the country add-on is enabled).

| Candidates | Discovery runs | Enrichment runs | Rough enrichment cost |
|---|---|---|---|
| 20 | 1–2 | 1 batched run | ~$0.05 |
| 50 | 2–3 | 1–2 batched runs (chunks of ~25) | ~$0.13 |
| 100 | 3–5 | 2–4 batched runs | ~$0.26 |

Discovery cost adds $0.0027 per returned search/post result. Batching: the profile scraper accepts a `usernames` array, so N candidates need ~N/chunk runs, not N runs. Caching: every enriched profile is already cached for 24h and reusable across users; only the query→candidate list is uncached today.

## 6. Cache strategy (recommendation only)

Two layers:
1. **Query cache** — key = normalised discovery query (platform + place + hashtags + follower band), value = ordered candidate username list, with its own TTL (discovery results age slower than metrics; days rather than hours). This is a new concern and does not fit `social_profile_cache`, which is keyed on `(platform, username)`.
2. **Profile cache** — the existing `social_profile_cache`, unchanged. Every candidate is enriched at most once per TTL regardless of how many brands searched for it, which is exactly the "don't rescrape for different users" requirement.

Candidate lists should store usernames only, so profile freshness is always resolved through layer 2.

## 7. Recommendation

**A. Best option:** `apify/instagram-scraper` (`shu8hvrXbJbY3Eb9W`). It is the only verified actor with `searchType: profile | place | hashtag` in one input, it is Apify-owned, and its run stats are the strongest of the set (15.9M runs/30d, 99.4% success, 4.76 rating).

**B. Second-best:** `apify/instagram-hashtag-scraper` (`reGe1ST3OBgYZSsZJ`) as a supplementary candidate source, plus the followers/following actor for lookalike expansion from a known good seed account.

**C. Why:** search-type coverage, first-party maintenance, and reliability matter more than per-result price at our volumes. `instagram-api-scraper` is cheaper to reach but rates 3.0 and charges more per search result; `apidojo` is cheapest but needs URLs we would have to discover elsewhere first.

**D. Current profile scraper keeps its job:** turning a known handle into a full `CreatorProfile` with metrics and scores. Not replaced.

**E. Future pipeline:** discovery run → username extraction and dedupe → cache check → batched enrichment → classification → filter → rank → cached candidate list.

**F. Cost risks:** paying to enrich candidates that fail the follower filter (no upstream filter exists); the $0.007 country add-on multiplying per candidate; broad hashtag searches returning mostly venues and brands rather than creators.

**G. Scraping risks:** the schema itself warns that search results "may differ from what you see in your personal feed"; place and hashtag results skew toward businesses; discovered posts are not proof the owner is a creator; Instagram-side changes can break search silently; and we already observed the profile scraper returning zero posts on a live run, which would poison metrics at scale.

**H. Before implementation:** decide the candidate-quality rule (what makes an account a creator, not a venue); build batched enrichment; add the query-level cache; resolve the empty-`latestPosts` problem; and confirm real spend for one small end-to-end discovery run in the Apify console before opening it to users.
