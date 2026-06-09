// ============================================================
// content-inject.js — Corre en document_start (mundo aislado)
// Inyecta ajax-listener.js en el mundo MAIN de la pagina
// para poder interceptar XHR/fetch del player de Vimeo
// ============================================================

(function () {
  'use strict';
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('ajax-listener.js');
  s.onload = function () { this.remove(); };
  (document.head || document.documentElement).appendChild(s);
})();
