/** Turn wiki resort names in plain chat text into resort-page links. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.linkResortMentions = api.linkResortMentions;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const REGION = { country: 1, state: 1, continent: 1 };
  const MIN = 4;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function reEsc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function aliases(pages) {
    const byName = new Map();
    for (const p of pages || []) {
      if (!p || !p.pageId || REGION[p.pageType]) continue;
      for (const raw of [p.englishName, p.title, p.name]) {
        const name = String(raw || "").trim();
        if (name.length < MIN) continue;
        const key = name.toLowerCase();
        const prev = byName.get(key);
        if (!prev) byName.set(key, { name, pageId: p.pageId, words: name.split(/\s+/).length });
        else if (prev.pageId !== p.pageId) prev.ambiguous = true;
      }
    }
    return [...byName.values()].filter((a) => !a.ambiguous).sort((a, b) => b.name.length - a.name.length);
  }

  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  /** Small slice of the markdown Nova returns: headings, lists, bold. */
  function renderMarkdown(text) {
    const lines = String(text || "").replace(/\\n/g, "\n").split("\n");
    let html = "";
    let list = null;
    let para = [];
    function closeList() {
      if (list) {
        html += "</" + list + ">";
        list = null;
      }
    }
    function flushPara() {
      if (!para.length) return;
      html += "<p>" + para.map(inline).join("<br>") + "</p>";
      para = [];
    }
    for (const line of lines) {
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      const ol = /^(\d+)\.\s+(.*)$/.exec(line);
      const ul = /^(\s*)[-*]\s+(.*)$/.exec(line);
      if (h) {
        flushPara();
        closeList();
        const tag = h[1].length <= 3 ? "h3" : "h4";
        html += "<" + tag + ">" + inline(h[2]) + "</" + tag + ">";
      } else if (ol) {
        flushPara();
        if (list !== "ol") {
          closeList();
          html += "<ol>";
          list = "ol";
        }
        html += "<li>" + inline(ol[2]) + "</li>";
      } else if (ul) {
        flushPara();
        if (list !== "ul") {
          closeList();
          html += "<ul>";
          list = "ul";
        }
        html += "<li>" + inline(ul[2]) + "</li>";
      } else if (!line.trim()) {
        flushPara();
        closeList();
      } else {
        closeList();
        para.push(line);
      }
    }
    flushPara();
    closeList();
    return html;
  }

  function obviousPlace(text, hit, offset) {
    if (!/^\p{Lu}/u.test(hit)) return false;
    const before = text.slice(Math.max(0, offset - 24), offset);
    const after = text.slice(offset + hit.length, offset + hit.length + 20);
    if (/\b(at|in|near|around|from|visit|visiting)\s+$/i.test(before)) return true;
    if (/^\s+(resort|mountain|slopes)\b/i.test(after)) return true;
    return false;
  }

  function linkHtml(html, pages) {
    const parts = html.split(/(<[^>]+>)/);
    const list = aliases(pages);
    return parts
      .map(function (part, i) {
        if (i % 2) return part;
        let text = part;
        const slots = [];
        for (const a of list) {
          const re = new RegExp("(?<![\\p{L}\\p{N}])" + reEsc(a.name) + "(?![\\p{L}\\p{N}])", "giu");
          text = text.replace(re, function (hit, offset) {
            if (a.words < 2 && !obviousPlace(text, hit, offset)) return hit;
            const n = slots.length;
            slots.push(
              '<a href="/wiki/resort.html?page=' +
                encodeURIComponent(a.pageId) +
                '">' +
                esc(hit) +
                "</a>"
            );
            return "\u0000" + n + "\u0000";
          });
        }
        return text.replace(/\u0000(\d+)\u0000/g, function (_, n) {
          return slots[Number(n)];
        });
      })
      .join("");
  }

  function linkResortMentions(text, pages) {
    return linkHtml(renderMarkdown(text), pages);
  }

  return { linkResortMentions };
});
