/**
 * Cognito auth for the wiki. Fetches config from /auth/config, handles Hosted UI redirect.
 * Store: id_token in sessionStorage. Use getToken() for API calls.
 */
(function () {
  var AUTH_CONFIG_URL = '/auth/config';
  var TOKEN_KEY = 'ywiki_id_token';
  var USER_KEY = 'ywiki_user';

  var config = { configured: false, domain: '', clientId: '', region: '' };

  function getBaseUrl() {
    return window.location.origin;
  }

  function getRedirectUri() {
    return getBaseUrl() + '/wiki/callback.html';
  }

  function loadConfig(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', AUTH_CONFIG_URL);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try { config = JSON.parse(xhr.responseText); } catch (e) {}
        }
        if (cb) cb(config);
      }
    };
    xhr.onerror = function () { if (cb) cb(config); };
    xhr.send();
  }

  function getLoginUrl() {
    if (!config.configured || !config.domain || !config.clientId) return null;
    var redirectUri = encodeURIComponent(getRedirectUri());
    var scope = encodeURIComponent('openid');
    return config.domain + '/oauth2/authorize?response_type=token&client_id=' + config.clientId +
      '&redirect_uri=' + redirectUri + '&scope=' + scope;
  }

  function getLogoutUrl() {
    if (!config.configured || !config.domain) return null;
    var logoutRedirect = getBaseUrl() + '/wiki/resort.html';
    var redirectUri = encodeURIComponent(logoutRedirect);
    return config.domain + '/logout?client_id=' + config.clientId + '&logout_uri=' + redirectUri;
  }

  function parseTokenFromHash() {
    var hash = window.location.hash || '';
    if (!hash) return null;
    var params = {};
    hash.replace(/^#?/, '').split('&').forEach(function (p) {
      var kv = p.split('=');
      if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    });
    return params.id_token || null;
  }

  function parseUserFromToken(token) {
    try {
      var payload = token.split('.')[1];
      if (!payload) return null;
      var json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return json.email || json['cognito:username'] || json.sub || 'Signed in';
    } catch (e) { return null; }
  }

  function getUserIdFromToken() {
    try {
      var token = sessionStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      var payload = token.split('.')[1];
      if (!payload) return null;
      var json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return json.sub || null;
    } catch (e) { return null; }
  }

  function saveToken(token) {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, parseUserFromToken(token) || '');
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  window.ywikiAuth = {
    getConfig:    function () { return config; },
    isConfigured: function () { return config.configured === true; },
    getToken:     function () { return sessionStorage.getItem(TOKEN_KEY); },
    getUser:      function () { return sessionStorage.getItem(USER_KEY) || ''; },
    getUserId:    function () { return getUserIdFromToken(); },
    getLoginUrl:  getLoginUrl,
    signIn: function () {
      var url = getLoginUrl();
      if (url) { window.location.href = url; }
      else { alert('Sign in not available: Cognito domain or client ID missing.'); }
    },
    signOut: function () {
      saveToken(null);
      var url = getLogoutUrl();
      if (url) window.location.href = url;
      else window.location.reload();
    },
    init: function (callback) {
      var tokenFromHash = parseTokenFromHash();
      if (tokenFromHash) {
        saveToken(tokenFromHash);
        window.location.replace(getBaseUrl() + '/wiki/resort.html');
        return;
      }
      loadConfig(callback || function () {});
    },
    renderWidget: function (containerId) {
      var container = document.getElementById(containerId);
      if (!container) return;
      loadConfig(function (cfg) {
        if (!cfg.configured) {
          container.innerHTML = '<span class="resort-auth-disabled">Sign in (Cognito not configured)</span>';
          return;
        }
        var token = sessionStorage.getItem(TOKEN_KEY);
        var user = sessionStorage.getItem(USER_KEY) || '';
        if (token && user) {
          container.innerHTML = '<span class="resort-auth-user">' + escapeHtml(user) + '</span> <a href="#" class="resort-auth-out" onclick="ywikiAuth.signOut(); return false;">Sign out</a>';
        } else {
          var loginUrl = getLoginUrl();
          if (loginUrl) {
            container.innerHTML = '<a href="' + escapeHtml(loginUrl) + '" class="resort-auth-in">Sign in</a>';
          } else {
            container.innerHTML = '<span class="resort-auth-disabled">Sign in (check /auth/config)</span>';
          }
        }
      });
    }
  };
})();
