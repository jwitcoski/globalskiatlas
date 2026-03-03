var YWIKI_PATH = (function () {
  var p = new URLSearchParams(window.location.search).get('page') || '';
  if (!p) { window.location.replace('/wiki/browse.html'); }
  return p;
}());

function renderFromMarkdown(text) {
  var target = document.querySelector('.js-resort-body');
  if (!target) return;

  var converter = new showdown.Converter();
  var html = converter.makeHtml(text || '');
  target.innerHTML = html;

  var firstP = target.querySelector('p');
  if (firstP) firstP.classList.add('resort-body-first');
}

function run() {
  var text = document.getElementById('sourceTA').value || '';
  renderFromMarkdown(text);
}

async function saveEntry() {
  var textarea = document.getElementById('sourceTA');
  var commentInput = document.getElementById('revision-comment');
  if (!textarea) return;

  var content = textarea.value || '';
  var comment = commentInput ? (commentInput.value || '').trim() : '';
  if (!comment) {
    alert('Revision comment is required. Describe what you changed.');
    if (commentInput) commentInput.focus();
    return;
  }

  var titleEl = document.querySelector('.resort-title');
  var title = titleEl ? titleEl.textContent.trim() : YWIKI_PATH;

  var user = (window.ywikiAuth && typeof ywikiAuth.getUser === 'function')
    ? (ywikiAuth.getUser() || '')
    : '';

  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function')
    ? ywikiAuth.getToken()
    : null;

  var body = {
    path: YWIKI_PATH,
    title: title,
    user: user || 'anonymous',
    content: content,
    comment: comment
  };

  var headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    var resp = await fetch('/wiki', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (resp.ok) {
      if (resp.status === 202) {
        alert('Proposed. Pending accept/reject.');
        loadRevisions();
        loadComments();
        if (commentInput) commentInput.value = '';
      } else {
        alert('Saved!');
        loadRevisions();
        loadEntry();
        loadComments();
        if (commentInput) commentInput.value = '';
      }
    } else if (resp.status === 401) {
      alert('Sign in required to save changes.');
    } else if (resp.status === 400) {
      var err = await resp.json().catch(function () { return {}; });
      alert(err.message || 'Comment required.');
    } else {
      alert('Save failed: ' + resp.status + ' ' + (resp.statusText || ''));
    }
  } catch (e) {
    alert('Save failed (network error).');
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val || '';
}

function populatePage(page) {
  if (!page) {
    document.title = 'Not Found – Ski Atlas';
    setText('resort-title', 'Resort not found: ' + YWIKI_PATH);
    setText('resort-subtitle', 'This page does not exist yet.');
    return;
  }

  document.title = (page.title || YWIKI_PATH) + ' – Ski Atlas';
  setText('resort-location', [page.state, page.country].filter(Boolean).join(', '));
  setText('resort-title', page.title || YWIKI_PATH);

  var subParts = [];
  if (page.resortType) subParts.push(page.resortType);
  if (page.totalLifts) subParts.push(page.totalLifts + ' lifts');
  if (page.downhillTrails) subParts.push(page.downhillTrails + ' trails');
  setText('resort-subtitle', subParts.join(' · '));

  var stats = [];
  if (page.totalAreaAcres) stats.push(['TOTAL AREA', page.totalAreaAcres + ' acres']);
  else if (page.totalAreaHa) stats.push(['TOTAL AREA', page.totalAreaHa + ' ha']);
  if (page.skiableTerrainAcres) stats.push(['SKIABLE TERRAIN', page.skiableTerrainAcres + ' acres']);
  else if (page.skiableTerrainHa) stats.push(['SKIABLE TERRAIN', page.skiableTerrainHa + ' ha']);
  if (page.totalLifts) stats.push(['LIFTS', page.totalLifts]);
  if (page.longestLiftMi) stats.push(['LONGEST LIFT', page.longestLiftMi + ' mi']);
  if (page.downhillTrails) stats.push(['TRAILS', page.downhillTrails]);
  if (page.longestTrailMi) stats.push(['LONGEST TRAIL', page.longestTrailMi + ' mi']);

  var statsEl = document.getElementById('resort-stats');
  if (statsEl) {
    statsEl.innerHTML = stats.map(function (s) {
      return '<div class="resort-stat"><span class="stat-label">' + esc(s[0]) + '</span> <span class="stat-value">' + esc(String(s[1])) + '</span></div>';
    }).join('');
    statsEl.style.display = stats.length ? '' : 'none';
  }

  var trailParts = [];
  if (page.trailsNovice) trailParts.push('Novice ' + page.trailsNovice);
  if (page.trailsEasy) trailParts.push('Easy ' + page.trailsEasy);
  if (page.trailsIntermediate) trailParts.push('Intermediate ' + page.trailsIntermediate);
  if (page.trailsAdvanced) trailParts.push('Advanced ' + page.trailsAdvanced);
  if (page.trailsExpert) trailParts.push('Expert ' + page.trailsExpert);
  if (page.trailsFreeride) trailParts.push('Freeride ' + page.trailsFreeride);
  var tbEl = document.getElementById('resort-trail-breakdown');
  if (tbEl) {
    if (trailParts.length) {
      tbEl.innerHTML = '<span class="stat-label">Trail breakdown</span> ' + esc(trailParts.join(' · '));
      tbEl.style.display = '';
    } else {
      tbEl.style.display = 'none';
    }
  }

  var metaParts = [];
  if (page.liftTypes) metaParts.push('Lift types: ' + page.liftTypes);
  if (page.gladedTerrain) metaParts.push('Gladed terrain: ' + page.gladedTerrain);
  if (page.snowPark) metaParts.push('Snow park: ' + page.snowPark);
  if (page.sleddingTubing) metaParts.push('Sledding / tubing: ' + page.sleddingTubing);
  var metaEl = document.getElementById('resort-meta');
  if (metaEl) {
    metaEl.textContent = metaParts.join(' · ');
    metaEl.style.display = metaParts.length ? '' : 'none';
  }

  var textarea = document.getElementById('sourceTA');
  if (textarea) textarea.value = page.content || '';
  renderFromMarkdown(page.content || '');
}

async function loadEntry() {
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH));
    if (!resp.ok) { populatePage(null); return; }
    var page = await resp.json();
    populatePage(page);
  } catch (e) {
    populatePage(null);
  }
}

var _contributorsCache = {};

function updateContributorsFromRevisions(revisions) {
  (revisions || []).forEach(function (r) {
    var uid = r.userId || '';
    if (uid) _contributorsCache[uid] = r.userDisplayName || r.userId || uid;
  });
  renderContributors();
}

function updateContributorsFromComments(comments) {
  (comments || []).forEach(function (c) {
    var uid = c.userId || '';
    if (uid) _contributorsCache[uid] = c.userDisplayName || c.userId || uid;
  });
  renderContributors();
}

function renderContributors() {
  var el = document.getElementById('resort-contributors');
  if (!el) return;
  var names = Object.keys(_contributorsCache).map(function (uid) {
    return (_contributorsCache[uid] || uid).replace(/</g, '&lt;');
  });
  if (names.length === 0) {
    el.textContent = '';
  } else {
    el.textContent = ' · contributed by: ' + names.join(', ');
  }
}

function updateContributors(revisions) {
  _contributorsCache = {};
  (revisions || []).forEach(function (r) {
    var uid = r.userId || '';
    if (uid) _contributorsCache[uid] = r.userDisplayName || r.userId || uid;
  });
  renderContributors();
}

function formatDiffHtml(diffText) {
  if (!diffText || typeof diffText !== 'string') return '';
  var lines = diffText.split('\n');
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var first = line.charAt(0);
    var cls = first === '+' ? 'resort-diff-add' : first === '-' ? 'resort-diff-remove' : 'resort-diff-context';
    out.push('<span class="' + cls + '">' + escaped + '</span>');
  }
  return out.join('\n');
}

function toggleRevisionDiff(revId) {
  var block = document.getElementById('revision-diff-' + revId);
  var btn = document.getElementById('revision-diff-btn-' + revId);
  if (!block || !btn) return;
  if (block.style.display === 'none' || !block.style.display) {
    block.style.display = 'block';
    btn.textContent = 'Hide changes';
  } else {
    block.style.display = 'none';
    btn.textContent = 'View changes';
  }
}

async function loadRevisions() {
  var el = document.getElementById('revisions-list');
  if (!el) return;
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions?limit=20');
    if (!resp.ok) return;
    var data = await resp.json();
    var list = (data && data.revisions) ? data.revisions : [];
    var currentUserId = (window.ywikiAuth && typeof ywikiAuth.getUserId === 'function') ? ywikiAuth.getUserId() : null;
    updateContributorsFromRevisions(list);
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No revisions yet.</p>';
    } else {
      el.innerHTML = list.map(function (r) {
        var ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
        var user = (r.userDisplayName || r.userId || 'anonymous').replace(/</g, '&lt;');
        var summary = (r.summary || 'Edit').replace(/</g, '&lt;');
        var status = (r.status || 'approved').toLowerCase();
        var statusLabel = status === 'pending' ? 'pending' : status === 'rejected' ? 'rejected' : 'accepted';
        var statusClass = 'resort-revision-status resort-revision-status-' + statusLabel;
        var actions = '';
        if (status === 'pending') {
          var isOwnRevision = currentUserId && r.userId && currentUserId === r.userId;
          if (!isOwnRevision) {
            actions = ' <button type="button" class="resort-revision-action resort-revision-accept" data-revision-id="' + (r.revisionId || '').replace(/"/g, '&quot;') + '" onclick="acceptRevision(this.getAttribute(\'data-revision-id\'))">Accept</button>';
          }
          actions += ' <button type="button" class="resort-revision-action resort-revision-reject" data-revision-id="' + (r.revisionId || '').replace(/"/g, '&quot;') + '" onclick="rejectRevision(this.getAttribute(\'data-revision-id\'))">Reject</button>';
        }
        var revId = r.revisionId || '';
        var revIdEsc = revId.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
        var viewChanges = '';
        var diffBlock = '';
        if (r.diff) {
          viewChanges = ' <button type="button" class="resort-revision-view-diff" id="revision-diff-btn-' + revId + '" onclick="toggleRevisionDiff(\'' + revIdEsc + '\')">View changes</button>';
          diffBlock = '<div class="resort-revision-diff" id="revision-diff-' + revId + '" style="display:none"><pre class="resort-diff-pre">' + formatDiffHtml(r.diff) + '</pre></div>';
        }
        return '<div class="resort-revision-item"><div class="resort-revision-head"><span class="resort-revision-time">' + ts + '</span> <span class="resort-revision-user">' + user + '</span>: ' + summary + ' <span class="' + statusClass + '">(' + statusLabel + ')</span>' + actions + viewChanges + '</div>' + diffBlock + '</div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load revisions.</p>';
    updateContributors([]);
  }
}

async function acceptRevision(revisionId) {
  if (!revisionId) return;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to accept a revision.');
    return;
  }
  var comment = window.prompt('Comment (required): Why are you accepting this revision?');
  if (comment === null) return;
  comment = (comment || '').trim();
  if (!comment) {
    alert('Comment is required.');
    return;
  }
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions/' + encodeURIComponent(revisionId) + '/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment: comment })
    });
    if (resp.ok) {
      loadRevisions();
      loadEntry();
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required.');
    } else if (resp.status === 403) {
      var err = await resp.json().catch(function () { return {}; });
      alert(err.message || 'You cannot accept your own revision; another user must accept it.');
    } else if (resp.status === 400) {
      alert('Comment is required.');
    } else if (resp.status === 404) {
      alert('Revision not found or already handled.');
    } else {
      alert('Failed to accept: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to accept revision.');
  }
}

async function rejectRevision(revisionId) {
  if (!revisionId) return;
  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to reject a revision.');
    return;
  }
  var comment = window.prompt('Comment (required): Why are you rejecting this revision?');
  if (comment === null) return;
  comment = (comment || '').trim();
  if (!comment) {
    alert('Comment is required.');
    return;
  }
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/revisions/' + encodeURIComponent(revisionId) + '/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ comment: comment })
    });
    if (resp.ok) {
      loadRevisions();
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required.');
    } else if (resp.status === 400) {
      alert('Comment is required.');
    } else if (resp.status === 404) {
      alert('Revision not found or already handled.');
    } else {
      alert('Failed to reject: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to reject revision.');
  }
}

async function loadComments() {
  var el = document.getElementById('comments-list');
  if (!el) return;
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/comments?limit=100');
    if (!resp.ok) return;
    var data = await resp.json();
    var list = (data && data.comments) ? data.comments : [];
    updateContributorsFromComments(list);
    if (list.length === 0) {
      el.innerHTML = '<p class="resort-list-empty">No comments yet.</p>';
    } else {
      el.innerHTML = list.map(function (c) {
        var ts = c.timestamp ? new Date(c.timestamp).toLocaleString() : '';
        var user = (c.userDisplayName || c.userId || 'anonymous').replace(/</g, '&lt;');
        var content = (c.content || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
        return '<div class="resort-comment-item"><span class="resort-comment-meta">' + user + ' · ' + ts + '</span><p class="resort-comment-content">' + content + '</p></div>';
      }).join('');
    }
  } catch (e) {
    el.innerHTML = '<p class="resort-list-empty">Could not load comments.</p>';
  }
}

async function postComment() {
  var input = document.getElementById('comment-input');
  var btn = document.getElementById('comment-submit-btn');
  if (!input || !btn) return;

  var content = (input.value || '').trim();
  if (!content) {
    alert('Enter a comment.');
    return;
  }

  var token = (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  if (!token) {
    alert('Sign in required to post a comment.');
    return;
  }

  btn.disabled = true;
  try {
    var resp = await fetch('/wiki/' + encodeURIComponent(YWIKI_PATH) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ content: content })
    });
    if (resp.ok) {
      input.value = '';
      loadComments();
    } else if (resp.status === 401) {
      alert('Sign in required to post a comment.');
    } else {
      alert('Failed to post comment: ' + resp.status);
    }
  } catch (e) {
    alert('Failed to post comment.');
  }
  btn.disabled = false;
}
