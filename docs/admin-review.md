# Admin implementation review

Reviewed on 2026-11-14 against `docs/admin-task.md`, the original brief sections 6–8 and 10, `docs/admin-report.md`, the six scenarios in `e2e/admin.spec.ts`, all `src/admin/**` files, and the shared schema/provider interfaces. This review changes no application source. Shared schema, repository, backup implementation, and the ongoing public redesign remain the coordinator's responsibility.

## Verdicts

- **Specification compliance: PASS in the reviewed admin scope.** The four original findings below are resolved, including actual browser Back/Forward protection.
- **Code quality: PASS.** No material admin issue remains from this review. Ordinary confirmation dialogs and the corrected navigation/error branches passed targeted checks.
- **Implementation integrity: PASS.** The editor is a coherent, product-specific workspace with real functionality and independently verified corrective behavior.

## Independent corrective recheck

On 2026-11-14, reviewed the corrected `historyGuard.ts`, its early import in `src/main.tsx`, drawer semantics, trailing-hyphen slug handling, and per-path nested error presentation. Fresh standalone Chromium reproductions confirmed that canceled Back keeps `/admin/profile`, invokes the native confirmation, and retains `Keep this unsaved name`; mobile focus moves to Close navigation, Tab reaches Overview, and Escape closes the drawer; the original long-slug edge successfully duplicates; an 81-character outcome Result displays `Use 80 characters or fewer.` with `aria-invalid="true"`. Safe dialog autofocus, Tab, Escape, and trigger focus restoration remained working.

Independently ran `npm.cmd run test:e2e -- e2e/admin.spec.ts -g 'browser Back|browser Forward|mobile drawer|long valid slugs|nested skill' --output=test-results-admin-independent-recheck --reporter=list`: **6 passed in 18.6 seconds, exit 0**. This covers Profile/Skills Back cancellation and acceptance, Forward cancellation and acceptance, drawer containment/restoration, repeated long-slug duplication, and nested skills/outcome error recovery. The implementer separately reports the full corrected admin suite **12/12**, typecheck, and Vitest **16/16** passing; those full-suite results are attributed rather than independently rerun here.

The findings below retain their original reproduction and root-cause evidence as a record. They are **resolved**, not outstanding acceptance blockers.

## Evidence and limits

The supplied implementation report records 6/6 admin Playwright scenarios, 12/12 Vitest tests, and a passing typecheck. As requested, these unchanged suites were not rerun; their reported results are not independent verification by this reviewer.

Fresh, isolated Chromium checks exercised browser history, the open 390px navigation drawer, nested validation, project duplication, and dialog keyboard behavior against the running application. These browser contexts were temporary; their edits did not change application files or the user's normal browser profile. A mobile screenshot was inspected. The source detector command `impeccable detect --json src/admin` returned `[]` with exit 0. Its clean result did not detect the behavior defects below.

The source review verifies the available fields and handlers; the targeted checks do not certify every CRUD permutation, browser engine, physical touchscreen, or contrast ratio. No claim is made about the final public redesign. Because this was a dispatched review with a specific brief, existing project context replaced a separate design interview. The requested durable report is this file.

## Audit health

These are bounded code-and-behavior audit scores, not a WCAG conformance claim.

| Dimension | Score | Evidence |
| --- | --- | --- |
| Accessibility | 3/4 | Native dialogs, corrected mobile drawer, and specific nested errors passed targeted checks. |
| Performance | 3/4 | Lazy editor pages; restrained opacity/transform motion; no source-level animation bottleneck found. |
| Theming | 3/4 | Consistent scoped navy palette; many hard-coded admin colors rather than reusable tokens. |
| Responsive design | 3/4 | Specific single-column/mobile controls; drawer keyboard behavior needs correction. |
| Implementation integrity | 4/4 | Genuine content controls and publication model; identified behavior defects are corrected. |
| **Total** | **16/20** | **Good, with bounded browser/device coverage.** |

## Findings

### Resolved [P1] Browser Back dropped unsaved form text without confirmation

**Location:** `src/admin/AdminApp.tsx:34`.

**Reproduction:** Open the workspace, navigate from Overview to Profile, change Name, and wait until the topbar reads `Unsaved changes`. Invoke browser Back. The actual result is `/admin/dashboard`, zero native confirmation dialogs, and an unmounted Profile form. The unsaved name is lost. The same loss occurred from Skills.

**Root cause evidence:** Instrumented `popstate` listener registration/invocation showed React Router's earlier listener running while the topbar still said `Unsaved changes`. That navigation removed/replaced the editor's listener before the browser invoked it. Instrumenting `window.confirm` confirmed it was never called. The current late, bubbling `popstate` listener therefore cannot reliably guard the router.

**Impact/category:** Editing safety / implementation integrity. The user loses text through ordinary browser navigation despite a documented safeguard. The passing sidebar-navigation test does not cover this branch.

**Recommendation:** Intercept history navigation before the router can unmount the form, preserve the current entry and form when cancellation is selected, and add a real Back/Forward regression that checks both cancellation and confirmed discard. Verify cancellation retains the actual typed value, rather than merely returning to the editor route.

**Suggested command:** `$impeccable harden`.

### Resolved [P1] Open mobile navigation left keyboard focus behind its overlay

**Location:** `src/admin/AdminApp.tsx:37`; `src/admin/admin.css:6`.

**Reproduction:** At 390×844, focus `Open navigation` and press Enter. Focus remains on the trigger outside the drawer. Pressing Tab moves to `Preview saved draft` behind the scrim instead of into navigation. Pressing Escape leaves the drawer open.

**Impact/category:** Accessibility / responsive design. The drawer visually blocks the editor while its controls remain in the keyboard path. The navigation precedes its trigger in DOM order, so forward tabbing does not naturally reach the newly opened navigation. The closed drawer correctly uses `visibility:hidden`; this finding concerns only its open state.

**Recommendation:** Give the open mobile drawer a coherent modal interaction: move focus to its close control or first destination, contain focus while open, make covered editor content inert, support Escape, and restore trigger focus on close. Keep the desktop sidebar's normal non-modal behavior.

**Suggested command:** `$impeccable adapt`.

### Resolved [P2] Nested validation hid the actual error and did not identify its input

**Location:** `src/admin/SkillsPage.tsx:13`; `src/admin/forms.tsx:38`; `src/admin/forms.tsx:44`.

**Reproduction:** Set a skill category to 101 characters and Save draft. The schema correctly rejects it, but the UI says `Every category and skill needs a name. Complete or remove empty entries.` The populated category has no `aria-invalid`. Separately, an outcome with an 81-character Result and a valid Result label is rejected with `Complete the result and label for every outcome.` Its Result input also has no `aria-invalid`.

**Impact/category:** Accessibility / validation UX. The instruction does not explain a length violation and the global `Check the highlighted fields` toast points to fields that are not highlighted. Users must guess why a completed entry cannot save. The same aggregated-controller pattern affects technology/workflow entries.

**Recommendation:** Read errors at each nested path, show the actual length/required message next to the relevant input, and associate it with `aria-invalid` and `aria-describedby`. Keep a summary when useful, but ensure it accurately identifies offending entries. Test a non-empty overlong category and outcome.

**Suggested command:** `$impeccable clarify`.

### Resolved [P2] Duplicating a valid long slug could generate an invalid slug

**Location:** `src/admin/ProjectsPage.tsx:18`.

**Reproduction:** Save a project whose slug is `"a".repeat(63) + "-bc"`, a valid 66-character slug. Click Duplicate. `slice(0, 64)` ends on its hyphen, and appending `-copy` produces consecutive hyphens. The duplicate is rejected with `projects › 4 › slug: Use lowercase words separated by hyphens.` No copy is created. The numbered-copy fallback has the same risk at its 60-character cutoff.

**Impact/category:** CRUD / implementation integrity. Valid editor content makes a required action fail. The repository safely rejects the malformed duplicate, so published data is preserved.

**Recommendation:** Remove trailing separators after truncating the base, reserve suffix space, and continue checking uniqueness. Exercise truncation at a hyphen and a second duplicate requiring the numbered suffix.

**Suggested command:** `$impeccable harden`.

## Specification coverage and positive findings

| Requirement | Review result |
| --- | --- |
| Gate and routing | In-memory session, 8–200 character phrase validation, show/hide, sign-out, explicit non-authentication copy, and required editor routes are present. No persisted auth token or invented security claim. |
| Profile and education | All profile schema content fields have editors. Education has stable IDs and add/edit/remove/reorder. Resume reference is intentionally in Settings. |
| Projects | Text stories, category/year/context, technologies, workflow text, outcomes, links, status, featured, order, image controls, CRUD, and stable new IDs are implemented. Long-slug duplication is corrected and verified. The removed fallback-diagram selector follows the user's updated instruction. |
| Skills and research | Real controlled CRUD/reorder and stable IDs; category/skill/research removals require confirmation. Research exposes date, publication, link, technologies, details, outcomes, status, and order. Specific nested errors are corrected and verified. |
| Save/revert/publish | Form text is separate from saved draft. Save uses shared validation. Revert/cancel confirm dirty text. Global revert/reset/publish require clear confirmations. Publish is disabled for unsaved forms and explains browser-local effects. Back/Forward cancel and discard paths are corrected and verified. |
| Preview | Actual shared `PublicRoutes` under `ContentProvider draft` and `/admin/preview/*`, with a return banner; no iframe or duplicate mock UI. Preview item visibility is owned by the coordinator's public implementation. |
| Images and backups | Upload calls the validated image store; removal only clears references. Admin never deletes published blobs. Import enforces JSON filename/32 MB limit, delegates data validation, confirms replacement of saved draft, and leaves publication explicit. Raw damaged data export is available on warnings. Shared transactional/recovery correctness is reviewed separately. |
| Dialogs | Actual `<dialog>.showModal()`, safe Cancel/Keep editing autofocus, Tab to destructive action, Escape cancellation, and restoration to the invoking Revert button were independently checked. |
| Feedback and metadata | Error alerts/status notices, labels, reduced-motion configuration, responsive form CSS, persistent browser-local notice, and noindex for the mounted admin application are present. |

The original six-scenario suite omitted browser history, keyboard operation of an open drawer, non-empty nested length errors, and slug truncation. Six new scenarios now cover those paths. Safe repository rejection and shared-component preview are strong existing boundaries worth retaining.

## Recommended actions

1. **[P1] `$impeccable harden`:** Correct browser-history blocking and verify that cancellation preserves text.
2. **[P1] `$impeccable adapt`:** Complete open-drawer keyboard/focus behavior at mobile sizes.
3. **[P2] `$impeccable clarify`:** Expose accurate per-entry nested validation.
4. **[P2] `$impeccable harden`:** Keep generated duplicate slugs valid after truncation.
5. **`$impeccable polish`:** Finish with a focused keyboard/mobile pass after the behavior fixes.

All corrective actions above are complete for the identified findings. Keep the new focused regressions alongside the full admin suite. Cross-engine and physical-device verification remains a practical coverage limit, rather than an observed defect.
