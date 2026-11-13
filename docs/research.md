# Design research, 13 November 2026

Visited all four requested references through Chromium, and fetched official documentation before application implementation. Screenshots and extracted page text are private under `.reference-inspection/web/`. They are research material and never deployed.

- [Brittany Chiang](https://brittanychiang.com/): persistent left identity/navigation with a readable right content column, understated navy surfaces, selective mint technology labels, contextual external arrows and a clear skip link. Take the reading discipline and navigational clarity; use our own wide asymmetric hero and project-first composition.
- [Bruno Simon](https://bruno-simon.com/): browser visit succeeded but the initial canvas capture was empty while the experience loaded. The user explicitly rejected a Bruno-like direction. No game or 3D scene is copied; the final design uses editorial typography, the supplied portrait and individual project compositions.
- [Siteinspire](https://www.siteinspire.com/): direct fetch initially rate-limited; Chromium access succeeded. Explored its typographic, portfolio, minimal, grid and unusual-layout categories. The page's useful editorial hierarchy and disciplined gallery navigation inform our work index. No downloaded designs or source copied.
- [Awwwards portfolio gallery](https://www.awwwards.com/websites/portfolio/): studied filter/navigation structure and names of current portfolio examples (Tom de Koning, glinto.kr, Harnish Mistry). The first capture contained unloaded thumbnails, so no visual claims are made about those sites. Gallery presentation reinforces giving each project an individual visual identity rather than identical generic cards.

Original design source: Rahul's actual software, data and research work, interpreted through readable case studies and the provided LinkedIn portrait. The user rejected workflow illustrations and later abstract 3D models; both are removed. No invented product screenshots, statistics or testimonial content.

Official docs checked: [React](https://react.dev/), [Vite guide](https://vite.dev/guide/), [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite), [Motion reduced motion](https://motion.dev/docs/react-accessibility), [React Router declarative installation](https://reactrouter.com/start/declarative/installation), [Lucide React](https://lucide.dev/guide/packages/lucide-react). Use createRoot, Vite's root HTML, the Tailwind v4 Vite plugin and CSS import, MotionConfig/useReducedMotion, declarative routing and statically imported tree-shaken SVG icons. Registry stable tags checked before installing.

The user's requirement overrides the earlier network-related planning gate: network now works, research is recorded and the application proceeds. The actual photo is `reference/Linkedin DP.png`, optimized to an 82KB WebP without identity edits.

## Further visual research and final decisions

Direct Chromium research also visited [Dennis Snellenberg](https://dennissnellenberg.com/) and [Niccolò Miranda](https://www.niccolomiranda.com/), with successful HTTP 200 responses. Private captures/notes live in `.reference-inspection/new-world/`. The useful lessons were dominant identity/portrait, quiet navigation, varied section silhouettes and deliberate mobile reordering. Their layouts, content and artwork were not copied.

The user's latest guidance prioritizes recruiter readability, compact project showcases, separate pages, both themes and purposeful animation. Source Sans 3 Variable 5.3.1 and Space Grotesk Variable 5.3.0 were checked against the npm registry, their OFL-1.1 license declarations and local package contents. Both are self-hosted with only the needed Latin WOFF2 files. Bebas Neue remains the expressive name masthead. Phone and opportunity preferences are now user-provided content fields, validated and editable locally.
