/**
 * Harvested facts UI. Values come from /api/wiki/resorts/facts.
 * A missing field renders as unknown. False is only shown when the row says false or "no".
 */
(function () {
  var API = '/api/wiki/resorts/facts';
  var AMENITIES = [
    ['snowtubing', 'Snowtubing'],
    ['ski_rentals', 'Ski rentals'],
    ['ski_instructors', 'Ski instructors'],
    ['night_skiing', 'Night skiing'],
    ['terrain_park', 'Terrain park'],
    ['nordic', 'Nordic'],
    ['childcare', 'Childcare'],
    ['snowmaking', 'Snowmaking'],
    ['glacier', 'Glacier']
  ];
  var PASSES = ['Epic', 'Ikon', 'Indy', 'Mountain Collective', 'Power Pass', 'Nord Pass'];
  var BANDS = ['$', '$$', '$$$', '$$$$'];
  var TIERS = ['small', 'medium', 'large'];
  var CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'CHF', 'AUD', 'NZD', 'JPY', 'SEK', 'NOK', 'KRW'];
  var PROFILE = [
    ['owner', 'Owner'],
    ['operator_group', 'Operator group'],
    ['operator_status', 'Operator status'],
    ['year_started', 'Year started'],
    ['village_type', 'Village'],
    ['visit_type', 'Visit'],
    ['famous_for', 'Known for'],
    ['on_hill_lodge', 'On-hill lodge']
  ];
  var ACCESS = [
    ['drive', 'Drive'],
    ['parking', 'Parking'],
    ['season_open', 'Season open'],
    ['season_close', 'Season close'],
    ['sectors', 'Sectors'],
    ['terrain', 'Terrain']
  ];
  var RAW_PRICES = [
    ['weekend_ticket_raw', 'Weekend ticket'],
    ['night_ticket_raw', 'Night ticket'],
    ['season_pass_raw', 'Season pass']
  ];

  function safeUrl(url) {
    try {
      var parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
    } catch (e) {}
    return '';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function has(row, key) {
    if (!row || row[key] == null) return false;
    if (typeof row[key] === 'string' && row[key].trim() === '') return false;
    if (Array.isArray(row[key]) && !row[key].length) return false;
    return true;
  }

  function amenityState(value) {
    if (value === true || value === 'yes') return 'true';
    if (value === false || value === 'no') return 'false';
    return 'unknown';
  }

  function chip(label, state, title) {
    return '<span class="hf-chip hf-chip--' + state + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(label) + '</span>';
  }

  function amenityChips(row) {
    return AMENITIES.map(function (pair) {
      var state = amenityState(row ? row[pair[0]] : undefined);
      var label = state === 'false' ? 'No ' + pair[1].toLowerCase() : (state === 'unknown' ? pair[1] + ' unknown' : pair[1]);
      var evidence = row && row[pair[0] + 'Evidence'];
      return chip(label, state, evidence || '');
    }).join('');
  }

  function pct(share) {
    if (share == null || !isFinite(share)) return 'unknown';
    return (Math.round(share * 1000) / 10) + '%';
  }

  function placeLine(row) {
    var bits = [];
    bits.push(has(row, 'state') ? row.state : 'State unknown');
    bits.push(has(row, 'country') ? row.country : 'Country unknown');
    return bits.join(' · ');
  }

  function sourceBits(row, field) {
    if (!row) return '';
    var kind = row[field + 'SourceKind'] || row[field + 'Source'] || '';
    var url = safeUrl(row[field + 'SourceUrl'] || '');
    var locked = row[field + 'Locked'] === true;
    var label = kind || 'source';
    var html = '';
    if (url) html = '<a class="hf-source" href="' + esc(url) + '" rel="noopener noreferrer">' + esc(label) + '</a>';
    else if (kind) html = '<span class="hf-source">' + esc(kind) + '</span>';
    if (locked) html += (html ? ' ' : '') + '<span class="hf-source">locked</span>';
    return html;
  }

  function profileHtml(row) {
    var html = '';
    if (has(row, 'website')) {
      html += '<p class="hf-profile-line"><span>Website</span> ' + (safeUrl(row.website) ? '<a href="' + esc(row.website) + '" rel="noopener noreferrer">' + esc(row.website) + '</a>' : esc(row.website)) + ' ' + sourceBits(row, 'website') + '</p>';
    }
    PROFILE.forEach(function (pair) {
      if (!has(row, pair[0])) return;
      html += '<p class="hf-profile-line"><span>' + esc(pair[1]) + '</span> ' + esc(row[pair[0]]) + ' ' + sourceBits(row, pair[0]) + '</p>';
    });
    ACCESS.forEach(function (pair) {
      if (!has(row, pair[0])) return;
      html += '<p class="hf-profile-line"><span>' + esc(pair[1]) + '</span> ' + esc(row[pair[0]]) + ' ' + sourceBits(row, pair[0]) + '</p>';
    });
    return html;
  }

  function priceHtml(row) {
    var band = has(row, 'price_band') ? chip(row.price_band, 'meta', 'Stored price band') : chip('Price band unknown', 'unknown');
    var raw = has(row, 'lift_ticket_raw') ? esc(row.lift_ticket_raw) : '';
    var url = safeUrl((row && (row.lift_ticket_rawSourceUrl || row.lift_ticketSourceUrl)) || '');
    var evidence = (row && (row.lift_ticket_rawEvidence || row.lift_ticketEvidence)) || '';
    var ticket = raw
      ? '<span class="hf-ticket" title="' + esc(evidence) + '">' + raw + '</span>'
      : chip('Ticket price unknown', 'unknown');
    if (raw && url) ticket = '<a class="hf-ticket" href="' + esc(url) + '" title="' + esc(evidence || url) + '" rel="noopener noreferrer">' + raw + '</a>';
    var extra = RAW_PRICES.filter(function (pair) { return has(row, pair[0]); }).map(function (pair) {
      return '<span class="hf-extra-price">' + esc(pair[1]) + ': ' + esc(row[pair[0]]) + '</span>';
    }).join('');
    var parsed = '';
    if (has(row, 'lift_ticket_amount') && has(row, 'lift_ticket_currency')) {
      parsed = '<span class="hf-extra-price">Parsed amount: ' + esc(row.lift_ticket_amount) + ' ' + esc(row.lift_ticket_currency) + '</span>';
    }
    return '<div class="hf-price">' + band + ticket + extra + parsed + sourceBits(row, 'lift_ticket_raw') + '</div>';
  }

  function passChips(row) {
    if (!row || !Array.isArray(row.passes) || !row.passes.length) return chip('Passes unknown', 'unknown');
    return row.passes.map(function (name) { return chip(name, 'meta'); }).join('');
  }

  function editHtml(row) {
    if (!row || !row.winterSportsId) return '';
    var token = window.ywikiAuth && ywikiAuth.getToken && ywikiAuth.getToken();
    if (!token) return '<p class="hf-edit-note">Sign in to correct a cell. A correction locks that field.</p>';
    var options = [
      ['name', 'Name'], ['country', 'Country'], ['state', 'State'], ['tier', 'Tier'], ['pageId', 'Wiki slug']
    ].concat(PROFILE, [['website', 'Website'], ['passes', 'Passes']], ACCESS, [
      ['lift_ticket_raw', 'Day ticket, as written'],
      ['lift_ticket_amount', 'Parsed ticket amount'],
      ['lift_ticket_currency', 'Parsed currency'],
      ['lift_ticket_usd', 'Stored USD amount'],
      ['price_band', 'Price band'],
      ['weekend_ticket_raw', 'Weekend ticket'],
      ['night_ticket_raw', 'Night ticket'],
      ['season_pass_raw', 'Season pass']
    ], AMENITIES);
    return '<details class="hf-edit"><summary>Correct a fact</summary>' +
      '<form class="hf-edit-form" data-id="' + esc(row.winterSportsId) + '">' +
      '<label>Field <select name="field">' + options.map(function (pair) {
        return '<option value="' + esc(pair[0]) + '">' + esc(pair[1]) + '</option>';
      }).join('') + '</select></label>' +
      '<label>Value <input name="value" type="text" autocomplete="off" placeholder="Leave blank to clear (unknown)"></label>' +
      '<label>Source URL <input name="sourceUrl" type="url" placeholder="https://"></label>' +
      '<label>Evidence <input name="evidence" type="text" maxlength="2000"></label>' +
      '<button type="submit">Save and lock</button>' +
      '<p class="hf-edit-status" role="status"></p>' +
      '</form></details>';
  }

  function cardHtml(row) {
    var name = has(row, 'name') ? row.name : 'Name unknown';
    var title = has(row, 'pageId')
      ? '<a href="/wiki/resort.html?page=' + encodeURIComponent(row.pageId) + '">' + esc(name) + '</a>'
      : esc(name);
    var tier = has(row, 'tier') ? chip(row.tier, 'meta') : chip('Size unknown', 'unknown');
    return '<article class="hf-card">' +
      '<h3 class="hf-card-title">' + title + '</h3>' +
      '<p class="hf-place">' + esc(placeLine(row)) + ' ' + tier + '</p>' +
      '<p class="hf-id">OSM winter sports ' + esc(row.winterSportsId || 'unknown') + '</p>' +
      priceHtml(row) +
      '<div class="hf-chips">' + passChips(row) + amenityChips(row) + '</div>' +
      profileHtml(row) +
      editHtml(row) +
      '</article>';
  }

  function statsHtml(stats, truncated) {
    stats = stats || {};
    var night = stats.nightSkiing || {};
    var pass = stats.passShare || {};
    var medians = stats.medianLiftTicketUsdByCountry || {};
    var gaps = stats.insufficientDataByState || {};
    var medianKeys = Object.keys(medians);
    var gapKeys = Object.keys(gaps);
    var medianBody = medianKeys.length
      ? '<ul>' + medianKeys.map(function (country) {
        var label = country || 'Country unknown';
        return '<li>' + esc(label) + ': ' + esc(medians[country]) + ' USD</li>';
      }).join('') + '</ul>'
      : '<p>Unknown. No stored lift_ticket_usd in this filter.</p>';
    var gapBody = gapKeys.length
      ? '<ul>' + gapKeys.map(function (state) {
        return '<li>' + esc(state || 'State unknown') + ': ' + esc(gaps[state]) + '</li>';
      }).join('') + '</ul>'
      : '<p>None in this filter.</p>';
    return '<div class="hf-stats">' +
      '<p class="hf-count">' + esc(stats.count || 0) + ' harvested row' + (stats.count === 1 ? '' : 's') + (truncated ? ' (list truncated)' : '') + '</p>' +
      '<h2>Pass mix</h2>' +
      '<p>Shares use resorts in this filter that have Ikon, a local pass, or both. Epic-only and other canonical passes stay in “other”. Missing passes stay out of the percentage.</p>' +
      '<ul>' +
      '<li>Ikon only: ' + esc(pass.ikonOnly || 0) + ' (' + pct(pass.ikonOnlyShare) + ')</li>' +
      '<li>Local pass only: ' + esc(pass.localOnly || 0) + ' (' + pct(pass.localOnlyShare) + ')</li>' +
      '<li>Ikon and a local pass: ' + esc(pass.both || 0) + ' (' + pct(pass.bothShare) + ')</li>' +
      '<li>Other stored pass: ' + esc(pass.otherPass || 0) + '</li>' +
      '<li>Passes unknown: ' + esc(pass.unknownPasses || 0) + '</li>' +
      '</ul>' +
      '<h2>Median day ticket</h2>' +
      '<p>Median of stored lift_ticket_usd by country. Rows with no USD figure are skipped. This number is not the price printed on a resort.</p>' +
      medianBody +
      '<h2>Night skiing</h2>' +
      '<p>' + (night.pct == null
        ? 'Unknown. No row in this filter has a stored yes or no.'
        : pct(night.pct) + ' of rows where night skiing is stored (' + esc(night.true || 0) + ' yes, ' + esc(night.false || 0) + ' no).') +
      ' Unknown rows: ' + esc(night.unknown || 0) + '.</p>' +
      '<h2>Harvest gaps</h2>' +
      '<p>Rows whose copy_status is insufficient_data, counted by state.</p>' +
      gapBody +
      '</div>';
  }

  function emptyCard() {
    return '<article class="hf-card">' +
      '<h3 class="hf-card-title">No harvested row</h3>' +
      '<p class="hf-place">This page is not in atlas-ResortFacts yet. Nothing below is filled in from the article.</p>' +
      priceHtml(null) +
      '<div class="hf-chips">' + passChips(null) + amenityChips(null) + '</div>' +
      '</article>';
  }

  function valueFor(field, raw) {
    var text = String(raw || '').trim();
    if (!text) return null;
    if (AMENITIES.some(function (pair) { return pair[0] === field; })) {
      if (text === 'true' || text === 'yes') return true;
      if (text === 'false' || text === 'no') return false;
      return { error: 'Use true, false, or leave blank for unknown' };
    }
    if (field === 'tier') return ['small', 'medium', 'large'].indexOf(text) === -1 ? { error: 'Tier must be small, medium, or large' } : text;
    if (field === 'price_band') return BANDS.indexOf(text) === -1 ? { error: 'Price band must be $, $$, $$$, or $$$$' } : text;
    if (field === 'lift_ticket_currency') return CURRENCIES.indexOf(text.toUpperCase()) === -1 ? { error: 'Currency is not a supported code' } : text.toUpperCase();
    if (field === 'year_started' || field === 'lift_ticket_amount' || field === 'lift_ticket_usd') {
      var num = Number(text);
      if (!isFinite(num)) return { error: 'Enter a number, or leave blank to clear' };
      return num;
    }
    return text;
  }

  function bindEdits(root, onDone) {
    Array.prototype.forEach.call(root.querySelectorAll('.hf-edit-form'), function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var status = form.querySelector('.hf-edit-status');
        var field = form.field.value;
        var parsed = valueFor(field, form.value.value);
        if (parsed && parsed.error) {
          status.textContent = parsed.error;
          return;
        }
        var token = window.ywikiAuth && ywikiAuth.getToken();
        status.textContent = 'Saving…';
        fetch(API + '/' + encodeURIComponent(form.getAttribute('data-id')), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            field: field,
            value: parsed,
            sourceUrl: form.sourceUrl.value.trim(),
            evidence: form.evidence.value.trim()
          })
        }).then(function (resp) {
          return resp.json().then(function (body) { return { ok: resp.ok, body: body }; });
        }).then(function (result) {
          if (!result.ok) {
            status.textContent = (result.body && (result.body.message || result.body.error)) || 'Save failed';
            return;
          }
          status.textContent = 'Locked.';
          if (onDone) onDone();
        }).catch(function () {
          status.textContent = 'Save failed';
        });
      });
    });
  }

  function queryFromForm(form) {
    var params = new URLSearchParams();
    ['country', 'state', 'price_band', 'tier'].forEach(function (key) {
      var value = form[key] && form[key].value.trim();
      if (value) params.set(key, value);
    });
    var passPick = form.pass.value;
    var pass = passPick === 'other' ? form.pass_local.value.trim() : passPick;
    if (pass) params.set('pass', pass);
    var amenity = form.amenity.value;
    if (amenity) params.set('amenity', amenity);
    return params;
  }

  function loadFacts(params) {
    return fetch(API + (params && params.toString() ? '?' + params.toString() : ''), {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    }).then(function (resp) {
      var type = resp.headers.get('Content-Type') || '';
      if (!resp.ok || type.indexOf('application/json') === -1) {
        throw new Error(resp.ok ? 'Facts API did not return JSON' : 'Facts API error ' + resp.status);
      }
      return resp.json();
    });
  }

  function bootDirectory() {
    var form = document.getElementById('facts-filter');
    var results = document.getElementById('facts-results');
    var statsEl = document.getElementById('facts-stats');
    var chips = document.getElementById('facts-amenity-chips');
    if (!form || !results) return;

    chips.innerHTML = AMENITIES.map(function (pair) {
      return '<button type="button" class="hf-chip hf-filter" data-amenity="' + pair[0] + '">' + esc(pair[1]) + '</button>';
    }).join('');

    function paintChips() {
      var current = form.amenity.value;
      Array.prototype.forEach.call(chips.querySelectorAll('[data-amenity]'), function (btn) {
        var on = btn.getAttribute('data-amenity') === current;
        btn.classList.toggle('hf-chip--true', on);
        btn.classList.toggle('hf-chip--unknown', !on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    chips.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-amenity]');
      if (!btn) return;
      var name = btn.getAttribute('data-amenity');
      form.amenity.value = form.amenity.value === name ? '' : name;
      paintChips();
    });

    function apply(push) {
      var params = queryFromForm(form);
      results.textContent = 'Loading harvested facts…';
      statsEl.textContent = '';
      if (push) history.replaceState(null, '', params.toString() ? '?' + params.toString() : location.pathname);
      loadFacts(params).then(function (body) {
        statsEl.innerHTML = statsHtml(body.stats, body.truncated);
        if (!body.resorts || !body.resorts.length) {
          results.innerHTML = '<p class="hf-empty">No harvested rows match. atlas-ResortFacts has nothing for this filter yet.</p>' + emptyCard();
          return;
        }
        results.innerHTML = body.resorts.map(cardHtml).join('');
        bindEdits(results, function () { apply(false); });
      }).catch(function (err) {
        statsEl.textContent = '';
        results.textContent = err.message || 'Could not load harvested facts.';
      });
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      apply(true);
    });

    var initial = new URLSearchParams(location.search);
    ['country', 'state', 'price_band', 'tier', 'amenity'].forEach(function (key) {
      if (initial.get(key) && form[key]) form[key].value = initial.get(key);
    });
    var pass = initial.get('pass') || '';
    if (PASSES.indexOf(pass) !== -1) form.pass.value = pass;
    else if (pass) {
      form.pass.value = 'other';
      form.pass_local.value = pass;
    }
    paintChips();
    apply(false);
  }

  function stripHtml(row) {
    return '<div class="hf-strip">' +
      priceHtml(row) +
      '<div class="hf-chips">' + passChips(row) + amenityChips(row) + '</div>' +
      profileHtml(row) +
      editHtml(row) +
      '</div>';
  }

  var renderSeq = 0;
  function renderHarvestedForPage(page) {
    var host = document.getElementById('harvested-facts-body');
    if (!host) return;
    var section = host.closest('section') || host.parentElement;
    var regional = page && (page.pageType === 'country' || page.pageType === 'state' || page.pageType === 'continent');
    if (!page || regional) {
      section.hidden = true;
      host.innerHTML = '';
      return;
    }
    section.hidden = false;
    var pageId = page.pageId ? String(page.pageId) : '';
    var winterSportsId = page.winterSportsId != null && String(page.winterSportsId) !== '' ? String(page.winterSportsId) : '';
    var seq = ++renderSeq;
    host.textContent = 'Loading harvested facts…';
    var first;
    try {
      first = pageId ? loadFacts(new URLSearchParams({ pageId: pageId })) : Promise.resolve({ resorts: [] });
    } catch (err) {
      host.textContent = (err && err.message) || 'Could not load harvested facts.';
      return;
    }
    first.then(function (body) {
      var list = body && body.resorts;
      var row = list && list.length ? list[0] : null;
      if (row || !winterSportsId) return row;
      return loadFacts(new URLSearchParams({ winterSportsId: winterSportsId })).then(function (next) {
        var more = next && next.resorts;
        return more && more.length ? more[0] : null;
      });
    }).then(function (row) {
      if (seq !== renderSeq) return;
      try {
        host.innerHTML = stripHtml(row);
      } catch (err) {
        host.textContent = err && err.message ? err.message : 'Could not render harvested facts.';
        return;
      }
      if (row) bindEdits(host, function () { renderHarvestedForPage(page); });
    }).catch(function (err) {
      if (seq !== renderSeq) return;
      host.textContent = (err && err.message) || 'Could not load harvested facts.';
    });
  }

  window.gsaRenderHarvestedFacts = renderHarvestedForPage;
  if (typeof populatePage === 'function' && !populatePage._hfWrapped) {
    var populateResortPage = populatePage;
    populatePage = function (page) {
      var result = populateResortPage.apply(this, arguments);
      renderHarvestedForPage(page);
      return result;
    };
    populatePage._hfWrapped = true;
  }

  function boot() {
    if (document.getElementById('facts-app')) bootDirectory();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
