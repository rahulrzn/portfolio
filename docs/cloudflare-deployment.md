# Connect the portfolio admin to Cloudflare

The public site and admin are one application. Pages serves the React frontend, Pages Functions provides `/api/*`, and D1 stores the shared draft, published content, sessions and uploaded images. Open **https://rahul-portfolio-j94.pages.dev/admin** to manage production. `localhost` uses a separate development database.

The existing live site was checked on 14 November 2026: `/api/health` and `/api/auth/session` returned HTML. The public profile loads, but that deployment does not contain the connected API. A frontend-only upload is insufficient.

The steps below change Cloudflare resources or deploy code. They are instructions for the approved setup, and have not been executed by the coding agent.

## 1. Create and bind D1

In Cloudflare, create a D1 database named `rahul-portfolio-content`. Copy its database ID into `env.production.d1_databases[0].database_id` in `wrangler.jsonc`, replacing `REPLACE_WITH_PRODUCTION_D1_DATABASE_ID`. Keep the binding exactly **`PORTFOLIO_DB`**.

For preview deployments, create a separate `rahul-portfolio-preview` database and replace the preview ID as well. Use a separate preview password. Preview and production must not share a database.

The top-level configuration and `wrangler.local.jsonc` intentionally use a local-only ID. Do not replace that ID with production credentials. D1 database IDs are binding identifiers; passwords and API tokens never belong in Wrangler's public `vars`.

After approval, authenticate Wrangler to the Cloudflare account that owns the existing Pages project and apply the additive migration:

```powershell
npx.cmd wrangler login
npx.cmd wrangler d1 migrations apply PORTFOLIO_DB --remote --env production --config wrangler.jsonc
```

For the separate preview database:

```powershell
npx.cmd wrangler d1 migrations apply PORTFOLIO_DB --remote --env preview --config wrangler.jsonc
```

`migrations/0001_portfolio.sql` creates namespaced tables and indexes without dropping or replacing existing data. If attaching an existing populated database, retain its backup before setup. The first public content read seeds the original portfolio only when its content row is absent. Existing content is preserved.

## 2. Configure the owner password

Use Node.js 22.12 or newer. No Android SDK or Docker is needed.

Run this in your own interactive terminal:

```powershell
npm.cmd run admin:password
```

Enter and confirm a strong password of 16–256 characters. The tool saves its salted hash to ignored `.dev.vars` and `.wrangler/admin-password.secret`; it does not print the password or hash. Sign in with the password you entered, not the stored hash.

After approval, send the hash through standard input to the existing Pages project's production secret:

```powershell
Get-Content -Raw .wrangler/admin-password.secret | npx.cmd wrangler pages secret put ADMIN_PASSWORD_HASH --project-name rahul-portfolio-j94 --env production
```

Alternatively add `ADMIN_PASSWORD_HASH` as a **Secret** in the Pages project's production Variables and Secrets settings using the hash from the private file. Never use `VITE_ADMIN_PASSWORD`, paste secrets into source, or commit the private files. Configure a different hash for preview if using that environment.

`env.production.vars.APP_ORIGIN` is set to the existing HTTPS Pages origin. If you switch to a custom domain, update it to the exact origin used to open the admin. Preview defaults to the request's own origin. Local scripts set their own loopback origin automatically.

## 3. Deploy the frontend and Functions together

Use the existing Cloudflare Pages project. Build settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output | `dist` |
| Root directory | Repository root |
| Node version | 22.12 or newer |
| `VITE_SITE_URL` | `https://rahul-portfolio-j94.pages.dev` |
| `VITE_API_BASE_URL` | Empty |

For Git integration, deploy the reviewed source including `functions/`, `server/`, `migrations/`, both Wrangler configs and the lockfile. Cloudflare compiles Functions from the root `functions/` directory.

For an approved manual deployment, run from the repository root:

```powershell
npm.cmd run build
npx.cmd wrangler pages deploy dist --project-name rahul-portfolio-j94 --branch main
```

Use the actual production branch shown in the existing Pages project if it differs from `main`. Uploading only a `dist` ZIP through the dashboard does not deploy this source Functions directory. Do not create a separate Vercel project for this Cloudflare application.

This is a one-time deployment for the connected architecture. Later content changes use D1 and do not need a rebuild. Application code changes still require deployment.

## 4. Verify the live setup

```powershell
npm.cmd run deploy:check -- --url https://rahul-portfolio-j94.pages.dev
```

This command uses anonymous GET requests only. It checks JSON API readiness, published content, ETag revalidation, denied private content reads and private admin headers. It never asks for credentials, changes content, applies migrations or deploys.

Then open `/admin`, sign in, edit a field, **Save draft**, inspect **Preview**, and choose **Publish → Publish now**. Open the public page in another browser or private window and refresh. Saved drafts remain private until publication. Public content revalidates on load, focus, return to a tab and every 30 seconds while the page is visible. Dynamic HTML metadata and the sitemap also use published D1 content.

The local Playwright suites deliberately refuse production credentials and restrict writes to the isolated loopback origins. Live browser writes remain an approved manual check.

## Local development

```powershell
npm.cmd ci
npm.cmd run admin:password
npm.cmd run dev
```

Open the printed `http://127.0.0.1:5173` address and `/admin`. The script applies only local additive migrations, starts Wrangler on an internal API port and proxies API requests through Vite. Use the printed loopback hostname consistently. Restart after changing `.dev.vars`.

```powershell
npm.cmd run build
npm.cmd run preview
```

Preview serves the built frontend through the Cloudflare runtime on port 4173 with the local database. Publishing here changes local content. Use the online admin to change the live website.

## Preserve earlier browser edits

Before replacing the old local admin, export its JSON backup in the browser and origin where you edited it. The backup includes referenced images. Browser data from `localhost` is not accessible from the live HTTPS origin.

In the connected admin, use **Settings → Import backup** to stage that backup as a draft. Inspect Preview before publishing. The explicit legacy-browser import is also available when the old data exists in that same browser and origin. It exports recovery backups and never automatically publishes or clears old browser data.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Public profile works but `/api/health` returns HTML | Deploy the full source with Functions using Git or Wrangler. The current upload is static only. |
| Health returns JSON 503 | Check `PORTFOLIO_DB`, the applied migration and `ADMIN_PASSWORD_HASH`. |
| Login says authentication is not configured | Set the server secret to the tool-generated hash and redeploy. |
| Login or saving returns an origin error | Open the exact production `APP_ORIGIN`, or update it for your custom domain. |
| Saved changes are absent publicly | Save the complete draft and explicitly Publish. Use the production admin for production edits. |
| A save reports a revision conflict | Another session changed the draft. Preserve your unsaved text, refresh the latest content, and reapply the change. |
| Local test startup reports a busy port | Stop the verified isolated test server with `scripts/stop-test-server.ps1`; keep application development ports separate. |

Owner sessions use HttpOnly cookies, CSRF tokens and exact origin validation; they expire after eight hours. Password rotation invalidates previous sessions. The admin protects every write server-side. Text and links are validated through the shared schema, and D1 queries use bound parameters. Uploaded raster images are capped at 1 MB each; referenced images cannot be deleted. JPEG and WebP receive structural validation; PNG additionally validates decompressed pixels. The generated résumé currently supports Western Latin text.

Cloudflare references: [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Functions deployment](https://developers.cloudflare.com/pages/functions/get-started/).
