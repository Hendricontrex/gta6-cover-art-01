// Neon Coast Cover Studio — deterministic renders for screenshots.
// ?shot=cover draws one exported cover full-window at the requested size.
// ?shot=editor opens the editor with a sample photo already loaded.
// These are the app's own drawings, used to take its screenshots.

import { EXPORT_SIZES, SAMPLE_PHOTOS, panelsForLayout } from './state.js';
import { drawCover } from './render.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

// Fill every panel with the chosen sample photo, so a cover shot needs no clicks.
export async function renderCoverShot(state, images, backdropImages, params) {
  const photoId = params.get('photo') || 'group';
  const sizeKey = params.get('size') || '1080x1080';
  const size = EXPORT_SIZES[sizeKey] || EXPORT_SIZES['1080x1080'];
  if (params.get('caption')) state.title = params.get('caption');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('backdrop')) state.backdrop = params.get('backdrop');
  if (params.get('layout')) {
    state.layout = params.get('layout');
    state.panels = panelsForLayout(state, state.layout);
  }

  const sample = SAMPLE_PHOTOS.find((s) => s.id === photoId) || SAMPLE_PHOTOS[1];
  // Fill the panels with several different samples, round-robin from the
  // chosen one, so a cover shot shows the multi-photo look at once.
  const start = SAMPLE_PHOTOS.indexOf(sample);
  for (const s of SAMPLE_PHOTOS) {
    if (!images.has(s.id)) {
      images.set(s.id, await loadImage(s.src));
      if (!state.photos.some((p) => p.id === s.id)) {
        state.photos.push({ id: s.id, src: s.src, name: s.label });
      }
    }
  }
  state.panels.forEach((p, i) => {
    p.photo = SAMPLE_PHOTOS[(start + i) % SAMPLE_PHOTOS.length].id;
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'shot-cover';
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.objectFit = 'contain';
  canvas.style.background = '#0a0812';
  document.body.innerHTML = '';
  document.body.appendChild(canvas);
  document.body.style.margin = '0';
  document.body.style.background = '#0a0812';
  drawCover(canvas.getContext('2d'), size.w, size.h, state, images, backdropImages.get(state.backdrop) || null);
  return { w: size.w, h: size.h };
}

// Open the editor preloaded with a sample photo, for the editor screenshot.
export async function preloadEditorSample(state, images, params) {
  const photoId = params.get('photo') || 'portrait';
  if (params.get('caption')) state.title = params.get('caption');
  if (params.get('grade')) state.grade = params.get('grade');
  const sample = SAMPLE_PHOTOS.find((s) => s.id === photoId) || SAMPLE_PHOTOS[0];
  const start = SAMPLE_PHOTOS.indexOf(sample);
  for (const s of SAMPLE_PHOTOS) {
    if (!images.has(s.id)) {
      images.set(s.id, await loadImage(s.src));
      state.photos.push({ id: s.id, src: s.src, name: s.label });
    }
  }
  // Several different photos across the panels, hero first.
  state.panels.forEach((p, i) => {
    p.photo = SAMPLE_PHOTOS[(start + i) % SAMPLE_PHOTOS.length].id;
    p.zoom = i === 0 ? 1.15 : 1;
    p.ox = 0;
    p.oy = 0;
  });
  return sample;
}
