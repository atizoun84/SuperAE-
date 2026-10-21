// ============================================================
// SuperAE — UI commune (login + reseau + toasts)
// A charger APRES firebase-config.js
// ============================================================
(function () {
  'use strict';

  if (typeof superaeAuth === 'undefined' || typeof SUPERAE_UID === 'undefined') {
    console.error('[SuperAE UI] firebase-config.js non charge. UI desactivee.');
    return;
  }

  // ---------- Etat ----------
  var resolvedUser = null;
  var loginPromise = null;
  var bootEl = null;

  var initialAuthPromise = new Promise(function (resolve) {
    var unsub = superaeAuth.onAuthStateChanged(function (user) {
      unsub();
      if (user) {
        if (user.uid === SUPERAE_UID) {
          resolvedUser = user;
        } else {
          superaeAuth.signOut();
        }
      }
      resolve();
    });
  });

  // ---------- CSS ----------
  function injectStyles() {
    var css = [
      '#superae-net-indicator{position:fixed;top:10px;left:50%;transform:translateX(-50%);padding:4px 12px;border-radius:999px;',
      'font-family:system-ui,-apple-system,sans-serif;font-size:.72em;font-weight:700;color:#fff;',
      'z-index:99998;display:inline-flex;align-items:center;gap:6px;pointer-events:none;',
      'text-transform:uppercase;letter-spacing:.5px;box-shadow:0 2px 8px rgba(0,0,0,.35);',
      'transition:background-color .3s;white-space:nowrap}',
      '@media (max-width:480px){#superae-net-indicator{font-size:.62em;padding:3px 9px;top:8px}}',
      '#superae-net-indicator.online{background:#16a34a;animation:sa-pulse-green 2.2s infinite}',
      '#superae-net-indicator.offline{background:#dc2626;animation:sa-blink-red 1.2s infinite}',
      '#superae-net-indicator .sa-dot{width:7px;height:7px;border-radius:50%;background:#fff;flex-shrink:0}',
      '@keyframes sa-pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.7)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}',
      '@keyframes sa-blink-red{0%,100%{opacity:1}50%{opacity:.4}}',
      '@keyframes sa-spin{to{transform:rotate(360deg)}}',
      '#superae-boot-overlay,#superae-login-overlay,#superae-success-toast{position:fixed;inset:0;z-index:99999;',
      'font-family:system-ui,-apple-system,sans-serif}',
      '#superae-boot-overlay{background:#0f172a;display:flex;align-items:center;justify-content:center;color:#e2e8f0}',
      '#superae-boot-inner{text-align:center}',
      '.sa-spinner{width:40px;height:40px;border:3px solid rgba(56,189,248,.25);border-top-color:#38bdf8;',
      'border-radius:50%;animation:sa-spin .8s linear infinite;margin:0 auto 12px}',
      '#superae-login-overlay{background:rgba(15,23,42,.97);display:flex;align-items:center;justify-content:center;padding:16px}',
      '#superae-login-card{background:#1e293b;padding:28px 24px;border-radius:14px;',
      'box-shadow:0 20px 60px rgba(0,0,0,.5);width:100%;max-width:380px;color:#e2e8f0;border-top:4px solid #38bdf8}',
      '#superae-login-card h2{margin:0 0 4px;font-size:1.35em;color:#38bdf8}',
      '#superae-login-card .sa-sub{margin:0 0 20px;color:#94a3b8;font-size:.85em}',
      '#superae-login-card label{display:block;margin-bottom:6px;font-size:.85em;color:#cbd5e1;font-weight:600}',
      '#superae-login-card input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #334155;',
      'background:#0f172a;color:#e2e8f0;margin-bottom:14px;font-size:1em;box-sizing:border-box;font-family:inherit}',
      '#superae-login-card input:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.2)}',
      '#superae-login-card button{width:100%;padding:11px;background:#38bdf8;color:#0f172a;border:none;',
      'border-radius:8px;font-weight:700;font-size:1em;cursor:pointer;font-family:inherit}',
      '#superae-login-card button:disabled{opacity:.6;cursor:wait}',
      '#superae-login-error{color:#fca5a5;font-size:.85em;margin-bottom:12px;min-height:18px}',
      '#superae-success-toast{background:rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;',
      'pointer-events:none;transition:opacity .8s ease}',
      '#superae-success-toast.sa-fade{opacity:0}',
      '#superae-success-toast .sa-success-inner{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;',
      'padding:20px 36px;border-radius:16px;font-size:1.2em;font-weight:700;',
      'box-shadow:0 20px 60px rgba(34,197,94,.4)}',
      // Important: rendre visibles les overlays meme si body est masque
      'html:not(.superae-ready) body #superae-boot-overlay,',
      'html:not(.superae-ready) body #superae-login-overlay,',
      'html:not(.superae-ready) body #superae-success-toast,',
      'html:not(.superae-ready) body #superae-net-indicator{visibility:visible}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'superae-ui-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------- Badge reseau ----------
  function injectNetIndicator() {
    var el = document.createElement('div');
    el.id = 'superae-net-indicator';
    el.innerHTML = '<span class="sa-dot"></span><span class="sa-label">...</span>';
    document.body.appendChild(el);
    function update() {
      var on = navigator.onLine;
      el.classList.toggle('online', on);
      el.classList.toggle('offline', !on);
      el.querySelector('.sa-label').textContent = on ? 'En ligne' : 'Hors ligne';
    }
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
  }

  // ---------- Boot overlay ----------
  function showBoot() {
    bootEl = document.createElement('div');
    bootEl.id = 'superae-boot-overlay';
    bootEl.innerHTML = '<div id="superae-boot-inner"><div class="sa-spinner"></div><div>Chargement...</div></div>';
    document.body.appendChild(bootEl);
  }
  function hideBoot() {
    if (bootEl && bootEl.parentNode) bootEl.remove();
    bootEl = null;
  }

  // ---------- Login form ----------
  function showLoginForm() {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.id = 'superae-login-overlay';
      overlay.innerHTML =
        '<div id="superae-login-card">' +
        '<h2>SuperAE</h2>' +
        '<p class="sa-sub">Connectez-vous pour acceder a l\'application.</p>' +
        '<form id="superae-login-form" novalidate>' +
        '<label for="superae-email">Email</label>' +
        '<input type="email" id="superae-email" autocomplete="username" required>' +
        '<label for="superae-password">Mot de passe</label>' +
        '<input type="password" id="superae-password" autocomplete="current-password" required>' +
        '<div id="superae-login-error"></div>' +
        '<button type="submit" id="superae-login-btn">Se connecter</button>' +
        '</form></div>';
      document.body.appendChild(overlay);

      var form = overlay.querySelector('#superae-login-form');
      var email = overlay.querySelector('#superae-email');
      var pass = overlay.querySelector('#superae-password');
      var btn = overlay.querySelector('#superae-login-btn');
      var err = overlay.querySelector('#superae-login-error');

      setTimeout(function () { email.focus(); }, 60);

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        err.textContent = '';
        var em = email.value.trim();
        var pw = pass.value;
        if (!em || !pw) { err.textContent = 'Email et mot de passe requis.'; return; }
        btn.disabled = true; btn.textContent = 'Connexion...';
        try {
          var cred = await superaeAuth.signInWithEmailAndPassword(em, pw);
          if (cred.user.uid !== SUPERAE_UID) {
            await superaeAuth.signOut();
            throw new Error('Ce compte n\'est pas autorise.');
          }
          overlay.remove();
          resolve(cred.user);
        } catch (ex) {
          var msg = 'Erreur de connexion.';
          if (ex.code === 'auth/user-not-found' || ex.code === 'auth/wrong-password' || ex.code === 'auth/invalid-credential') msg = 'Email ou mot de passe incorrect.';
          else if (ex.code === 'auth/invalid-email') msg = 'Adresse email invalide.';
          else if (ex.code === 'auth/too-many-requests') msg = 'Trop de tentatives. Reessayez plus tard.';
          else if (ex.message) msg = ex.message;
          err.textContent = msg;
          btn.disabled = false; btn.textContent = 'Se connecter';
          pass.value = ''; pass.focus();
        }
      });
    });
  }

  // ---------- Toast succes ----------
  function showSuccessToast(msg) {
    var t = document.createElement('div');
    t.id = 'superae-success-toast';
    t.innerHTML = '<div class="sa-success-inner">&#10003; ' + msg + '</div>';
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('sa-fade'); }, 1500);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 2800);
  }

  // ---------- Flux principal ----------
  async function performLogin() {
    var user = await showLoginForm();
    resolvedUser = user;
    document.documentElement.classList.add('superae-ready');
    showSuccessToast('Connexion reussie');
    return user;
  }

  async function ensureSignedIn() {
    await initialAuthPromise;
    if (resolvedUser) {
      document.documentElement.classList.add('superae-ready');
      return resolvedUser;
    }
    if (!loginPromise) loginPromise = performLogin();
    return loginPromise;
  }

  window.superaeEnsureSignedIn = ensureSignedIn;

  async function init() {
    injectStyles();
    injectNetIndicator();
    showBoot();
    await initialAuthPromise;
    hideBoot();
    if (resolvedUser) {
      document.documentElement.classList.add('superae-ready');
    } else if (!loginPromise) {
      loginPromise = performLogin();
    }
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
