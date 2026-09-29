/**
 * Logged-in wiki calls to /api/wiki/resort-jobs.
 * The resort-job secret is not in this file. The server adds it.
 */
(function () {
  var QUEUED_MSG = 'This change is queued and will appear after the next daily update.';

  function token() {
    return (window.ywikiAuth && typeof ywikiAuth.getToken === 'function') ? ywikiAuth.getToken() : null;
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() };
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function poll(jobId, onStatus) {
    var bearer = token();
    for (var i = 0; i < 15; i++) {
      await sleep(2000);
      if (!bearer || token() !== bearer) return;
      var resp = await fetch('/api/wiki/resort-jobs/' + encodeURIComponent(jobId), {
        headers: { Authorization: 'Bearer ' + bearer },
      });
      var data = {};
      try { data = await resp.json(); } catch (e) { data = {}; }
      if (!resp.ok) return;
      var status = data.status || '';
      if (onStatus) onStatus(status);
      if (status === 'succeeded') return;
      if (status === 'failed') return 'failed';
    }
  }

  async function submit(body, statusEl, queuedMsg) {
    var msg = queuedMsg || (body && body.action === 'add'
      ? 'This resort is queued and will appear after the next daily update.'
      : QUEUED_MSG);
    if (!token()) return false;
    if (statusEl) statusEl.textContent = 'Sending…';
    var resp = await fetch('/api/wiki/resort-jobs', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    var data = {};
    try { data = await resp.json(); } catch (e) { data = {}; }
    if (resp.status === 401) {
      if (statusEl) statusEl.textContent = 'Sign in to queue a resort change.';
      return false;
    }
    if (!resp.ok && !data.jobId) {
      if (statusEl) statusEl.textContent = data.message || data.error || ('Could not queue this change (' + resp.status + ').');
      return false;
    }
    if (statusEl) statusEl.textContent = msg;
    if (!data.jobId) return true;
    try {
      var failed = await poll(data.jobId, function () {});
      if (statusEl && failed === 'failed') statusEl.textContent = 'The queue did not accept this change.';
      else if (statusEl) statusEl.textContent = msg;
    } catch (e) {
      if (statusEl) statusEl.textContent = msg;
    }
    return true;
  }

  window.ywikiResortJobs = { submit: submit, queuedMessage: QUEUED_MSG };
})();
