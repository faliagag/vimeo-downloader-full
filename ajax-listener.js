// ============================================================
// ajax-listener.js — Mundo MAIN de la pagina
// Intercepta XHR y fetch del player de Vimeo para capturar
// la configuracion del video sin hacer llamadas externas
// (evita errores 403)
// ============================================================

(function () {
  'use strict';

  // Evitar doble inyeccion
  if (window.__vimeoListenerActive) return;
  window.__vimeoListenerActive = true;

  const reviewRegex = /vimeo\.com\/.*\/review\//;

  // ---- Parchear XMLHttpRequest ----
  const OrigOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    this.addEventListener('load', function () {
      try {
        const json = JSON.parse(this.responseText);
        if (isVimeoConfig(json)) {
          emitConfig(json, this.responseURL);
        }
      } catch (e) { /* no es JSON, ignorar */ }
    });
    OrigOpen.apply(this, arguments);
  };

  // ---- Parchear fetch() ----
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = (typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url) || '';
    return origFetch.apply(this, args).then(response => {
      if (url.includes('vimeo') && (url.includes('/config') || url.includes('player'))) {
        response.clone().json().then(json => {
          if (isVimeoConfig(json)) emitConfig(json, url);
        }).catch(() => {});
      }
      return response;
    });
  };

  // ---- Detectar si la respuesta es un config del player ----
  function isVimeoConfig(json) {
    return (
      json &&
      json.request &&
      json.request.files &&
      json.cdn_url &&
      json.cdn_url.includes('vimeo')
    );
  }

  // ---- Emitir datos capturados a content-main.js ----
  function emitConfig(json, url) {
    // Guardar URL en DOM para fallback
    const existing = document.querySelector('.vdf-config-url');
    if (!existing) {
      const el = document.createElement('span');
      el.className = 'vdf-config-url';
      el.setAttribute('data-url', url);
      el.style.display = 'none';
      document.body.appendChild(el);
    } else {
      existing.setAttribute('data-url', url);
    }

    // Enviar mensaje al content script
    window.postMessage({
      type: 'VDF_CONFIG',
      payload: { config: json, configUrl: url }
    }, '*');
  }

  // ---- Analizar parametros de URL ----
  function parseParams(url) {
    const params = {};
    const qs = (url.split('?')[1] || '');
    qs.split('&').forEach(p => {
      const [k, v] = p.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  }

})();
