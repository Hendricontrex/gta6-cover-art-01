// Neon Coast Cover Studio — entry point.
// Loads the built-in backdrops, builds the editor, and exposes a small
// handle (window.__coverStudio) so the app can be driven and tested.

import { defaultState, SAMPLE_PHOTOS, BACKDROPS, EXPORT_SIZES, TITLE_COLORS } from './state.js';
import { CoverEditor } from './editor.js';
import { renderCoverShot, preloadEditorSample } from './shots.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function buildSampleButtons() {
  const wrap = document.querySelector('#samples');
  SAMPLE_PHOTOS.forEach((sample) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sample-btn';
    btn.dataset.sample = JSON.stringify(sample);
    const img = document.createElement('img');
    img.src = sample.src;
    img.alt = sample.label;
    img.loading = 'lazy';
    const span = document.createElement('span');
    span.textContent = sample.label;
    btn.append(img, span);
    wrap.appendChild(btn);
  });
}

function buildTitleColorSwatches(state) {
  const wrap = document.querySelector('#title-colors');
  TITLE_COLORS.forEach((color, i) => {
    const label = document.createElement('label');
    label.className = 'swatch';
    label.title = color.label;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'title-color';
    input.value = color.value;
    input.checked = i === 0;
    const dot = document.createElement('span');
    dot.className = 'swatch-dot';
    dot.style.background = color.value;
    label.append(input, dot);
    wrap.appendChild(label);
  });
}

async function main() {
  const params = new URLSearchParams(window.location.search);
  const state = defaultState();
  const images = new Map();
  const backdropImages = new Map();

  // Backdrops are local files under app/assets — nothing loads over the network.
  for (const [key, backdrop] of Object.entries(BACKDROPS)) {
    if (backdrop.src) {
      try {
        backdropImages.set(key, await loadImage(backdrop.src));
      } catch (e) {
        console.warn(`Backdrop ${key} failed to load, using the gradient instead.`);
      }
    }
  }

  if (params.get('shot') === 'cover') {
    const shot = await renderCoverShot(state, images, backdropImages, params);
    window.__coverStudio = { state, shot };
    document.title = 'Cover — Neon Coast Cover Studio';
    return;
  }

  buildSampleButtons();
  buildTitleColorSwatches(state);
  const editor = new CoverEditor(document, state, images, backdropImages);
  if (params.get('shot') === 'editor') {
    await preloadEditorSample(state, images, params);
    editor.refreshPhotoTray();
    editor.renderPreview();
    editor.setStatus('Sample photo loaded — drag it, crop it, then export.');
  } else {
    editor.refreshPhotoTray();
  }

  // Test and automation handle: export a PNG as a data URL without a download.
  window.__coverStudio = {
    state,
    editor,
    exportDataUrl: async (sizeKey) => {
      const { blob } = await editor.exportPNG(sizeKey || state.size);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    },
    exportSizes: Object.keys(EXPORT_SIZES),
  };
}

main().catch((err) => {
  const status = document.querySelector('#status');
  if (status) status.textContent = `Could not start: ${err.message}`;
  console.error(err);
});
