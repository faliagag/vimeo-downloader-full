// ============================================================
// content-main.js — Content script principal (mundo aislado)
// Puente entre la pagina y el popup/background
// ============================================================

(function () {
  'use strict';

  let capturedConfig = null;
  let capturedUrl = null;

  // Escuchar mensajes del mundo MAIN (ajax-listener.js)
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'VDF_CONFIG') return;
    capturedConfig = event.data.payload.config;
    capturedUrl    = event.data.payload.configUrl;
  });

  // Responder al popup
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

    if (msg.cmd === 'getConfig') {
      if (capturedConfig) {
        sendResponse({ config: capturedConfig, configUrl: capturedUrl });
      } else {
        // Fallback: buscar URL en el DOM
        const el = document.querySelector('.vdf-config-url');
        const url = el ? el.getAttribute('data-url') : null;
        sendResponse({ config: null, configUrl: url });
      }
      return true;
    }

    // Limpiar al cambiar de video
    if (msg.cmd === 'videoChange') {
      capturedConfig = null;
      capturedUrl    = null;
    }
  });

})();
