# System Architecture

This document summarizes the serverless API, MongoDB utilities, and client data flow that power the Employee Management System.

## API Entry Point

- **File:** [`api/[...path].ts`](../api/%5B...path%5D.ts)
- A single Vercel serverless function handles every `/api/*` route.
- Incoming requests are normalized into an array of path segments, then dispatched to a sequence of focused handlers (`auth`, `users`, `attendance`, `notes`, `bootstrap`, `leaves`, `salaries`, `salaryHistory`, `pendingAdvances`, `pendingStorePurchases`, and `announcements`).
- Shared helpers provide:
  - JSON serialization shortcuts and method guards.
  - Strongly typed validation/parsing for request bodies.
  - Attendance total calculation, admin enforcement for manual punches, and consistent response payloads.
- CORS headers are applied to every response, with an early return for `OPTIONS` preflight requests.

## MongoDB Utilities

- **File:** [`api/mongodb.ts`](../api/mongodb.ts)
- Centralizes connection lifecycle, collection creation, and index enforcement.
- Exposes strongly typed interfaces for every collection (`User`, `Attendance`, `Note`, `Leave`, `Salary`, etc.) so the API layer does not rely on `any`.
- Compression pipeline:
  - `compressNoteText` stores large note bodies as deflated binary blobs alongside hashes and original lengths.
  - `decompressNoteText` transparently inflates or falls back to legacy plaintext data.
  - `ensureCompressedNotes` migrates existing documents during startup to keep storage lean.
- Additional utilities parse historical stringified fields (e.g., attendance punches/totals, salary adjustments) to ensure older records remain compatible.

## Client Data Store

- **File:** [`src/lib/store.ts`](../src/lib/store.ts)
- Fetches `/api/bootstrap` once during initialization to hydrate users, attendance, salaries, notes, announcements, and pending adjustments in a single network request.
- Maintains memoized maps and sorted arrays for fast lookups without re-fetching data.
- Exposes helper methods for background refresh, optimistic updates, and consistent error handling surfaced to UI components.

## Build & Runtime Optimizations

- **File:** [`vite.config.ts`](../vite.config.ts)
  - Manual Rollup chunk splitting groups heavy vendor packages (`framer-motion`, `lucide-react`, `@radix-ui/*`, React Router, React Query) so no single bundle exceeds the 500 kB minified threshold.
  - The development proxy logs proxied requests for easier debugging when running the Express bridge locally.
- Lazy-loaded page routes leverage `React.lazy` (see [`src/App.tsx`](../src/App.tsx)) to defer non-critical UI bundles until navigation.
- `api/[...path].ts` exports a `config` object to pin the Node.js 20 runtime and max duration without relying on `vercel.json` overrides.

## Local Development Bridge

- **File:** [`api-server.ts`](../api-server.ts)
- Wraps the catch-all serverless handler in an Express server listening on port 3000.
- Provides JSON parsing and `VercelRequest`/`VercelResponse` shims so the same logic runs locally and in Vercel.

## Bootstrap Checklist

1. Start MongoDB (Atlas or local) and ensure the connection string is available via `MONGODB_URI`.
2. Run `npm run dev:api` to launch the Express bridge and `npm run dev` for the Vite frontend.
3. First API invocation creates collections, indexes, default seed data, and backfills legacy notes.
4. Navigate to the frontend (`http://localhost:5173`), log in with the default PINs, and the dashboard will hydrate from `/api/bootstrap`.
