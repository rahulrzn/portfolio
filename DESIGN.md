# Rahul Reji R. — personal engineering portfolio

The public site combines a memorable editorial introduction with readable engineering evidence. The user requested bold mixed-color text, a large header, dark and light modes, compact projects and distinct pages suitable for recruiters. Workflow diagrams and abstract 3D models were explicitly rejected and removed.

## Color and type

Light mode is the default for the public portfolio and admin. A saved theme choice takes precedence; dark mode remains available through the public theme toggle. The admin uses matching light surfaces, readable dark text and teal actions, including its dialogs, notifications and mobile navigation.

| Role             | Dark      | Light     |
| ---------------- | --------- | --------- |
| Canvas           | `#171918` | `#f2f1eb` |
| Primary text     | `#eff1eb` | `#20332b` |
| Supporting text  | `#c6d0c8` | `#43543f` |
| Blue accent      | `#a9bcff` | `#294cc4` |
| Violet accent    | `#c5a3ff` | `#704a91` |
| About surface    | `#222c24` | `#dde6cf` |
| Research surface | `#302843` | `#e6dff2` |

Source Sans 3 Variable carries body copy and controls. Space Grotesk Variable carries headings and the header identity. Bebas Neue is reserved for the oversized name masthead and selected display elements. Fonts are self-hosted, loaded with `font-display: swap`, and use the Latin WOFF2 subsets. Body copy is 18px on desktop and 17px on phones; project metadata and technologies use 13–15px. Prose stays within 65–72 characters, with approximately 1.7–1.8 line height. Small screen titles remain readable and restrained; projects use 26–28px titles.

## Composition and navigation

The homepage opens with a full-width multicolor name masthead, followed by a central portrait collage, clear introduction, accessible résumé action and bold editorial headline. This substantially replaces the discarded split heading/photo arrangement.

Projects use compact aligned rows: identity and project context on the left, concise description, technologies and case-study/demo/repository links on the right. On phones these become one reading column. All technologies remain available. No filler cover art occupies space; validated uploaded project images are optional and failed images collapse cleanly.

About has a green surface, framed portrait, readable biography and education spread. Skills has a categorized two-column directory that becomes a single column on phones. Research has a contrasting plum/lavender title treatment and a readable publication narrative. Contact has a direct invitation, contact details and clearly labeled form. These routes are separate and remain part of the same visual identity. Legacy homepage section bookmarks continue to work.

Open to Opportunities is a full-width blue-toned passage near Contact and beneath About. Its heading, quiet availability dot, career-interest list, ordered location priorities and clear contact CTA present the user's actual preferences. It is content rather than another generic card; its text, lists and visibility are managed through Admin → Profile. Configured social/email/phone links appear in the hero, biography, contact information and footer, with no invented placeholders.

The large sticky header keeps a visible RR monogram, readable name, theme toggle and navigation. Exactly one navigation item is current. On the homepage it follows the visible section, including when content loads lazily; on dedicated pages it follows the route. Phone navigation expands below the header and supports Escape, focus restoration and accessible current-page state.

## Motion and accessibility

Motion authors the masthead/portrait entrance, responsive portrait interaction, page introductions, shared active-navigation marker, theme icon transition, mobile disclosure and project filtering. Native skill disclosures animate their height where supported. Links provide clear hover and keyboard focus feedback. No looping scenery, scroll hijacking, random 3D artwork or required hover interaction. Reduced motion removes transform/layout transitions and CSS disclosure animation.

Touch actions are at least 44px tall. Both palettes are reviewed at desktop, tablet and phone widths, with automated WCAG checks and long validated content tests. Focus, selection, caret and scrollbars use the palette. Default content fits 320px; mobile form inputs are at least 16px to avoid automatic zoom.

## Content and architecture

Use only the actual supplied portrait and validated admin-selected images. Keep missing contact/repository/publication information empty until supplied. Résumé outcomes retain their evaluation context and limitations. No original résumé PDFs are deployed. Public content comes through the replaceable repository and safe validated snapshot; draft edits do not change the published view. Admin retains its separate task-oriented layout and local development gate.

Three.js and its assets were removed at the user's request. The portfolio is frontend-only and builds to `dist` for Cloudflare Pages. Screenshots in `docs/screenshots/` and Playwright checks in `e2e/` record the rendered design and behavior.
