// Neon Coast Cover Studio — the editor: photo library, panel picking,
// drag-to-pan, zoom, caption controls and PNG export. All client-side;
// photos are read on the machine and never leave it.

import {
  EXPORT_SIZES, LAYOUTS, PRESETS, panelsForLayout,
} from './state.js';
import { drawCover, pickPanel } from './render.js';

let photoCounter = 0;

export class CoverEditor {
  constructor(root, state, images, backdropImages) {
    this.root = root;
    this.state = state;
    this.images = images; // Map photo id -> HTMLImageElement
    this.backdropImages = backdropImages; // Map backdrop key -> HTMLImageElement
    this.preview = root.querySelector('#preview');
    this.pctx = this.preview.getContext('2d');
    this.drag = null;
    this.bindControls();
    this.renderPreview();
  }

  // ---- photos -----------------------------------------------------------

  addPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        photoCounter += 1;
        const photo = { id: `upload-${photoCounter}`, src: url, name: file.name, image: img };
        this.state.photos.push(photo);
        this.images.set(photo.id, img);
        this.assignPhotoToFirstEmptyPanel(photo.id);
        this.refreshPhotoTray();
        this.renderPreview();
        resolve(photo);
      };
      img.onerror = () => reject(new Error(`Could not read ${file.name}`));
      img.src = url;
    });
  }

  addBuiltInPhoto(sample) {
    const img = new Image();
    img.onload = () => {
      this.state.photos.push({ id: sample.id, src: sample.src, name: sample.label, image: img });
      this.images.set(sample.id, img);
      this.assignPhotoToFirstEmptyPanel(sample.id);
      this.refreshPhotoTray();
      this.renderPreview();
    };
    img.src = sample.src;
  }

  assignPhotoToFirstEmptyPanel(photoId) {
    const empty = this.state.panels.findIndex((p) => !p.photo);
    const target = empty >= 0 ? empty : this.state.selectedPanel;
    this.state.panels[target].photo = photoId;
    this.state.panels[target].zoom = 1;
    this.state.panels[target].ox = 0;
    this.state.panels[target].oy = 0;
    this.state.selectedPanel = target;
  }

  fillAllPanelsWithPhoto(photoId) {
    this.state.panels.forEach((p) => {
      p.photo = photoId;
      p.zoom = 1;
      p.ox = 0;
      p.oy = 0;
    });
    this.renderPreview();
  }

  // ---- rendering ----------------------------------------------------------

  renderPreview() {
    const w = this.preview.width;
    const h = this.preview.height;
    drawCover(this.pctx, w, h, this.state, this.images, this.backdropImages.get(this.state.backdrop) || null);
    this.highlightSelectedPanel();
    this.syncPanelControls();
  }

  highlightSelectedPanel() {
    const ctx = this.pctx;
    const w = this.preview.width;
    const h = this.preview.height;
    const gutter = Math.round(w * 0.012);
    const slot = LAYOUTS[this.state.layout].panels[this.state.selectedPanel];
    if (!slot) return;
    ctx.save();
    ctx.lineWidth = Math.max(3, w * 0.008);
    ctx.strokeStyle = '#ffd60a';
    ctx.setLineDash([w * 0.02, w * 0.012]);
    ctx.strokeRect(
      slot.x * w + (slot.x > 0 ? gutter / 2 : 0) + 2,
      slot.y * h + (slot.y > 0 ? gutter / 2 : 0) + 2,
      slot.w * w - gutter - 4,
      slot.h * h - gutter - 4,
    );
    ctx.restore();
  }

  // ---- export -------------------------------------------------------------

  exportPNG(sizeKey) {
    const size = EXPORT_SIZES[sizeKey];
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    drawCover(ctx, size.w, size.h, this.state, this.images, this.backdropImages.get(this.state.backdrop) || null);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve({ blob, w: size.w, h: size.h }), 'image/png');
    });
  }

  async downloadExport(sizeKey) {
    const { blob, w, h } = await this.exportPNG(sizeKey);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    this.setStatus(`Exported ${w} × ${h} PNG — check your downloads.`);
    return { blob, w, h };
  }

  async downloadAllSizes() {
    for (const key of Object.keys(EXPORT_SIZES)) {
      // eslint-disable-next-line no-await-in-loop
      await this.downloadExport(key);
    }
    this.setStatus('Exported all three post sizes.');
  }

  // ---- controls -----------------------------------------------------------

  setStatus(text) {
    const el = this.root.querySelector('#status');
    if (el) el.textContent = text;
  }

  refreshPhotoTray() {
    const tray = this.root.querySelector('#photo-tray');
    tray.innerHTML = '';
    this.state.photos.forEach((photo) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tray-item';
      btn.title = `${photo.name} — click to put it in the selected panel`;
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = photo.name;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        this.state.panels[this.state.selectedPanel].photo = photo.id;
        this.renderPreview();
        this.setStatus(`Panel ${this.state.selectedPanel + 1} now shows ${photo.name}.`);
      });
      btn.addEventListener('dblclick', () => this.fillAllPanelsWithPhoto(photo.id));
      tray.appendChild(btn);
    });
    const hint = document.createElement('p');
    hint.className = 'tray-hint';
    hint.textContent = this.state.photos.length
      ? 'Click a photo to fill the selected panel · double-click to fill every panel.'
      : 'Add a photo below, or pick a sample.';
    tray.appendChild(hint);
  }

  syncPanelControls() {
    const panel = this.state.panels[this.state.selectedPanel];
    if (!panel) return;
    const zoom = this.root.querySelector('#panel-zoom');
    const ox = this.root.querySelector('#panel-x');
    const oy = this.root.querySelector('#panel-y');
    if (zoom) zoom.value = panel.zoom;
    if (ox) ox.value = panel.ox;
    if (oy) oy.value = panel.oy;
    const label = this.root.querySelector('#panel-label');
    if (label) label.textContent = `Panel ${this.state.selectedPanel + 1} of ${this.state.panels.length}`;
    const grade = this.root.querySelector('#panel-grade');
    if (grade) grade.value = panel.grade;
  }

  applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    this.state.layout = preset.layout;
    this.state.backdrop = preset.backdrop;
    this.state.grade = preset.grade;
    this.state.title = preset.title;
    this.state.subtitle = preset.subtitle;
    this.state.titleColor = preset.titleColor;
    this.state.titleStyle = preset.titleStyle;
    this.state.panels = panelsForLayout(this.state, preset.layout);
    this.state.selectedPanel = 0;
    this.syncAllControls();
    this.renderPreview();
    this.setStatus(`Look applied: ${preset.label}.`);
  }

  syncAllControls() {
    const q = (sel) => this.root.querySelector(sel);
    if (q('#layout')) q('#layout').value = this.state.layout;
    if (q('#backdrop')) q('#backdrop').value = this.state.backdrop;
    if (q('#grade')) q('#grade').value = this.state.grade;
    if (q('#grade-strength')) q('#grade-strength').value = this.state.gradeStrength;
    if (q('#title')) q('#title').value = this.state.title;
    if (q('#subtitle')) q('#subtitle').value = this.state.subtitle;
    if (q('#title-size')) q('#title-size').value = this.state.titleSize;
    if (q('#title-style')) q('#title-style').value = this.state.titleStyle;
    this.root.querySelectorAll('input[name="title-color"]').forEach((r) => {
      r.checked = r.value === this.state.titleColor;
    });
    this.root.querySelectorAll('input[name="export-size"]').forEach((r) => {
      r.checked = r.value === this.state.size;
    });
  }

  bindControls() {
    const q = (sel) => this.root.querySelector(sel);
    const on = (sel, event, fn) => {
      const el = q(sel);
      if (el) el.addEventListener(event, fn);
    };

    // Photo upload: file picker and drag-and-drop onto the preview.
    on('#photo-input', 'change', async (e) => {
      const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await this.addPhotoFile(file);
      }
      this.setStatus(files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} added.` : 'No image files chosen.');
      e.target.value = '';
    });
    const drop = q('#preview-wrap');
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dropping'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('dropping'));
    drop.addEventListener('drop', async (e) => {
      e.preventDefault();
      drop.classList.remove('dropping');
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        await this.addPhotoFile(file);
      }
      if (files.length) this.setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} dropped in.`);
    });

    // Sample photos.
    this.root.querySelectorAll('[data-sample]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sample = JSON.parse(btn.dataset.sample);
        if (!this.state.photos.some((p) => p.id === sample.id)) this.addBuiltInPhoto(sample);
        else this.assignPhotoToFirstEmptyPanel(sample.id);
        this.renderPreview();
      });
    });

    // Layout, backdrop and grade.
    on('#layout', 'change', (e) => {
      this.state.layout = e.target.value;
      this.state.panels = panelsForLayout(this.state, this.state.layout);
      this.state.selectedPanel = 0;
      this.renderPreview();
    });
    on('#backdrop', 'change', (e) => { this.state.backdrop = e.target.value; this.renderPreview(); });
    on('#grade', 'change', (e) => { this.state.grade = e.target.value; this.renderPreview(); });
    on('#grade-strength', 'input', (e) => { this.state.gradeStrength = Number(e.target.value); this.renderPreview(); });

    // Caption.
    on('#title', 'input', (e) => { this.state.title = e.target.value; this.renderPreview(); });
    on('#subtitle', 'input', (e) => { this.state.subtitle = e.target.value; this.renderPreview(); });
    on('#title-size', 'input', (e) => { this.state.titleSize = Number(e.target.value); this.renderPreview(); });
    on('#title-style', 'change', (e) => { this.state.titleStyle = e.target.value; this.renderPreview(); });
    this.root.querySelectorAll('input[name="title-color"]').forEach((r) => {
      r.addEventListener('change', () => { this.state.titleColor = r.value; this.renderPreview(); });
    });

    // One-click looks.
    this.root.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
    });

    // Per-panel crop: sliders and drag on the preview.
    on('#panel-zoom', 'input', (e) => {
      this.state.panels[this.state.selectedPanel].zoom = Number(e.target.value);
      this.renderPreview();
    });
    on('#panel-x', 'input', (e) => {
      this.state.panels[this.state.selectedPanel].ox = Number(e.target.value);
      this.renderPreview();
    });
    on('#panel-y', 'input', (e) => {
      this.state.panels[this.state.selectedPanel].oy = Number(e.target.value);
      this.renderPreview();
    });
    on('#panel-grade', 'change', (e) => {
      this.state.panels[this.state.selectedPanel].grade = e.target.value;
      this.renderPreview();
    });
    on('#panel-fit', 'click', () => {
      const p = this.state.panels[this.state.selectedPanel];
      p.zoom = 1; p.ox = 0; p.oy = 0;
      this.renderPreview();
    });
    on('#panel-fill-all', 'click', () => {
      const p = this.state.panels[this.state.selectedPanel];
      if (p.photo) this.fillAllPanelsWithPhoto(p.photo);
    });

    this.preview.addEventListener('pointerdown', (e) => {
      const rect = this.preview.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * this.preview.width;
      const py = ((e.clientY - rect.top) / rect.height) * this.preview.height;
      const hit = pickPanel(this.preview.width, this.preview.height, this.state.layout, px, py);
      if (hit >= 0) {
        this.state.selectedPanel = hit;
        this.drag = { x: px, y: py, ox: this.state.panels[hit].ox, oy: this.state.panels[hit].oy };
        this.preview.setPointerCapture(e.pointerId);
        this.renderPreview();
      }
    });
    this.preview.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const rect = this.preview.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * this.preview.width;
      const py = ((e.clientY - rect.top) / rect.height) * this.preview.height;
      const panel = this.state.panels[this.state.selectedPanel];
      panel.ox = this.drag.ox + (px - this.drag.x) / this.preview.width;
      panel.oy = this.drag.oy + (py - this.drag.y) / this.preview.height;
      panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox));
      panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy));
      this.renderPreview();
    });
    this.preview.addEventListener('pointerup', () => { this.drag = null; });
    this.preview.addEventListener('wheel', (e) => {
      e.preventDefault();
      const panel = this.state.panels[this.state.selectedPanel];
      panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
      this.renderPreview();
    }, { passive: false });

    // Export.
    this.root.querySelectorAll('input[name="export-size"]').forEach((r) => {
      r.addEventListener('change', () => { this.state.size = r.value; });
    });
    on('#export', 'click', () => this.downloadExport(this.state.size));
    on('#export-all', 'click', () => this.downloadAllSizes());
  }
}
