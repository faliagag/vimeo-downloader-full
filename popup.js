// ============================================================
// popup.js — Logica del popup
// Version full: sin paywall, todas las calidades disponibles
// ============================================================

(function () {
  'use strict';

  const bodyEl   = document.getElementById('body');
  const dotEl    = document.getElementById('dot');
  const statusEl = document.getElementById('statusMsg');
  const toastEl  = document.getElementById('toast');
  let toastT;

  // ---- Helpers UI ----
  function setStatus(state, text) {
    dotEl.className = 'dot ' + state;
    statusEl.textContent = text;
  }

  function toast(msg, type) {
    clearTimeout(toastT);
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + (type || '');
    toastT = setTimeout(() => { toastEl.className = 'toast'; }, 2600);
  }

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtBytes(b) {
    if (!b) return '';
    return b < 1048576 ? (b/1024).toFixed(0)+' KB' : (b/1048576).toFixed(1)+' MB';
  }

  function safeName(str) {
    return String(str || 'video').replace(/[^\w\-. ]/g,'_').replace(/\s+/g,'_').slice(0,80);
  }

  function qualityLabel(w, h) {
    if (!h) return 'Video';
    const labels = {2160:'4K UHD',1440:'2K QHD',1080:'1080p FHD',720:'720p HD',480:'480p',360:'360p',240:'240p'};
    return labels[h] || (h + 'p');
  }

  function badgeClass(h) {
    if (!h) return '';
    if (h >= 2160) return 'uhd';
    if (h >= 1080) return 'fhd';
    if (h >= 720)  return 'hd';
    return '';
  }

  // ---- Ordenar calidades ----
  function sortQualities(progressive) {
    return [...progressive].sort((a, b) => {
      const ah = parseInt(a.height || a.quality || 0);
      const bh = parseInt(b.height || b.quality || 0);
      return bh - ah;
    });
  }

  // ---- Render principal ----
  function renderVideos(config) {
    const title = (config.video && config.video.title) ? config.video.title : 'Video de Vimeo';
    const files = (config.request && config.request.files) ? config.request.files : {};
    const progressive = files.progressive || [];

    if (!progressive.length) {
      renderEmpty(
        'Sin descarga directa disponible',
        'Este video usa transmision HLS/DASH. Prueba reproducirlo completamente primero.'
      );
      return;
    }

    const sorted = sortQualities(progressive);
    const best   = sorted[0];

    setStatus('ok', 'Video detectado — elige calidad');

    let html = `<div class="video-title" title="${esc(title)}">🎬 ${esc(title)}</div>`;

    // Boton de mejor calidad
    const bestLabel    = qualityLabel(best.width, best.height);
    const bestFilename = safeName(title) + '_' + (best.height || 'best') + 'p.mp4';
    html += `
      <button class="btn-best" id="btnBest"
        data-url="${esc(best.url)}" data-filename="${esc(bestFilename)}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
        Descargar mejor calidad (${esc(bestLabel)})
      </button>`;

    // Lista de todas las calidades
    if (sorted.length > 1) {
      html += '<div class="divider">otras calidades</div>';
      html += '<div class="quality-list">';
      sorted.forEach((q, i) => {
        if (i === 0) return; // ya esta en el boton principal
        const lbl  = qualityLabel(q.width, q.height);
        const bc   = badgeClass(q.height);
        const size = fmtBytes(q.size);
        const fn   = safeName(title) + '_' + (q.height || i) + 'p.mp4';
        html += `
          <div class="quality-row">
            <div class="q-label">
              <span class="q-badge ${esc(bc)}">${esc(lbl)}</span>
              ${size ? `<span class="q-size">${esc(size)}</span>` : ''}
            </div>
            <button class="btn-dl" data-url="${esc(q.url)}" data-filename="${esc(fn)}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              Guardar
            </button>
          </div>`;
      });
      html += '</div>';
    }

    bodyEl.innerHTML = html;

    // Bind botones
    document.getElementById('btnBest').addEventListener('click', function () {
      download(this.dataset.url, this.dataset.filename, this);
    });
    bodyEl.querySelectorAll('.btn-dl').forEach(btn => {
      btn.addEventListener('click', function () {
        download(this.dataset.url, this.dataset.filename, this);
      });
    });
  }

  // ---- Iniciar descarga ----
  function download(url, filename, btn) {
    if (!url) { toast('URL no disponible', 'err'); return; }
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span style="opacity:.6">Descargando...</span>';
    }
    chrome.runtime.sendMessage({ command: 'download', url, filename }, res => {
      if (chrome.runtime.lastError || !res) {
        toast('Error al descargar', 'err');
        if (btn) { btn.disabled = false; restoreBtn(btn); }
        return;
      }
      toast('\u2713 Descarga iniciada', 'ok');
      setTimeout(() => { if (btn) { btn.disabled = false; restoreBtn(btn); } }, 2000);
    });
  }

  function restoreBtn(btn) {
    const isMain = btn.id === 'btnBest';
    btn.innerHTML = isMain
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg> Descargar mejor calidad'
      : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg> Guardar';
  }

  // ---- Fetch config desde URL ----
  function fetchConfig(configUrl) {
    setStatus('busy', 'Cargando configuracion del video...');
    chrome.runtime.sendMessage(
      { command: 'XMLHttpRequest', url: configUrl, method: 'GET' },
      res => {
        if (!res || res.status !== 200) {
          renderEmpty('No se pudo cargar el video.', 'Recarga la pagina, espera que el video empiece y vuelve a intentarlo.');
          return;
        }
        try {
          renderVideos(JSON.parse(res.responseText));
        } catch (e) {
          renderEmpty('Respuesta invalida.', 'El formato del video no es compatible.');
        }
      }
    );
  }

  // ---- Estado vacio ----
  function renderEmpty(title, hint) {
    setStatus('error', 'Sin video detectado');
    bodyEl.innerHTML = `
      <div class="state-box">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
        <div class="state-title">${esc(title)}</div>
        <div class="state-hint">${esc(hint)}</div>
        <button class="btn-retry" id="btnRetry">↺ Reintentar</button>
      </div>`;
    document.getElementById('btnRetry').addEventListener('click', init);
  }

  // ---- Inicio ----
  function init() {
    setStatus('busy', 'Detectando video...');
    bodyEl.innerHTML = '<div class="state-box"><div class="spinner"></div><div class="state-hint">Buscando video...</div></div>';

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]) { renderEmpty('Sin pestatna activa.', ''); return; }

      chrome.tabs.sendMessage(tabs[0].id, { cmd: 'getConfig' }, res => {
        if (chrome.runtime.lastError || !res) {
          renderEmpty(
            'No se pudo conectar con la pagina.',
            'Recarga la pagina de Vimeo y vuelve a abrir la extension.'
          );
          return;
        }
        if (res.config) {
          renderVideos(res.config);
        } else if (res.configUrl) {
          fetchConfig(res.configUrl);
        } else {
          renderEmpty(
            'No se detecto ningun video de Vimeo.',
            'Abre un video de Vimeo, espera que empiece a reproducirse y luego abre esta extension.'
          );
        }
      });
    });
  }

  init();

})();
