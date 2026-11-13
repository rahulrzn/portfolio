# Rahul Reji R. portfolio

React, TypeScript, Vite, Tailwind CSS and Motion frontend with an expressive public portfolio and a separate browser-local content workspace. Dark and light palettes, readable self-hosted Source Sans 3/Space Grotesk fonts, a bold name masthead, compact project case studies and dedicated About/Skills pages. Deployment target: Cloudflare Pages.

## Run

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

On PowerShell use `npm.cmd` if the execution policy blocks `npm.ps1`. Open the address printed by Vite. Public routes: `/`, `/about`, `/skills`, `/projects`, `/projects/:slug`, `/research`, `/contact`. Admin starts at `/admin`.

## Edit and recover content

The admin gate is a non-secure development convenience. Enter any session phrase of at least eight characters; it is not a password or authentication. The session is held in memory and closes on reload. All public content remains accessible without the gate.

Profile, projects, skills, research and settings editors save a separate draft. Preview uses the same public components. Publish explicitly copies the draft to the public snapshot **in the current browser only**. It does not update Cloudflare or other visitors' browsers. For a shared deployed change, incorporate reviewed content into `src/content/defaults.ts` and rebuild, or connect a future repository implementation.

In **Admin → Profile**, set Email, Phone number, GitHub URL and LinkedIn URL. Use full profile URLs; optional empty values stay hidden publicly. Telephone links are normalized only after validation. The same editor contains **Opportunities**: show/hide the section, edit its heading, summary, role flexibility, career interests, ordered preferred locations and employment types. Save draft, preview, then publish to apply the changes in this browser. Older snapshots/backups without these fields remain compatible.

Content uses strict Zod validation and a versioned localStorage envelope with stable IDs, safe URLs and bounded strings/lists. Images use IndexedDB blobs with file, decoded-dimension and size validation. The repository retains a last-valid copy and valid in-memory content, preserves damaged data for export, and fails saves honestly when storage is unavailable or full.

Settings provides portable JSON export/import, including referenced images. Imports stage a draft and leave published content intact. Revert restores the published snapshot; Restore defaults stages original content. Export backups before clearing browser data or switching devices. Content and image storage are scoped to browser and origin; preview, localhost and production have separate storage. Backup images are limited to 20 MB; import files to 32 MB. The editor is intended for one active editing tab; it does not provide collaborative conflict resolution.

## Public content

Facts are traced in `docs/content-source.md`. Only the supplied Soho Suite live URL is included. Missing email, phone, GitHub, LinkedIn and publication URLs are omitted. The Open to Opportunities preferences come directly from the user's instructions. The contact form prepares an email-client draft if a valid email is configured and offers copying; it never claims server delivery. The downloadable PDF is generated from published content. It supports Western Latin text; a future multilingual version would need embedded Unicode fonts. Original reference PDFs are private and excluded from deployed files. Project images are optional; no decorative 3D models or Three.js runtime remains.

## Verify

```sh
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run test:production
```

First-time browser setup: `npx playwright install chromium`. E2E tests use Chromium, one worker and port 5173. Tests cover public navigation/contact/downloads, responsive layouts, automated WCAG checks, storage/image recovery, long edited content, header tracking, themes, opportunities visibility, configured contact links, admin CRUD/publication/backups, actual Back/Forward protection and mobile drawer keyboard behavior. `node scripts/visual-review.mjs` captures both themes on desktop, tablet and mobile from a running port-5173 server into `docs/screenshots/`. `node scripts/social-preview.mjs` regenerates the 1200×630 social image from validated defaults. Run browser suites and screenshot capture separately.

## Cloudflare Pages

This project has **no backend, API, server database or Pages Functions**. Cloudflare Pages serves the compiled HTML, JavaScript, CSS, fonts and images. Node.js is needed for the build, rather than as a running server. Contact prepares an email-client draft; the admin stores content in the current browser's localStorage and IndexedDB.

For Git-based deployment:

1. Push this project's source to a GitHub or GitLab repository, including `package.json`, `package-lock.json`, `src`, `public`, `scripts/seo.mjs` and the Vite/TypeScript configuration. The `.gitignore` excludes dependencies, built files, environment values, private references and generated development/test artifacts.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**. Select the repository and its production branch, usually `main`.
3. Configure the framework as **React (Vite)** and the following settings:

   | Setting                              | Value                                                |
   | ------------------------------------ | ---------------------------------------------------- |
   | Build command                        | `npm run build`                                      |
   | Build output directory               | `dist`                                               |
   | Root directory                       | Leave blank for this standalone repository           |
   | `NODE_VERSION` environment variable  | `22.16.0`, or another supported Node version ≥ 22.12 |
   | `VITE_SITE_URL` environment variable | Your final HTTPS Pages or custom-domain origin       |

4. Select **Save and Deploy**. Cloudflare installs dependencies and builds the site. Once deployed, it provides your project's `pages.dev` URL. If you did not know that URL before the first deployment, set `VITE_SITE_URL` to the assigned origin and redeploy to generate canonical links and a sitemap. Set the value in production and preview build environments if both should have configured metadata.
5. Later pushes to the production branch rebuild and deploy the site. Test direct URLs such as `/about`, `/skills` and `/projects/soho-suite`, plus the mobile menu, theme toggle and résumé download.

For a manual upload, run `npm.cmd run build` and `npm.cmd run test:production` locally, then create a Cloudflare Pages **Direct Upload** project and upload `dist` or a ZIP containing its contents. Include the generated `_headers` and `_redirects` files. Choose Git integration initially if you want future automatic deployments: a Direct Upload project cannot be switched to Git integration later.

**Updating content for every visitor:** change the deployed content in `src/content/defaults.ts`, rebuild and redeploy. Admin edits and Publish affect only the current browser and origin; they are not uploaded to Cloudflare. Export a backup to preserve local edits. A future backend or CMS would be needed to synchronize admin changes across visitors. No secret belongs in a `VITE_` variable because those values become public frontend code. The reserved `VITE_API_BASE_URL` can remain empty.

Official instructions: [Cloudflare Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

The build generates static route metadata, canonical links and a sitemap when an origin is configured. An unset origin produces valid pages without fabricated URLs. `_redirects` handles SPA navigation; `_headers` includes security headers and admin noindex directives. Existing generated route HTML supplies correct project social metadata before JavaScript. The supplied portrait and an actual 1200×630 PNG social preview ship with a favicon. Inspect deployment headers and direct project URLs after publishing.

To preview locally: `npm run preview`. Cloudflare-specific headers and redirects are applied by Cloudflare, rather than Vite preview. No Vercel configuration or deployment dependency is used.

## Architecture

- `src/content/`: schema, defaults, replaceable repository, images, portable backups, PDF generation and React context.
- `src/public/`: lazy public routes and case studies.
- `src/components/`: shared media, safe links, metadata and error recovery.
- `src/admin/`: lazy task-oriented editors, local gate, dialogs and history guard.
- `scripts/seo.mjs`: validated-default-driven route metadata.

Public components depend on the `ContentRepository` interface and context. Future backend work can replace repository persistence while keeping rendering/forms. Authentication and authorization require a real service; `VITE_API_BASE_URL` is reserved configuration and is not called. Content is rendered as text, never arbitrary HTML or executable configuration. Public pages do not fetch admin form code until entering the workspace.

Design decisions: `DESIGN.md`. Research: `docs/research.md`. Review and validation evidence: `docs/admin-review.md`, `docs/final-content-review.md`, `docs/progress.md`.

## Git hygiene

`.gitignore` excludes generated builds/caches, reports/screenshots/traces, private résumé/reference files, one-off discovery scripts, local design-tool settings, environment files, credential/key patterns, local cloud authentication and browser-local admin backup/recovery exports. `.env.example`, application code, source tests, build/verification scripts and `package-lock.json` remain versioned so the repository is reproducible. Generated screenshot evidence stays in the local workspace and can be shared separately.

`.gitignore` does not remove files already tracked by Git. Review any already tracked private files before publishing a repository, and rotate any credential that was previously committed. No tracked private-reference/environment files were found during this project's check.
