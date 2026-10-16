# Doodle Spin v2

Public slot machine and public saved-image gallery. Owner password protects image generation, starring, and deletion. Every generated image is automatically stored in Vercel Blob. Uses the existing OIDC-connected public Blob store (no BLOB_READ_WRITE_TOKEN required on Vercel).

## Deploy
1. Install with `npm install` and commit `package-lock.json`.
2. In Vercel project environment variables, set `GEMINI_API_KEY`, `DOODLE_PASSWORD`, and `SESSION_SECRET` (generate a random secret with `openssl rand -hex 32`). Do NOT commit any secrets.
3. Confirm `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` were added by connecting the Blob Store. Vercel Functions receive the OIDC token automatically.
4. Push to GitHub to deploy. Redeploy after changing environment variables.
5. In Vercel Firewall create a rate limit rule for `/api/generate` (suggest 5 requests per 10 minutes per IP), and ideally an additional rule for `/api/auth` (suggest 10 attempts per 10 minutes per IP). Hobby plans may allow only one custom rate-limit rule; if so, prioritize `/api/generate` and use a strong random owner password. An alternative is one rule covering `/api/*`, with the downside that gallery reads count too. Check current plan limits.

## Local testing
Use `npx vercel link` followed by `npx vercel dev`. Pull development env vars with `npx vercel env pull .env.local`; then ensure `DOODLE_PASSWORD`, `SESSION_SECRET`, and `GEMINI_API_KEY` exist. OIDC credentials may be short-lived locally; repeat the pull if Blob authentication expires.

## Notes
- Public Blob URLs are accessible to anyone who has them. Gallery read access is public; write actions require owner login.
- Session: signed HttpOnly SameSite=Strict cookie, valid seven days; resetting SESSION_SECRET signs out existing sessions.
- For a personal app, file-name metadata and star-marker Blobs avoid a database. If the gallery grows very large or you want multiple accounts, move metadata to Postgres.
- The browser can view/modify the selection sent to the server. Currently the server validates characters/length but does not strictly whitelist selections. Owner login prevents anonymous abuse; for stronger restrictions, move allowed selection lists to the backend.
- A login password alone does not provide brute-force protection. Configure WAF rate limiting before distributing the site broadly.
- No live Gemini or Vercel deployment test has been performed here.
