# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Architecture

CreatorIQ is a **TanStack Start** app (file-based routing in `src/routes`,
server logic via `createServerFn`) bundled with **Vite**. It is *not* Next.js.

- **TanStack Start + TanStack Router / Query** — routing, SSR and data loading
- **Vite 7** — build tooling
- **React 19 + TypeScript**
- **Tailwind CSS v4** (`src/styles.css`) + shadcn/ui components
- **Supabase** — Postgres, auth and RLS (`src/integrations/supabase`)
- **Apify** — public Instagram/TikTok profile data, cached 24h in `social_profile_cache`

### Environment

Copy `.env.example` to `.env`. `.env` is git-ignored and must never be committed.
