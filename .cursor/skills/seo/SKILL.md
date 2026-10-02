---
name: seo
description: Makes Global Ski Atlas fact pages the citable answer for atlas and world-record questions (longest ski trail, largest ski resort, northernmost lift). Use when the user says /seo, or edits SkiResortFacts.html, SkiTrailFacts.html, SkiLiftFacts.html, or asks those pages to rank in Google or AI search.
---

# Factoid SEO

These pages answer the questions an atlas or record book answers. Rankings follow a sentence a crawler can quote, tied to the parquet extract, not a widget that paints "—" until JavaScript runs.

## Do this on each fact page

1. **Title and meta description are the question plus the measured answer.** One primary question in `<title>` (under ~60 characters before the site name). Description states the record, the unit, and that the figure comes from the mapped extract.
2. **One `<h1>` is that question.** Each other record is an `<h2>` phrased as the question people type ("What is the longest ski lift in the world?").
3. **The answer sentence is in the initial HTML**, in the element the page already updates (`fact-*-name` / `fact-*-desc`). Include the name, the number, the unit, and the place. JavaScript may replace it when the extract loads. Do not leave "—" as the only text.
4. **Name the measurement** in that sentence: which column, which file (`ski_areas_analyzed.parquet`, `pistes.parquet`, or `lifts.parquet`), and the filter (downhill resort, named piste, lift type). A record without a denominator is not citable.
5. **One JSON-LD `@graph`**: `TechArticle`, `Dataset` (same URL as the parquet), `BreadcrumbList` (Home → Statistics → this page). No `FAQPage`, `HowTo`, `SpecialAnnouncement`, or `ClaimReview`.
6. **Point `llms.txt` at the question**, not "aggregate statistics". One line per page: the question, the URL, the file the answer comes from.

## Do not

- Invent a record holder. If the extract is not in the repo, keep the previous snapshot sentence or say the value loads from the extract. Never guess a name or a length.
- Add a second page for the same question. One URL owns one primary question; sibling records stay as `<h2>` sections on that page.
- Repeat the same exact-match anchor more than three times sitewide.
- Paste 800 words of filler under the widget. A short method paragraph under the `<h1>` is enough if each record section already states its answer.

## Check

View source (not the live DOM). Every `<h2>` question has a name and a number in the HTML that follows it. The JSON-LD `Dataset` `distribution` URL is the parquet the page actually reads.
