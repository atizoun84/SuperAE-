// ============================================================
// SuperAE — Barre de progression de connexion cloud
// A charger APRES firebase-config.js et superae-ui.js
// Etats : offline(0%) -> network(20%) -> auth(60%) -> ready(100%)
// ============================================================
(function () {
  'use strict';

  if (typeof superaeDb === 'undefined' || typeof superaeAuth === 'undefined' || typeof SUPERAE_UID === 'undefined') {
    console.error('[SuperAE Progress] firebase-config.js non charge. Barre desactivee.');
    return;
  }

  var css = [
    '#superae-progress-bar{position:fixed;top:0;left:0;right:0;height:5px;background:rgba(30,41,59,.55);z-index:99997;overflow:hidden}',
    '#superae-progress-bar .sa-fill{height:100%;width:0%;background:#38bdf8;transition:width .7s cubic-bezier(.4,0,.2,1),background .4s,box-shadow .4s;box-shadow:0 0 10px rgba(56,189,248,.6)}',
    '#superae-progress-bar .sa-label{position:absolute;right:10px;top:8px;font-family:system-ui,-apple-system,sans-serif;font-size:10px;font-weight:700;color:#0f172a;background:rgba(255,255,255,.92);padding:2px 7px;border-radius:4px;pointer-events:none;opacity:0;transform:translateY(-4px);transition:opacity .3s,transform .3s}',
    '#superae-progress-bar.sa-show-label .sa-label{opacity:1;transform:translateY(0)}',
    '#superae-progress-bar[data-state="offline"] .sa-fill{background:#ef4444;box-shadow:0 0 10px rgba(239,68,68,.65)}',
    '#superae-progress-bar[data-state="network"] .sa-fill{background:#f59e0b;box-shadow:0 0 10px rgba(245,158,11,.65)}',
    '#superae-progress-bar[data-state="auth"] .sa-fill{background:#38bdf8;box-shadow:0 0 10px rgba(56,189,248,.65)}',
    '#superae-progress-bar[data-state="ready"] .sa-fill{background:linear-gradient(90deg,#22c55e,#16a34a);box-shadow:0 0 12px rgba(34,197,94,.75)}',
    'html:not(.superae-ready) body #superae-progress-bar{visibility:visible}'
  ].join('');
  var st = document.createElement('style');
  st.id = 'superae-progress-style';
  st.textContent = css;
  document.head.appendChild(st);

  var bar = document.createElement('div');
  bar.id = 'superae-progress-bar';
  bar.setAttribute('data-state', 'offline');
  bar.innerHTML = '<div class="sa-fill"></div><div class="sa-label">0%</div>';
  document.body.appendChild(bar);

  var fill = bar.querySelector('.sa-fill');
  var label = bar.querySelector('.sa-label');
  var hideTimer = null;

  function setProgress(pct, state, text, autoHideLabel) {
    bar.setAttribute('data-state', state);
    fill.style.width = pct + '%';
    label.textContent = text || (pct + '%');
    bar.classList.add('sa-show-label');
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (autoHideLabel) {
      hideTimer = setTimeout(function () {
        bar.classList.remove('sa-show-label');
      }, 2200);
    }
    bar.title = 'Cloud : ' + (text || pct + '%');
  }

  // Etat initial
  if (navigator.onLine) {
    setProgress(20, 'network', 'Reseau detecte');
  } else {
    setProgress(0, 'offline', 'Hors ligne');
  }

  // Etat auth
  superaeAuth.onAuthStateChanged(function (user) {
    if (user && user.uid === SUPERAE_UID && bar.getAttribute('data-state') !== 'ready') {
      setProgress(60, 'auth', 'Authentifie');
    }
  });

  // Etat RTDB (source de verite)
  try {
    superaeDb.ref('.info/connected').on('value', function (snap) {
      var connected = snap.val() === true;
      if (connected) {
        setProgress(100, 'ready', 'Cloud connecte', true);
      } else if (navigator.onLine) {
        setProgress(20, 'network', 'Reconnexion...');
      } else {
        setProgress(0, 'offline', 'Hors ligne');
      }
    });
  } catch (e) {
    console.warn('[SuperAE Progress] .info/connected indisponible :', e);
  }

  // Events reseau natifs
  window.addEventListener('offline', function () {
    setProgress(0, 'offline', 'Hors ligne');
  });
  window.addEventListener('online', function () {
    if (bar.getAttribute('data-state') !== 'ready') {
      setProgress(20, 'network', 'Reseau detecte');
    }
  });
})();
