# Admin workspace implementation

Implemented the authorized admin workspace using the shared Zod schemas, repository, image store and portable backup services. No public or shared service files were edited. No subagents were used for this delegated task.

## Files

- `src/admin/AdminApp.tsx`: in-memory development gate, route shell, dashboard, global saved-draft preview/publish/revert, mobile navigation and noindex metadata.
- `src/admin/workspace.tsx`: native focus-managed confirmation dialog, unsaved-change guard, reload protection and animated status/error notifications.
- `src/admin/historyGuard.ts` and `useHistoryGuard.ts`: lightweight listener loaded by root before BrowserRouter and updated by the active editor; canceled history traversal restores the original entry without unmounting form text.
- `src/admin/useMobileDrawer.ts`: mobile focus transfer/trap, Escape, covered-content inert state, scroll lock and focus restoration; desktop navigation remains non-modal.
- `src/admin/forms.tsx`: controlled React Hook Form fields, Zod validation, save/revert/cancel, validated image upload/removal, technology/workflow/outcome controls.
- `src/admin/ProfilePage.tsx`: complete profile fields and education add/edit/reorder/remove.
- `src/admin/ProjectsPage.tsx`: complete project CRUD, unique stable duplicate IDs/slugs, order, visibility, featured status, stories, links, images and outcomes.
- `src/admin/SkillsPage.tsx`: stable category/skill IDs, controlled add/edit/remove and reorder, destructive confirmations.
- `src/admin/ResearchPage.tsx`: controlled CRUD, details, publication/date/link, order, status, technologies and outcomes.
- `src/admin/SettingsPage.tsx`: site/contact/SEO/resume settings, portable backup export/import, damaged data export and confirmed draft reset.
- `src/admin/admin.css`: scoped navy operational interface, responsive forms/sidebar, keyboard focus and reduced-motion overrides.
- `e2e/admin.spec.ts`: twelve behavior-focused browser scenarios.

## Safety and behavior

The gate explicitly states that any eight-character phrase opens a browser-local development editor. The phrase and session are never persisted; sign-out and reload close the session while saved content remains.

Form text, saved draft and published content are separate. Save validates content synchronously through the shared service. Revert/cancel discard only form text after confirmation; global discard returns the draft to published content. Publication requires a native confirmation describing its browser-only effect. Unsaved forms disable Publish and prompt before route changes or reload. Browser Back uses native confirmation.

Preview uses the same `PublicRoutes` under an actual nested `preview/*` route and `ContentProvider draft`, with a return banner. Admin/login/preview routes carry noindex. Public data changes only through explicit repository publication.

Image removal changes the reference only; published blobs are never deleted by admin actions. Image uploads use IndexedDB validation. Portable imports stage saved draft content and do not publish. File type/size and service validation errors are actionable. Restore defaults also requires an explicit later Publish.

The project fallback-illustration selector was removed in response to the user's later instruction to remove workflow diagrams; the underlying existing schema value is retained without adding diagram UI.

## Verification

- Initial gate scenario ran before implementation and failed because the gate was absent.
- `npm.cmd run test:e2e -- e2e/admin.spec.ts --output=test-results-admin-final --reporter=list`: **12 passed** in 56.2 seconds. Covers gate validation/sign-out, project create/edit/duplicate/delete and cancellation, saved-draft/public isolation, same-component Live Demo preview/publication, mobile skills/research/settings, unsafe URL rejection, invalid backup rejection, unsaved profile protection, invalid image rejection, successful image upload, image-containing backup export/import, default-reset cancellation/confirmation, reload session closure with saved edits preserved, research deletion, global draft revert, actual Back cancel/accept for Profile and Skills, Forward cancel/accept, drawer Tab/Escape/focus, repeated long-slug duplication and accurate nested length errors.
- Focused review regressions: **6 passed** in 19.1 seconds using a separate test output directory.
- `npm.cmd run typecheck`: passed.
- `npm.cmd test`: **4 files / 16 tests passed** in the full current Vitest suite.
- Browser screenshots inspected at 1440px desktop and 390px mobile. Mobile browser body width measured 390px, with no horizontal overflow. Closed mobile sidebar now uses visibility to remove offscreen navigation from keyboard focus. Route focus preserves scroll position and resets the page to its top.

## Limits and coordination

No real authentication, server, remote publication or cross-device persistence is claimed. Backups are the portable content mechanism. History cancellation uses a native prompt and returns to the original indexed history entry; accepted Back/Forward discards only unsaved form text. Root's early `import './admin/historyGuard'` is required so that React Router cannot unmount the form before the guard runs.

## Corrective review follow-up

The independent review correctly found that the original late `popstate` listener could be removed by Router before invocation. Real browser regressions first reproduced loss of Profile/Skills text, open-drawer keyboard gaps and an invalid truncated duplicate slug. Instrumentation also showed that a capture flag alone does not reorder Window-target listeners ahead of Router. The correction registers a small pure listener before Router mounts, and keeps current dirty/entry state in a separate hook. New Back and Forward tests verify the original typed value survives cancellation, rather than simply returning to the route.

Mobile navigation now focuses its close control, traps Tab in visible drawer controls, supports Escape and restores trigger focus; covered editor content is inert. Existing native confirmation dialogs remain allowed above the drawer. Duplicate generation trims trailing hyphens after truncation and reserves suffix space while checking uniqueness, including a second copy. Nested categories, skills, technologies, workflow steps and outcomes read their exact deep error path and provide an associated `aria-invalid`/`aria-describedby` message. Non-empty length violations now explain the permitted character count.

The nested-error regression found an additional usability defect: the bottom toast intercepted Save draft clicks. Its position now uses the upper notice area and sits beneath the drawer overlay, leaving the save controls accessible. All twelve admin scenarios passed after these corrections. Independent review recheck is coordinated with `admin_reviewer`; the coordinator owns its acceptance and final whole-app verification.

The root coordinator is actively revising public design following user feedback. This report verifies admin behavior; it does not certify the final public visual direction. Public preview status filtering and shared storage recovery/export corrections remain owned by root. Existing public resume/photograph availability comes from shared content; admin can upload a real photograph and edit a validated public resume URL.

Skills read/applied: frontend-design, impeccable, vercel-react-best-practices, test-driven-development, systematic-debugging, receiving-code-review and verification-before-completion. Existing supplied design/product direction replaced a separate design interview within this assigned subagent brief; no structured question tool was available and the brief explicitly required autonomous implementation.
