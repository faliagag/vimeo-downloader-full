// ============================================================
// background.js — Service Worker
// Maneja descargas y peticiones proxy para evitar errores 403
// ============================================================

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

  // ---- Proxy de config del player de Vimeo ----
  if (msg.command === 'XMLHttpRequest') {
    let retries = msg.checkIsPrivate ? 1 : 4;
    const doFetch = () => {
      if (retries <= 0) {
        sendResponse({ status: 500, responseText: 'Error: sin reintentos disponibles' });
        return;
      }
      retries--;
      const opts = msg.checkIsPrivate
        ? { method: msg.method || 'GET', credentials: 'omit', headers: { 'Content-Type': 'application/json' } }
        : { method: msg.method || 'GET', headers: { 'Content-Type': 'application/json' } };
      fetch(msg.url, opts)
        .then(res => {
          const status = res.status;
          return res.json().then(data => {
            if (status === 200) {
              sendResponse({ status, responseText: JSON.stringify(data) });
            } else {
              doFetch();
            }
          });
        })
        .catch(() => doFetch());
    };
    doFetch();
    return true;
  }

  // ---- Peticion con headers personalizados ----
  if (msg.command === 'XMLHttpRequestHeader') {
    fetch(msg.url, { method: msg.method || 'GET', headers: new Headers(msg.headers || {}) })
      .then(async res => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          sendResponse({ data });
        } else {
          const text = await res.text();
          sendResponse({ data: { text }, contentType: ct });
        }
      })
      .catch(() => sendResponse({ data: null }));
    return true;
  }

  // ---- Obtener HTML del player de Vimeo ----
  if (msg.command === 'player-vimeo') {
    fetch(msg.url)
      .then(r => r.text())
      .then(html => sendResponse({ data: html }))
      .catch(() => sendResponse({ data: null }));
    return true;
  }

  // ---- Iniciar descarga con chrome.downloads ----
  if (msg.command === 'download') {
    chrome.downloads.download(
      { url: msg.url, filename: (msg.filename || 'video.mp4').trim() },
      downloadId => sendResponse({ downloadId })
    );
    return true;
  }

  // ---- Obtener URL de la tab activa ----
  if (msg.command === 'urlFind') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      sendResponse({ url: tabs[0] ? tabs[0].url : '' });
    });
    return true;
  }

  // ---- Notificar al content script al cambiar tab ----
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      chrome.tabs.sendMessage(tabId, { cmd: 'videoChange' }).catch(() => {});
    }
  });

});
