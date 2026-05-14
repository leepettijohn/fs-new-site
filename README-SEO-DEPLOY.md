# Forward Solutions — SEO foundation, May 14, 2026

This zip contains your eight HTML pages with SEO baked in, plus new assets to put at the site root.

## What changed

### Every page (8 of them)

- **Title tag** — updated to topic-first format optimized for search.
- **Meta description** — added everywhere (previously, six of eight pages had none). All descriptions are 150–160 characters.
- **Robots meta** — `index, follow` on seven pages, `noindex, follow` on `/start.html` (it's a conversion endpoint, not search-worthy).
- **Canonical URL** — points to the production URL so search engines treat the Netlify preview URL as a duplicate.
- **Open Graph + Twitter Card tags** — clean previews when shared on social, Slack, iMessage, etc.
- **Favicon links** — point to the new favicon assets in this zip.
- **Phone number in footer** — `(970) 712-6933` added below the email link. Inherits existing footer link styles.

### Structured data (schema.org JSON-LD)

- `/` (home) — **WebSite** + **ProfessionalService** (LocalBusiness) schema. Tells Google this is your brand entity, what you do, where you're based, what you charge, what you know about.
- `/about.html` — **Person** schema for Lee Pettijohn, linked to the business entity.
- `/support.html` — **Service** schema for Forward Support with two **Offer** entries ($79 and $179).
- `/builds.html` — **Service** schema for Simple Builds (one parent service, not five sub-products, per our discussion).
- `/systems.html` — **Service** schema for Complex Systems.
- `/faq.html` — **FAQPage** schema with all 26 Q/A pairs extracted from the page. This is what makes accordion FAQ results possible in Google search.

### New files at the root

- `og-image.png` — 1200×630 social sharing image, brand-colored, with logo, tagline, and pricing.
- `favicon.ico` — multi-size favicon (16/32/48/64).
- `favicon-32x32.png` — PNG fallback.
- `apple-touch-icon.png` — 180×180 iOS home-screen icon.
- `icon-192.png` / `icon-512.png` — PWA icons.
- `site.webmanifest` — web app manifest for proper mobile icon handling.
- `sitemap.xml` — XML sitemap of all 8 pages with priorities and lastmod dates.
- `robots.txt` — allows all crawlers and points to the sitemap.

## How to deploy

1. **Unzip and replace.** Drop every file in this zip into the root of your Netlify GitHub repo, overwriting the existing HTML files. The new asset files (favicon, og-image, sitemap, robots) are additions, not replacements.
2. **Commit and push.** Netlify will redeploy automatically.
3. **Verify.** Open one of the new pages in a browser and view source. You should see all the new `<head>` content. Test the favicon shows in the browser tab. Try sharing the URL in Slack or texting it to yourself — you should see the OG image preview.

## Validation steps (do these once it's live)

1. **Google Rich Results Test** — https://search.google.com/test/rich-results
   - Test the home URL and the FAQ URL. They should show valid `ProfessionalService` and `FAQPage` schema respectively.
2. **OG/Twitter preview** — Paste your home URL into:
   - https://www.opengraph.xyz/ — shows what Slack, Facebook, LinkedIn will render
   - Send yourself a text with the URL to check iMessage rendering
3. **Sitemap reachable** — Visit https://gottamoveforward.com/sitemap.xml. Should show XML.
4. **Robots reachable** — Visit https://gottamoveforward.com/robots.txt. Should show plain text.

## What's NOT in this batch (and what's next)

- **Google Search Console setup** — separate task. Once the site is live, we need to verify ownership and submit the sitemap.
- **Google Business Profile** — wait until closer to the Nashville move.
- **Image alt text audit** — needs a pass once you tell me what images you've got.
- **Internal linking** — strategy locked, tactical pass later.
- **Blog (cluster 4 content)** — content calendar is the next chat.
- **`/nashville` local landing page** — closer to the move in mid-2026.

## A few small things to know

- **Inter font in OG image.** The image preview uses Poppins (visually close to Inter — Inter wasn't available in the generation environment). The image is rasterized so it doesn't matter to the site itself. If you want it re-rendered in Inter exactly, that's a tweak we can do later.
- **No street address in schema.** I used Hermann city + Missouri only. If you want to add a street address (which can help local SEO), edit the `LocalBusiness` block in `index.html` and add a `streetAddress` field to the `PostalAddress` object.
- **`/start.html` is noindex.** This is intentional. It's your conversion page; you don't want it competing with content pages for ranking, and you don't want strangers landing on it cold from Google without context.
- **Don't expect ranking movement for 4–12 weeks.** SEO is slow. Per our agreement, this is 2027 foundation work, not a 2026 revenue lever.
