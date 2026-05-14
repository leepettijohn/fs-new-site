# Forward Solutions — Site Draft v1

Static HTML site for gottamoveforward.com. Drop the folder on Netlify (or any static host) and it works.

## Files

- `index.html` — homepage
- `support.html` — Forward Support membership page
- `builds.html` — Simple Builds catalog
- `systems.html` — Complex Systems page
- `work.html` — case studies index
- `about.html` — about Lee
- `start.html` — intake form + book-a-call page
- `styles.css` — single stylesheet for all pages
- `script.js` — minimal JS for scroll-triggered reveals only

No build step. No dependencies beyond the Google Fonts CDN.

## To view locally

Open `index.html` in a browser directly, or run a quick server from the folder:
```
python3 -m http.server 8080
```
then visit http://localhost:8080

## To deploy to Netlify

Drag the whole folder onto netlify.com, or connect a Git repo. That's it.

## What's stubbed and needs replacing before launch

1. **Real photos of Lee** — currently using SVG placeholders. The brand doc rules apply: natural light, no power poses.

2. **Real Stay Inn screenshots** — currently using a CSS-built mockup of a Stacker-style dashboard. Replace with actual screenshots from the BBIM app.

3. **Hero illustration** — currently a clean SVG of nine tiles animating from scattered to grid. This works as a placeholder and is on-brand, but at some point may want a hand-drawn custom illustration (per the brand doc's "custom illustration, no faces, brand blues only" rule).

4. **Calendar embed on `/start`** — there's a dashed placeholder box. Drop in your Cal.com / Calendly / Google Appointment Schedule embed code where indicated.

5. **Intake form submission** — currently posts nowhere (form.preventDefault on the start page). Wire up to Netlify Forms (easy, free) or POST to an Airtable base via a serverless function.

6. **Case studies on `/work`** — Stay Inn has a "Read the story →" link that goes nowhere yet. The two greyed-out cards (Quality Drywall, Rain or Shine) are placeholders.

7. **Logo mark** — using a placeholder "arrow in a circle" SVG. Drop in your real logo when ready.

## Design notes

- Fonts: Inter (body) + Fraunces (display headlines). Both from Google Fonts.
- Colors are exactly the brand-doc palette.
- Animation discipline: hero "scattered-to-grid" on load + subtle fade-in-on-scroll. Nothing else moves.
- Signal Amber appears only on primary CTAs.
- All sections respect `prefers-reduced-motion`.

## What to test before launch

- Mobile (the layouts collapse cleanly under 900px and again under 560px, but real-device testing is worth 30 minutes).
- The form actually submitting to your chosen backend.
- The calendar embed.
- The "Read the story" link on /work going somewhere real.
