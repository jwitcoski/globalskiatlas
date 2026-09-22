# Frontend UI engineering plan

Restarted after a yes/no pass on the eight problems. **Do not change the menu items.** Header stays **3D maps / Decide / Explore / Contribute / Blog / Book / About**. Hamburger on small screens. No “3D / Map / Drive / More”. No new dropdown groups.

**Status:** decisions locked and implemented. Menu IA frozen as **3D maps / Decide / Explore / Contribute / Blog / Book / About**.

**Stack:** multi-page HTML/CSS/JS. No new libraries. Homepage sprint in `AGENTS.md` still wins on hero/CTA/WebGL. Navy `#1a4d8c`, teal `#0f766e`. No data-model changes. No playable canvas restyle.

---

## Locked decisions (ELI5 → your answer)

| # | In kid words | You said |
|---|---|---|
| 1 | Don’t reprint a different menu after the page loads. Don’t invent a shorter menu either. | **Keep the current menu.** You may still copy *that same* menu into the HTML so the old Atlas/Driving list doesn’t flash first. You may not change labels, order, or grouping. |
| 2 | Make the existing header usable without a mouse (keyboard, bigger tap targets, Escape). | **Yes** |
| 3 | The big homepage line should be a real title (`h1`). | **Yes** |
| 4 | Search should open a **named mountain page**. Only go to the big map if nothing matches. | **Yes** |
| 5 | Stop mixing purple, lime, and Tailwind blue. Navy + teal (trail colors stay). | **Yes** |
| 6 | If someone asked the computer for less motion, don’t animate/smooth-scroll anyway. | **Yes** |
| 7 | Shrink the giant homepage blocks so phones aren’t a long empty scroll. | **Yes** |
| 8 | If search/stats fail, say so on the page, not only in the console. | **Yes** |

Out of scope forever for this plan: flattening nav, auto-rotating the hero, auto-opening the ski game, React/Storybook, 60vh *new* marketing panels.

---

## Visitor journey (unchanged product)

1. Homepage shows **this mountain** (nearest when known; don’t silently swap after first paint).
2. **Open this mountain** → that mountain’s wiki page.
3. Wrong hill → search a name, or closer-mountain control.
4. Later: other named clay hills (dream row is still allowed as a *tap*, not auto-rotate).
5. Tools stay in the **existing** header, not competing with the hero CTA.

---

## What to build (smallest diffs)

### A — Header behavior, not header IA (`site-nav.js`, `header-toggle.js`, `css/index.css`)

- Keep consumer nav copy as it is today in `site-nav.js`.
- Optional small fix: put **that same HTML** in templates so first paint isn’t Atlas/Driving. If you skip the HTML copies, still **do not** rewrite `site-nav.js` into a new IA.
- Keyboard: hover is fine; also open on focus, Escape closes, hamburger `aria-expanded`, 44px hit on the icon.
- Skip link. Teal `:focus-visible`.
- Add `.tw-sr-only` in `css/index.css` (map `h1` was leaking because Tailwind never built that class).

### B — Homepage (`index.html`, `css/index-hero-montage.css`, `scripts/home-search.js`)

- Wrap the hero line in `<h1>`.
- CTA: named mountain URL even with JS off.
- Search: pick → wiki resort; no pick → `mainmap.html?q=`.
- Listbox: empty/error text; `aria-activedescendant`.
- Drop `min-h-[60vh]` on `#paths` and similar homepage slabs.
- Compact dream-mountain row *after* the hero is still in-scope (user-initiated). Do not ship it if it fights the hero; ask before adding if unsure.

### C — Tokens (`css/index.css` then shared sheets)

`--navy`, `--teal`, `--ink`, `--muted`, `--surface`, `--radius`.
Replace `#2563eb`, `#BDB8FF`, `#7c3aed` (wiki lock), `tw-text-blue-600` in blog/map/trip/drive/popups/stats. Do not recolor piste difficulty.

### D — Motion

`prefers-reduced-motion`: no smooth scroll, no GSAP hide-then-reveal on homepage, header width animation off.

### E — Tool empty/error

Map search dropdown: “No matching resorts”. Homepage search: same + catalog-fail line. Wiki browse already has empty copy; don’t invent a component kit.

### F — Playable last

44px overlay buttons already exist; only add reduced-motion on lobby CSS. No marketing cards.

---

## Order

1. `.tw-sr-only` (stop headings sitting on the header).
2. A — keyboard/hamburger/skip; **menu items frozen**.
3. B — h1, search destination, shrink 60vh.
4. C — colors.
5. D — reduced motion.
6. E — empty/error strings.
7. Playable CSS last.

**Dependencies:** none new.

---

## Key files

| Area | Files |
|---|---|
| Nav (don’t change IA) | `scripts/site-nav.js`, `scripts/header-toggle.js`, `css/index.css` |
| Homepage | `index.html`, `css/index-hero-montage.css`, `scripts/home-search.js`, `scripts/hero-montage-map.js` |
| Color | `css/blog.css`, `css/mainmap.css`, `css/map-popups.css`, `css/tripplannermap.css`, `css/drivetimemap.css` |
| Wiki | `wiki/css/style.css` |
| Playable | `playable/index.html` |
