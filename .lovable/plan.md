# Creator Profile data-integrity pass — status and remaining work

Most of this request is already implemented in the current code. Verified by reading the code:

- Profile identity is derived from the connected social account and its real analysis (`withConnectedAccountIdentity` in `src/lib/creator-identity.server.ts`), so name, avatar and bio come from the real `@ato.gastro` Instagram analysis; stored profile fields are only used when their handle matches the connected account.
- Category and location render "Not available" when the real data has no value (no fabricated Beauty / Los Angeles).
- Benchmark uses `MINIMUM_BENCHMARK_PEERS = 10` and hides peer statistics below that threshold, showing only the "Not enough comparable creators yet · X of 10 analysed peers found" state.
- CreatorIQ scores remain visible and are labelled as CreatorIQ Score, separate from percentiles.
- Similar creators keeps its empty state with no fabricated entries.

## Remaining item

One leftover demo string: the onboarding display-name input in `src/routes/_authenticated/my-creator.tsx` (line 202) still uses `placeholder="Maya Okafor"`. Replace it with a neutral placeholder such as "Your display name".

## Verification after the change

1. Sign in as `demo.pro@creatoriq.test`, open My Creator.
2. Confirm the header shows the real `@ato.gastro` name and avatar, with "Not available" for category and location.
3. Confirm the real metrics still load (followers ~8,392, following ~57, posts ~49, avg likes ~651, avg comments ~27, avg views ~4,646, engagement ~8.08%) and CreatorIQ scores are present.
4. Confirm the benchmark block shows no Peer average / Top 25% / Top 10% with zero peers, and similar creators stays empty.
5. Search the codebase for any remaining "Maya Okafor" / "Beauty" / "Los Angeles" strings tied to this profile.
6. Run the build.

No changes to Apify, cache, auth, RLS, scoring, other demo accounts, marketplace, or the `social_accounts` schema.
