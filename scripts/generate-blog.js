#!/usr/bin/env node
/**
 * Generate blog/index.html and blog/<slug>.html from blog/posts.json + blog/content/*.md
 *
 * Usage: node scripts/generate-blog.js
 */
const fs = require('fs');
const path = require('path');
const showdown = require('showdown');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'blog');
const CONTENT_DIR = path.join(BLOG_DIR, 'content');
const POSTS_JSON = path.join(BLOG_DIR, 'posts.json');

const converter = new showdown.Converter({
  tables: true,
  strikethrough: true,
  simplifiedAutoLink: true,
  openLinksInNewWindow: true,
  ghCompatibleHeaderId: true,
  headerLevelStart: 2,
});

const ADS = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282" crossorigin="anonymous"></script>`;

const GA = `<!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-KJGNL3KJL0"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-KJGNL3KJL0');
  </script>`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function siteHeader(activeBlog) {
  const blogClass = activeBlog ? ' tw-font-semibold' : '';
  return `<header
    class="tw-absolute tw-top-0 tw-z-[100] tw-flex tw-h-[60px] tw-w-full tw-bg-opacity-0
           tw-px-[5%] max-lg:tw-mr-auto max-lg:tw-px-4 lg:tw-justify-around"
  >
    <a class="tw-h-[50px] tw-w-[50px] tw-p-[4px]" href="../index.html" aria-label="Global Ski Atlas home">
      <img src="../assets/logo.png?v=2" alt="Global Ski Atlas" class="tw-object tw-h-full tw-w-full" />
    </a>
    <div class="collapsible-header animated-collapse max-lg:tw-shadow-md" id="collapsed-header-items">
      <div
        class="header-nav-inner tw-flex tw-h-full tw-w-max tw-flex-wrap tw-gap-5 tw-text-base tw-text-black
               max-lg:tw-mt-[30px] max-lg:tw-flex-col max-lg:tw-place-items-end
               max-lg:tw-gap-5 lg:tw-mx-auto lg:tw-place-items-center"
      >
        <div class="header-dropdown-group">
          <a class="header-tab header-links" href="../mainmap.html" aria-haspopup="true">Atlas <i class="bi bi-chevron-down tw-text-xs"></i></a>
          <div class="header-dropdown" role="menu">
            <a class="header-links" href="../coffee-table-book.html" role="menuitem">Coffee Table Book</a>
            <a class="header-links" href="../bookpitch.html" role="menuitem">Book pitch</a>
            <a class="header-links" href="../mainmap.html" role="menuitem">Interactive Map</a>
            <a class="header-links" href="../wiki/browse.html" role="menuitem">Online Atlas</a>
          </div>
        </div>
        <div class="header-dropdown-group">
          <a class="header-tab header-links" href="../TripPlannerMap.html" aria-haspopup="true">Driving <i class="bi bi-chevron-down tw-text-xs"></i></a>
          <div class="header-dropdown" role="menu">
            <a class="header-links" href="../TripPlannerMap.html" role="menuitem">Trip Planner</a>
            <a class="header-links" href="../DriveTimeMap.html" role="menuitem">Drive Time</a>
          </div>
        </div>
        <div class="header-dropdown-group">
          <a class="header-tab header-links" href="../SkiResortFacts.html" aria-haspopup="true">Statistics <i class="bi bi-chevron-down tw-text-xs"></i></a>
          <div class="header-dropdown" role="menu">
            <a class="header-links" href="../SkiResortFacts.html" role="menuitem">Resort Facts</a>
            <a class="header-links" href="../SkiTrailFacts.html" role="menuitem">Trail Facts</a>
            <a class="header-links" href="../SkiLiftFacts.html" role="menuitem">Lift Facts</a>
          </div>
        </div>
        <div class="header-dropdown-group">
          <a class="header-tab header-links" href="../resort-comparison.html" aria-haspopup="true">Compare <i class="bi bi-chevron-down tw-text-xs"></i></a>
          <div class="header-dropdown" role="menu">
            <a class="header-links" href="../resort-comparison.html" role="menuitem">Resort Comparison</a>
            <a class="header-links" href="../resort-tier-rank.html" role="menuitem">Tier Ranking</a>
          </div>
        </div>
        <a class="header-links" href="../weather-map.html">Weather</a>
        <a class="header-links" href="/playable/">Ski Game</a>
        <a class="header-links" href="../skiing-ai.html">AI Assistant</a>
        <a class="header-links${blogClass}" href="index.html">Blog</a>
        <a class="header-links" href="../about.html">About</a>
      </div>
    </div>
    <button
      class="bi bi-list tw-absolute tw-right-3 tw-top-3 tw-z-50 tw-text-3xl
             tw-text-black lg:tw-hidden"
      onclick="toggleHeader()"
      aria-label="menu"
      id="collapse-btn"
    ></button>
  </header>`;
}

function siteFooter() {
  return `<footer
    class="tw-mt-auto tw-flex tw-w-full tw-place-content-around tw-gap-3 tw-border-t tw-border-gray-200
           tw-bg-gray-50 tw-py-6 tw-px-[10%] tw-text-black max-md:tw-flex-col"
  >
    <div class="tw-flex tw-h-full tw-w-[250px] tw-flex-col tw-place-items-center tw-gap-6 max-md:tw-w-full">
      <img src="../assets/logo.png?v=2" alt="Global Ski Atlas" class="tw-max-w-[120px]" />
      <div>Global Ski Atlas</div>
      <div class="tw-mt-3 tw-text-lg tw-font-semibold">Follow us</div>
      <div class="tw-flex tw-gap-4 tw-text-2xl">
        <a href="javascript:void(0)" aria-label="Facebook" title="Coming soon"><i class="bi bi-facebook"></i></a>
        <a href="https://twitter.com/@pauls_freeman" aria-label="Twitter"><i class="bi bi-twitter"></i></a>
        <a href="https://instagram.com/" class="tw-h-[40px] tw-w-[40px]" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
      </div>
    </div>
    <div class="tw-flex tw-h-full tw-w-[250px] tw-flex-col tw-gap-4">
      <h2 class="tw-text-3xl max-md:tw-text-xl">Explore</h2>
      <div class="tw-flex tw-flex-col tw-gap-3 max-md:tw-text-sm">
        <a href="../coffee-table-book.html" class="footer-link">Coffee Table Book</a>
        <a href="../mainmap.html" class="footer-link">Interactive Map</a>
        <a href="../resort-comparison.html" class="footer-link">Compare Resorts</a>
        <a href="/playable/" class="footer-link">Ski Game</a>
        <a href="../skiing-ai.html" class="footer-link">AI Assistant</a>
      </div>
    </div>
    <div class="tw-flex tw-h-full tw-w-[250px] tw-flex-col tw-gap-4">
      <h2 class="tw-text-3xl max-md:tw-text-xl">Download Parquet Data</h2>
      <div class="tw-flex tw-flex-col tw-gap-3 max-md:tw-text-sm">
        <a href="../DownloadData.html" class="footer-link tw-inline-flex tw-items-center tw-gap-1">Data downloads &amp; how we create it <i class="bi bi-arrow-right tw-text-sm"></i></a>
      </div>
    </div>
    <div class="tw-flex tw-h-full tw-w-[250px] tw-flex-col tw-gap-4">
      <h2 class="tw-text-3xl max-md:tw-text-xl">Resources</h2>
      <div class="tw-flex tw-flex-col tw-gap-3 max-md:tw-text-sm">
        <a href="index.html" class="footer-link">Blog</a>
        <a href="../about.html" class="footer-link">About</a>
        <a href="../faq.html" class="footer-link">FAQ</a>
        <a href="../privacy-policy.html" class="footer-link">Privacy Policy</a>
      </div>
    </div>
  </footer>`;
}

function headBlock({ title, description, canonical, type }) {
  const ogType = type || 'article';
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${GA}
  ${ADS}
  <title>${escapeHtml(title)} – Global Ski Atlas Blog</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)} – Global Ski Atlas" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="https://globalskiatlas.com/assets/og-banner.png" />
  <meta property="og:site_name" content="Global Ski Atlas" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://globalskiatlas.com/assets/og-banner.png" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="shortcut icon" href="../assets/logo.png?v=2" type="image/x-icon" />
  <link rel="stylesheet" href="../css/tailwind-build.css" />
  <link rel="stylesheet" href="../css/index.css" />
  <link rel="stylesheet" href="../css/blog.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" integrity="sha512-dPXYcDub/aeb08c63jRq/k6GaKccl256JQy/AnOq7CAnEZ9FzSL9wSbcZkMp4R26vBsMLFYH4kQ67/bbV8XaCQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />`;
}

function relatedBlock(post, bySlug) {
  const links = (post.related || [])
    .map((slug) => bySlug[slug])
    .filter(Boolean);
  if (!links.length) return '';
  const items = links
    .map((p) => `<li><a href="${p.slug}.html">${escapeHtml(p.title)}</a></li>`)
    .join('\n            ');
  return `<section class="blog-related" aria-label="Related articles">
          <h2 class="tw-text-xl tw-font-semibold tw-text-black">Related articles</h2>
          <ul class="tw-mt-4">${items}</ul>
        </section>`;
}

function generatePostHtml(post, bodyHtml, bySlug) {
  const canonical = `https://globalskiatlas.com/blog/${post.slug}.html`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Global Ski Atlas' },
    publisher: {
      '@type': 'Organization',
      name: 'Global Ski Atlas',
      logo: { '@type': 'ImageObject', url: 'https://globalskiatlas.com/assets/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    image: 'https://globalskiatlas.com/assets/og-banner.png',
  };

  return `<!doctype html>
<html lang="en">
<head>
  ${headBlock({ title: post.title, description: post.description, canonical })}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="tw-flex tw-min-h-[100vh] tw-flex-col tw-bg-[#fff] tw-overflow-x-hidden">
  ${siteHeader(true)}
  <main class="tw-mt-[80px] tw-flex-1 tw-px-[5%] tw-py-12 max-lg:tw-px-4">
    <article class="tw-mx-auto tw-max-w-3xl">
      <p class="blog-pillar">${escapeHtml(post.pillar)}</p>
      <h1 class="tw-mt-2 tw-text-3xl tw-font-bold tw-text-black max-md:tw-text-2xl">${escapeHtml(post.title)}</h1>
      <p class="blog-meta tw-mt-3">${formatDate(post.date)} · ${post.readTime} min read</p>
      <p class="tw-mt-4 tw-text-lg tw-leading-relaxed tw-text-gray-600">${escapeHtml(post.description)}</p>
      <div class="blog-prose tw-mt-8">${bodyHtml}</div>
      ${relatedBlock(post, bySlug)}
      <p class="tw-mt-10 tw-text-sm tw-text-gray-500"><a href="index.html" class="tw-text-blue-600 hover:tw-underline">← Back to all articles</a></p>
    </article>
  </main>
  ${siteFooter()}
  <script src="../index.js"></script>
</body>
</html>
`;
}

function generateIndexHtml(posts) {
  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = posts.filter((p) => p.slug !== featured.slug);
  const featuredCard = `<a href="${featured.slug}.html" class="blog-card tw-block tw-no-underline tw-text-inherit md:tw-col-span-2">
        <span class="blog-pillar">Featured · ${escapeHtml(featured.pillar)}</span>
        <h2 class="tw-text-2xl tw-font-semibold tw-text-black">${escapeHtml(featured.title)}</h2>
        <p class="tw-text-gray-600">${escapeHtml(featured.description)}</p>
        <span class="blog-meta">${formatDate(featured.date)} · ${featured.readTime} min read</span>
      </a>`;
  const cards = rest
    .map(
      (p) => `<a href="${p.slug}.html" class="blog-card tw-block tw-no-underline tw-text-inherit">
        <span class="blog-pillar">${escapeHtml(p.pillar)}</span>
        <h2 class="tw-text-xl tw-font-semibold tw-text-black">${escapeHtml(p.title)}</h2>
        <p class="tw-text-gray-600 tw-text-base">${escapeHtml(p.description)}</p>
        <span class="blog-meta">${formatDate(p.date)} · ${p.readTime} min read</span>
      </a>`
    )
    .join('\n      ');

  const canonical = 'https://globalskiatlas.com/blog/index.html';
  return `<!doctype html>
<html lang="en">
<head>
  ${headBlock({
    title: 'Blog',
    description: 'Guides, data analysis, and open-data tips for skiers — from the team building the worldwide Global Ski Atlas.',
    canonical,
    type: 'website',
  })}
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Global Ski Atlas Blog',
    url: canonical,
    description: 'Guides, data analysis, and open-data tips for skiers.',
    publisher: { '@type': 'Organization', name: 'Global Ski Atlas' },
  })}</script>
</head>
<body class="tw-flex tw-min-h-[100vh] tw-flex-col tw-bg-[#fff] tw-overflow-x-hidden">
  ${siteHeader(true)}
  <main class="tw-mt-[80px] tw-flex-1 tw-px-[5%] tw-py-12 max-lg:tw-px-4">
    <div class="tw-mx-auto tw-max-w-5xl">
      <h1 class="tw-text-3xl tw-font-bold tw-text-black max-md:tw-text-2xl">Blog</h1>
      <p class="tw-mt-3 tw-max-w-2xl tw-text-lg tw-text-gray-600">Guides and data-backed articles for skiers who want to compare resorts fairly, plan trips, and improve the open map data behind the atlas. Each article follows a five-paragraph essay format: introduction, three supporting points, and conclusion.</p>
      <div class="tw-mt-10 tw-grid tw-gap-6 md:tw-grid-cols-2">
      ${featuredCard}
      ${cards}
      </div>
    </div>
  </main>
  ${siteFooter()}
  <script src="../index.js"></script>
</body>
</html>
`;
}

function main() {
  const posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8'));
  const bySlug = Object.fromEntries(posts.map((p) => [p.slug, p]));

  for (const post of posts) {
    const mdPath = path.join(CONTENT_DIR, `${post.slug}.md`);
    if (!fs.existsSync(mdPath)) {
      console.error(`Missing content: ${mdPath}`);
      process.exit(1);
    }
    const md = fs.readFileSync(mdPath, 'utf8');
    const bodyHtml = converter.makeHtml(md);
    const html = generatePostHtml(post, bodyHtml, bySlug);
    const outPath = path.join(BLOG_DIR, `${post.slug}.html`);
    fs.writeFileSync(outPath, html, 'utf8');
    console.log('Wrote', path.relative(ROOT, outPath));
  }

  const indexHtml = generateIndexHtml(posts);
  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexHtml, 'utf8');
  console.log('Wrote blog/index.html');
}

main();
