const PASS_LABEL = {
  epic: 'Epic',
  ikon: 'Ikon',
  indy: 'Indy',
  mountain_collective: 'Mountain Collective'
};

const PASS_SITES = {
  epic: 'https://www.epicpass.com/regions.aspx',
  ikon: 'https://www.ikonpass.com/en/destinations',
  indy: 'https://www.indyskipass.com/our-resorts',
  mountain_collective: 'https://mountaincollective.com/resorts/'
};

const leftEl = document.getElementById('left');
const iframe = document.getElementById('wiki');
const passFrame = document.getElementById('pass-site');
const passTabs = document.getElementById('pass-tabs');
const passOpen = document.getElementById('pass-open');
let activePassKey = '';
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const barEl = document.getElementById('bar');
const progressEl = document.getElementById('progress');
const unmatchedToggle = document.getElementById('only-unmatched');

let queue = [];
let wikiPages = [];
let confirmedKeys = new Set();
let skippedKeys = new Set();
let index = 0;
let selected = null;
let score = 0;
let streak = 0;

function keyOf(item) {
  return item.storm_name + '|' + (item.region || '');
}

function wikiHref(pageId) {
  if (!pageId) return '/wiki/browse.html';
  return '/wiki/resort.html?page=' + encodeURIComponent(pageId);
}

function resolvePageId(item, pick) {
  if (pick?.pageId) return pick.pageId;
  const ws = pick?.winter_sports_id || item.suggested?.winter_sports_id;
  if (ws) {
    const hit = wikiPages.find((p) => String(p.winterSportsId || '') === String(ws));
    if (hit?.pageId) return hit.pageId;
  }
  return pick?.page_id || item.suggested?.page_id || '';
}

function remaining() {
  const preferUnmatched = unmatchedToggle.checked;
  return queue.filter((item) => {
    const k = keyOf(item);
    if (confirmedKeys.has(k) || skippedKeys.has(k)) return false;
    if (preferUnmatched && item.suggested && item.confidence === 'high') return false;
    return true;
  });
}

function currentItem() {
  const list = remaining();
  if (!list.length) return null;
  if (index >= list.length) index = 0;
  return list[index];
}

function render() {
  const total = queue.length;
  const done = confirmedKeys.size;
  const item = currentItem();
  progressEl.textContent = done + ' / ' + total + ' confirmed';
  barEl.style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
  scoreEl.textContent = score + ' pts';
  streakEl.textContent = streak ? streak + ' streak' : '';

  if (!item) {
    leftEl.innerHTML = '<div class="empty"><h2>Queue clear</h2><p class="muted">Every Storm partner is confirmed or skipped.</p></div>';
    iframe.src = '/wiki/browse.html';
    setPassSite([]);
    return;
  }

  const pills = (item.passes || [])
    .map((p) => '<span class="pill ' + p + '">' + (PASS_LABEL[p] || p) + '</span>')
    .join('') || '<span class="pill">No national pass</span>';

  const pageId = resolvePageId(item, selected);
  const atlasLabel = selected?.atlas_name || selected?.title || item.suggested?.atlas_name || 'No match — browse the atlas';
  const conf = item.suggested ? item.status + ' · ' + item.confidence : 'unmatched';

  leftEl.innerHTML = `
    <div class="card">
      <p class="muted">Storm roster</p>
      <h1 class="storm-name">${esc(item.storm_name)}</h1>
      <div class="pass-pills">${pills}</div>
      <p class="muted" style="margin-top:10px">${esc(item.region || '')}</p>
    </div>
    <div class="card">
      <p class="muted">Atlas / wiki pick · ${esc(conf)}</p>
      <p><strong>${esc(atlasLabel)}</strong></p>
      <input type="search" id="wiki-search" placeholder="Search wiki to pick a different resort" autocomplete="off" />
      <ul class="hits" id="hits"></ul>
    </div>
    <div class="actions">
      <button class="confirm" id="confirm" ${pageId ? '' : 'disabled'}>Confirm match</button>
      <button class="wrong" id="wrong" type="button">Not this one</button>
      <button class="skip" id="skip" type="button">Skip</button>
    </div>
    <p class="muted">${remaining().length} left this filter</p>
  `;

  iframe.src = wikiHref(pageId);
  setPassSite(item.passes || []);

  const search = leftEl.querySelector('#wiki-search');
  const hitsEl = leftEl.querySelector('#hits');
  search.addEventListener('input', () => showHits(search.value, hitsEl, item));
  leftEl.querySelector('#confirm').addEventListener('click', () => confirmItem(item, pageId));
  leftEl.querySelector('#skip').addEventListener('click', () => skipItem(item));
  leftEl.querySelector('#wrong').addEventListener('click', () => {
    selected = { pageId: '', atlas_name: '', winter_sports_id: '' };
    iframe.src = '/wiki/browse.html';
    search.focus();
    leftEl.querySelector('#confirm').disabled = true;
  });
}

function showHits(q, hitsEl, item) {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) {
    hitsEl.innerHTML = '';
    return;
  }
  const rows = wikiPages
    .filter((p) => p.pageType === 'resort' || !p.pageType)
    .filter((p) => {
      const blob = [p.title, p.englishName, p.country, p.state, p.pageId].join(' ').toLowerCase();
      return blob.includes(needle);
    })
    .slice(0, 12);
  hitsEl.innerHTML = rows
    .map(
      (p, i) =>
        `<li data-i="${i}">${esc(p.englishName || p.title || p.pageId)} <span class="muted">${esc((p.state || p.country || '') + '')}</span></li>`
    )
    .join('');
  hitsEl.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => {
      const p = rows[Number(li.dataset.i)];
      selected = {
        pageId: p.pageId,
        atlas_name: p.englishName || p.title || p.pageId,
        winter_sports_id: p.winterSportsId || ''
      };
      render();
    });
  });
}

function setPassSite(passes) {
  const keys = (passes || []).filter((p) => PASS_SITES[p]);
  if (!keys.length) {
    passTabs.innerHTML = '';
    activePassKey = '';
    passOpen.href = '#';
    passOpen.style.visibility = 'hidden';
    if (passFrame.src !== 'about:blank') passFrame.src = 'about:blank';
    return;
  }
  passOpen.style.visibility = 'visible';
  if (!keys.includes(activePassKey)) activePassKey = keys[0];
  passTabs.innerHTML = keys
    .map(
      (k) =>
        `<button type="button" class="${k === activePassKey ? 'on' : ''}" data-pass="${k}">${PASS_LABEL[k] || k}</button>`
    )
    .join('');
  passTabs.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      activePassKey = btn.getAttribute('data-pass');
      loadPassUrl(PASS_SITES[activePassKey]);
      passTabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === btn));
    });
  });
  loadPassUrl(PASS_SITES[activePassKey]);
}

function loadPassUrl(url) {
  passOpen.href = url;
  try {
    const current = passFrame.contentWindow && passFrame.contentWindow.location.href;
    if (current === url) return;
  } catch {
    /* cross-origin: compare src attribute */
  }
  if (passFrame.getAttribute('src') === url) return;
  passFrame.src = url;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function confirmItem(item, pageId) {
  const atlas_name = selected?.atlas_name || item.suggested?.atlas_name;
  if (!atlas_name) return;
  const res = await fetch('/api/pass-review/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storm_name: item.storm_name,
      atlas_name,
      pass: (item.passes || []).join(','),
      passes: item.passes || [],
      region: item.region,
      winter_sports_id: selected?.winter_sports_id || item.suggested?.winter_sports_id || '',
      page_id: pageId
    })
  });
  if (!res.ok) {
    alert('Could not save confirm');
    return;
  }
  confirmedKeys.add(keyOf(item));
  score += item.suggested && !selected?.pageId ? 10 : 15;
  streak += 1;
  selected = null;
  render();
}

async function skipItem(item) {
  await fetch('/api/pass-review/skip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storm_name: item.storm_name,
      region: item.region,
      pass: (item.passes || []).join(',')
    })
  });
  skippedKeys.add(keyOf(item));
  streak = 0;
  selected = null;
  render();
}

unmatchedToggle.addEventListener('change', () => {
  index = 0;
  selected = null;
  render();
});

const [queueRes, wikiRes] = await Promise.all([
  fetch('/api/pass-review/queue'),
  fetch('/api/wiki/index')
]);
if (!queueRes.ok) {
  leftEl.innerHTML = '<p class="empty">Run <code>node scripts/join-pass-affiliations.mjs</code> then restart the server.</p>';
  throw new Error('no queue');
}
const data = await queueRes.json();
queue = data.items || [];
(data.confirmed || []).forEach((r) => {
  if (r.action === 'confirm') confirmedKeys.add(r.storm_name + '|' + (r.region || ''));
});
(data.skipped || []).forEach((k) => skippedKeys.add(k));
wikiPages = ((await wikiRes.json()).pages || []).filter((p) => p.pageType !== 'continent');
render();
