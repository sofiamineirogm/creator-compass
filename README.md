# Creator Compass

# CreatorIQ - Production Ready SaaS

You are a Senior Full Stack Engineer, Product Designer and Solution Architect.

Build a production-ready, mobile-first SaaS application called **CreatorIQ**.

This is NOT a prototype.

This should be designed as a scalable production application.

## Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Supabase
* PostgreSQL
* Supabase Auth
* Stripe
* OpenAI API
* Apify API

The project must have clean architecture, reusable components and production-ready code.

---

# Core Functionality

The platform analyses Instagram and TikTok creators using real data fetched from **Apify**.

Do NOT use mock data.

Every search must retrieve live data through the backend.

---

# Homepage

Display:

* Hero section
* Search input
* Platform selector:

  * Instagram
  * TikTok
  * Both
* Analyze button

Users can search any public profile by entering:

@username

Example:

@mrbeast

---

# Search Flow

When the user clicks "Analyze":

1. Validate username.
2. Send request to backend.
3. Call Apify API.
4. Retrieve creator data.
5. Save profile in Supabase.
6. Cache results.
7. Generate analytics.
8. Display report.

If the creator already exists in the database and the cache has not expired, load cached data instead of calling Apify again.

Include a "Refresh Data" button that forces a new Apify request.

---

# Analytics Engine

Create an internal scoring engine.

Scores:

* Overall Score
* Brand Management
* Engagement
* Accessibility
* Growth

The scoring engine must be separated from the UI.

The formulas should be configurable.

---

# Free Report

Display:

Overall Score

Brand Score

Engagement Score

Accessibility Score

Growth Score

Short summary for each section.

Display a CTA:

Unlock Premium Report

---

# Premium Report

Include:

Detailed analysis

Strengths

Weaknesses

Recommendations

Priority improvements

Estimated impact

Charts

Historical trend placeholder

---

# Benchmarking

Compare creators by:

* Country
* Category
* Followers
* Engagement
* Platform

Display:

Average

Top 10%

Top 25%

Above Average

Below Average

Generate percentile rankings.

---

# Creator Profile

Public creator profile includes:

Photo

Bio

Followers

Following

Posts

Average Likes

Average Comments

Engagement Rate

Categories

Location (if available)

Performance Scores

Portfolio section

Contact links

---

# Dashboard

Authenticated users have:

Overview

Saved creators

Recent reports

Performance history

Tasks

Recommendations

Downloads

---

# Database

Create tables for:

Users

Creators

Reports

Analytics

Benchmarks

Subscriptions

Saved Profiles

Search History

Campaigns (future)

Applications (future)

Messages (future)

Reviews (future)

Everything must be properly related.

---

# API Layer

Create a dedicated Apify service.

The UI must never call Apify directly.

Architecture example:

Frontend

↓

Next.js API Route

↓

Apify Service

↓

Supabase

↓

UI

---

# Error Handling

Handle:

Invalid usernames

Private accounts

Deleted accounts

API errors

Rate limits

Timeouts

Network failures

Display user-friendly messages.

---

# Performance

Use:

Lazy loading

Pagination

Caching

Optimistic UI

Loading skeletons

Retry logic

---

# Authentication

Use Supabase Auth.

Roles:

Guest

Creator

Brand

Agency

Admin

Permissions should be role-based.

---

# Payments

Integrate Stripe.

Plans:

Free

Creator

Creator Pro

Agency

Enterprise

Premium reports require an active subscription.

---

# UI

Style:

Apple-inspired

Minimal

Premium

Modern

Lots of whitespace

Rounded cards

Smooth animations

Excellent mobile UX

Dark mode ready

Responsive on all screen sizes.

The application should be visually indistinguishable from a modern production SaaS.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6e50c6a1-d509-4208-83ba-b7adf1a5e2d9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
