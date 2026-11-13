# Design and implementation direction

**Historical plan — visual direction superseded.** The user rejected this original diagram-led design. `../DESIGN.md` and `redesign-direction.md` describe the completed replacement: supplied portrait, oversized Manrope/Instrument Serif lettering and typographic project covers. Network access was subsequently enabled and research completed; see `research.md`. Architecture and privacy principles below remain applicable.

The brief pins the visual world: “premium editorial developer portfolio,” “refined dark navy visual identity,” and a “visually distinctive, not a generic centered template” hero. Execute this directly. The user explicitly requests the complete frontend now; further approval gates must not delay authorized implementation.

## Visual direction
An engineering folio: large left-aligned Manrope typography, a compact personal wordmark, spacious navy surfaces, and bespoke geometric diagrams derived from the actual data and AI projects. A portrait, when supplied, anchors the right side of an asymmetric hero. Until then use a typographic identity composition, never a replacement face. Project visuals are identified as workflow illustrations, never screenshots. A quiet blue secondary accent distinguishes data processing from mint interaction states.

Palette: ink `#0B1220`, panel `#0F1929`, elevated `#172338`, foreground `#E2E8F0`, secondary `#A3B1C6`, mint `#5EEAD4`. Thin low-contrast rules, generous whitespace, 4px spacing grid, controlled widths; display tracking no tighter than -0.04em. Body and metadata remain readable.

```
wordmark                  navigation / resume
────────────────────────────────────────────
Rahul Reji R.             actual portrait or
large editorial           identity composition
introduction              project-derived geometry
project + resume actions
────────────────────────────────────────────
Selected work             project-specific diagrams
About / education         structured skills
Research                  Contact
```

The memorable element is the featured Soho Suite data-flow visual: the Bronze–Silver–Gold workflow becomes the visual language of the site. Supporting projects use their own classification and retrieval geometries. Favor crisp SVG geometry over WebGL: the supplied work benefits from legible diagrams, and Three.js would add weight without improving understanding. The original request says selectively Three.js, so omission is a deliberate performance choice.

Considered alternatives: a conventional split sidebar portfolio (strong reading, too close to Brittany Chiang); a cinematic 3D environment (memorable, weak evidence/performance tradeoff); this asymmetric engineering folio (original project-led visual treatment, accessible and lightweight). The latter is the implementation choice under the supplied brief.

Admin uses a precise task-oriented sidebar layout with a distinct lighter navy surface, persistent local-only notice, clear save/preview/publish actions, ordinary labeled inputs, and useful empty states. Destructive actions use native focus-managed dialogs. Public routes never advertise admin access.

Motion: one staggered hero entrance, small project image/arrow responses, restrained viewport reveals, menu/dialog transitions. MotionConfig reducedMotion="user", CSS reduced-motion overrides, no scroll hijacking, no perpetual heavy animation. Defaults must remain visible.

## Research gate
Live access to all requested reference sites and documentation was attempted before implementation, but outbound network is blocked by sandbox policy (WinError 10013 / EACCES). Network access has been requested. Do not claim research was completed while this remains blocked. Record actual findings in `docs/research.md` once accessible. The supplied reference descriptions can inform planning, but are not evidence of a live visit.

## Data and privacy
React components consume a typed repository/context, never localStorage directly. A versioned Zod envelope holds separate draft and published snapshots, stable IDs, revisions and real edit activity. Validate every read, save and import. Keep a last valid backup and preserve corrupt raw content before replacement. Handle unavailable storage without crashing public routes. Image blobs go to IndexedDB with MIME, byte and dimension limits; backups include portable images without storing Base64 in localStorage. Strict content fields only, no arbitrary HTML. URLs allow HTTP(S) and reject credentials and unsafe schemes.

Login is an explicitly non-secure local development workspace gate, with an arbitrary user-entered session phrase for the requested password interaction, no hardcoded password or credentials. There is no privacy or authorization claim. Gate/session state is in memory and separate from content.

Original resume PDFs stay private. Generate a clean downloadable resume from published, validated content at runtime, containing only verified and user-published details. An optional validated external/public resume reference can replace it. Do not deploy original reference PDFs.
