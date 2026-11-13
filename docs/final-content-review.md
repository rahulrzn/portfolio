# Final content and public rendering review

Reviewed 2026-11-14 against the original brief, `PRODUCT.md`, `docs/content-source.md`, actual extracted resume text and the current `src/content/**`, `src/public/**` and shared components. The user's later removal of workflows is authoritative: their absence is not a defect, and no workflow diagrams or section should be restored. Production SEO scripts are owned and verified separately by the root agent.

**Content safety, code quality and public rendering verdict: approved after the fixes below.** The coordinator's final integrated browser checks verified the long-content correction. No material content/rendering finding remains from this review.

## Resolved public rendering finding

**P2 — Schema-valid long headings, skill names and outcome values overflow mobile layouts.** `src/styles.css:4`, `:7–14`; consumers include `src/public/Home.tsx`, `Projects.tsx`, `ProjectDetail.tsx`, `Research.tsx` and `Contact.tsx`. Paragraphs wrap, but several headings, inline labels and grid/flex children do not have equivalent wrapping or minimum-width constraints. An isolated Chromium context with a schema-validated fixture at a 390 px viewport produced document widths of 6,327 px on home, 3,160 px on projects, 5,132 px on project detail, 4,086 px on research and 4,307 px on contact. The fixture used a 180-character headline, 150-character project title, 100-character skill category, 80-character skill name/outcome value, 250-character research title and 160-character contact heading, each as an unbroken word. Root owns this layout correction and its browser verification. Scope the wrapping to editable content and allow grid/flex content to shrink; avoid hiding overflow as a substitute for readable content.

## Material findings fixed in this review

- **P1 — Corrupt primary and recovery storage discarded valid live content.** `src/content/repository.ts`. The read-denial path already preserved memory, but malformed copies still replaced a previously valid draft and publication with defaults. Recovery now retains the current valid in-memory snapshot if neither stored copy parses; both damaged raw copies remain untouched. A regression preserves different draft and published names through this failure.
- **P2 — Generated PDF text lost accented names and clipped long words.** `src/content/resume.ts`. The original sanitizer changed `Renée` to `Rene` and left a 150-character title on a single PDF line. The generator now normalizes combining accents, uses standard Helvetica with WinAnsi encoding, escapes encoded characters as ASCII octal bytes, and wraps using Helvetica glyph widths within the 528 pt text area. This preserves supported Western Latin names and keeps PDF byte offsets/stream lengths correct. Full Unicode scripts outside this standard font encoding would require an embedded font; the supplied identity and verified content are supported.
- **P2 — CampusVoice claimed an unverified database engine.** `src/content/defaults.ts`. All three source project descriptions identify AWS RDS, without naming its engine. Removed PostgreSQL from CampusVoice's project technologies only. PostgreSQL remains in the general skills and the verified Soho Suite implementation/technologies.

## Reviewed safety boundaries

The earlier repository/backup review's five findings are addressed in the inspected source: denied reads preserve live content and produce warnings; plain imports allow the larger pretty-printed input while compact writes remain bounded; portable import stages only draft-referenced images; the portable capacity supports 122 possible references; unavailable images stop complete-backup export rather than silently disappearing. Draft image references in portable imports must have corresponding validated bytes.

Strict schemas bound collection sizes and text, reject executable/credential-bearing URLs and unknown fields, and enforce unique IDs/slugs. Normal save/import changes remain isolated in draft until explicit publication; reset and revert also operate on draft. The public pages hide per-item draft statuses, while the shared admin preview exposes them intentionally. Public image failures retain fallbacks, external links use safe attributes, and editable text is rendered as text. Content consumers use repository/context and image service boundaries; the future API configuration exists without network calls.

Contact validation and its email-client/clipboard notices correctly avoid claiming server submission or delivery. Generated resumes filter unpublished entries, use current content instead of original private PDFs, and safely escape PDF delimiters. The source-derived project outcomes preserve their evaluation context; no fabricated contact URLs, experience or publication links were found.

## Verification

- Four new regressions were observed failing against the original implementation for the expected reasons, then passing after fixes: malformed-copy recovery, accented names, long-word PDF bounds and accent/delimiter-safe PDF offsets.
- Fresh `npm.cmd test`: **16 tests passed across 4 files**.
- Fresh `npm.cmd run typecheck`: **passed**.
- Before fixes, a direct artifact diagnostic confirmed the default PDF's header, xref and object offsets and two-page count. The new PDF tests verify generated byte offsets and declared stream lengths after encoding changes.
- Browser checks used an isolated direct Playwright Chromium context and wrote no shared runner reports. The root agent owns the full browser suite and post-fix layout verification.

## Final coordinator verification

The original overflow finding above records the pre-fix reproduction. It is resolved: editable headings, inline values and grid/flex children wrap and shrink without hiding content. The final schema-valid maximum-length fixture, including opportunity headings/interests/locations/types, passed across Home, About, Skills, Projects, case study, Research and Contact at 390, 768 and 1440px. Default routes also passed at 320px.

Fresh integrated checks on 2026-11-14: `npm.cmd run typecheck` passed; `npm.cmd test` passed 30 tests across seven files; `npm.cmd run test:e2e` passed all 27 tests. Both palettes passed automated accessibility checks. The extended header tracking test also passed after adding Opportunities to the tracked home sections.

GitHub, LinkedIn, email and phone remain empty by default. Configured phone values use a validated normalized telephone href. Older snapshots and plain/portable backups without phone or opportunities load successfully. The actual Profile form tests verify validation, saved-draft isolation and explicit publication. Career interests and locations come from the user's explicit instructions and do not claim employment experience. Rejected 3D models and fallback artwork have been removed; missing project media leaves the factual text intact.
