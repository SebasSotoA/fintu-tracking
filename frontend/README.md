# Fintu Tracking Frontend (Next.js)

This is the Next.js frontend for Fintu Tracking.

## Setup

1. Install Node.js 20 or higher
2. Install pnpm (if not already installed):
   ```bash
   npm install -g pnpm
   ```
3. Copy [`.env.local.example`](./.env.local.example) to `.env.local` and fill in your values
4. Install dependencies:
   ```bash
   pnpm install
   ```
5. Run the development server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See [`.env.local.example`](./.env.local.example) for a template.

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8080)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google Cloud OAuth 2.0 Web client ID for Google Identity Services. Leave unset to hide Login with Google (email/password still works).

## Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Build static export to `out/`
- `pnpm start`: Start Next.js server (local dev alternative; production hosting uses the static export)
- `pnpm lint`: Run ESLint

## Building for Production

The app uses static export (`output: "export"` in `next.config.mjs`). `pnpm build` writes assets to `out/`.

Hosted sandbox and production deploys are documented in [Deployment](../docs/deploy.md) (GitHub Actions to AWS). To preview the static export locally:

```bash
pnpm build
npx serve out
```