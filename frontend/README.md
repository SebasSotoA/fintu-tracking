# Fintu Tracking Frontend (Next.js)

This is the Next.js frontend for Fintu Tracking.

## Setup

1. Install Node.js 20 or higher
2. Install pnpm (if not already installed):
   ```bash
   npm install -g pnpm
   ```
3. Copy `.env.local.example` to `.env.local` and fill in your values
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

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:8080)

## Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Build for production
- `pnpm start`: Start production server
- `pnpm lint`: Run ESLint

## Building for Production

```bash
pnpm build
pnpm start
```

