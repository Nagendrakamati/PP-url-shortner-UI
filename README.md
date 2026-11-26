# Linkline

A React and TypeScript URL shortener. The Shorten page creates and copies links. The Admin page lists each short URL and its destination, newest first, with 10 records per page.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

`npm run lint` checks the code. `npm run build` type-checks it and writes the production bundle to `dist/`. Use `npm run preview` to serve that bundle locally.

## State and storage

- TanStack Query manages requests and refreshes cached Admin pages after a link is created.
- React Router handles navigation. Admin pagination lives in the URL for browser history and bookmarks.
- Session storage preserves the unfinished URL through reloads in the same tab.
- In demo mode, local storage holds the created links. Demo URLs use `/s/:id` and resolve on the same browser profile and origin. Using a different port starts with separate storage.

## Connect your backend

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to your API base, such as `https://api.example.com/api` or `/api` for a same-origin proxy. Restart Vite after changing it. Production builds read the variable at build time. Demo records stay in browser storage and are separate from API records.

The adapter is in `src/services/links.ts`. Both endpoints return JSON.

| Method and path | Request | Successful response |
| --- | --- | --- |
| `POST /links` | `{ "longUrl": "https://example.com/article" }` | A link record, HTTP 201 |
| `GET /links?page=1&pageSize=10` | One-based page and page size | `{ "items": [link records], "total": 42 }`, HTTP 200 |

```json
{
  "id": "abc123",
  "shortUrl": "https://short.example.com/abc123",
  "longUrl": "https://example.com/article",
  "createdAt": "2026-11-25T10:00:00Z"
}
```

Return newest records first with a stable tie-breaker, the full matching count, and an empty items array for out-of-range pages. In API mode, the backend owns short-link redirects. The adapter includes browser credentials. A cross-origin API must allow credentials and explicitly allow the frontend origin. Protect the admin listing on the backend and enforce any required CSRF protections there.

Serve `dist/` over HTTPS in production. Configure your host to return `index.html` for frontend routes such as `/admin` and demo routes such as `/s/abc123`. Route API requests and backend redirects before applying the SPA fallback.
