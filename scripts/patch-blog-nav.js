#!/usr/bin/env node
/**
 * Add Blog link to site headers and footers that don't have it yet.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const HEADER_SNIPPET = `<a class="header-links" href="blog/index.html">Blog</a>
        <a class="header-links" href="about.html">About</a>`;

const HEADER_SNIPPET_WIKI = `<a class="header-links" href="../blog/index.html">Blog</a>
        <a class="header-links" href="../about.html">About</a>`;

const FOOTER_SNIPPET = `<a href="blog/index.html" class="footer-link">Blog</a>
                    <a href="about.html" class="footer-link">About</a>`;

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'playable') continue;
      walk(full, files);
    } else if (name.endsWith('.html') && !full.includes(`${path.sep}blog${path.sep}`)) {
      files.push(full);
    }
  }
  return files;
}

let updated = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('blog/index.html')) continue;

  const isWiki = file.includes(`${path.sep}wiki${path.sep}`);
  let changed = false;

  if (isWiki) {
    if (html.includes('href="../about.html">About</a>')) {
      html = html.replace(
        /<a class="header-links" href="\.\.\/about\.html">About<\/a>/,
        HEADER_SNIPPET_WIKI
      );
      changed = true;
    }
  } else {
    if (html.includes('href="about.html">About</a>') && html.includes('header-links')) {
      html = html.replace(
        /<a class="header-links([^"]*)" href="about\.html">About<\/a>/,
        (match, extra) => {
          if (match.includes('blog/index.html')) return match;
          const cls = extra || '';
          return `<a class="header-links" href="blog/index.html">Blog</a>\n        <a class="header-links${cls}" href="about.html">About</a>`;
        }
      );
      changed = true;
    }
    if (html.includes('Resources') && html.includes('footer-link">About</a>')) {
      html = html.replace(
        /<a href="about\.html" class="footer-link">About<\/a>/,
        FOOTER_SNIPPET
      );
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, html, 'utf8');
    console.log('Updated', path.relative(ROOT, file));
    updated++;
  }
}

console.log(`Done. ${updated} file(s) updated.`);
