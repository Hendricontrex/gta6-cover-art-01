// Neon Coast Cover Studio — the cover renderer.
// drawCover paints the whole poster on any 2d canvas context at any size:
// backdrop, photo panels with per-panel crop, colour grade, title lettering.
// It is pure: it only reads the state object and the loaded images.

import { LAYOUTS, BACKDROPS } from './state.js';

const TITLE_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const SUBTITLE_FONT = '"Helvetica Neue", Arial, sans-serif';

// Draw an image so it covers a rectangle, honouring a per-panel crop:
// zoom scales the photo, ox/oy slide it inside the frame (-0.5..0.5).
export function drawCoverFit(ctx, image, rect, zoom, ox, oy) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(image, dx, dy, dw, dh);
}

// A warm sunset gradient used when no backdrop photo is chosen.
export function paintSunsetGradient(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2b1055');
  g.addColorStop(0.45, '#7597de');
  g.addColorStop(0.7, '#ff7e5f');
  g.addColorStop(1, '#feb47b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.62, 0, w * 0.5, h * 0.62, w * 0.22);
  sun.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  sun.addColorStop(0.5, 'rgba(255, 170, 90, 0.55)');
  sun.addColorStop(1, 'rgba(255, 170, 90, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
}

// Colour grade painted over a photo rect. strength is 0..1.
export function paintGradeOverlay(ctx, rect, grade, strength) {
  if (grade === 'none' || strength <= 0) return;
  ctx.save();
  if (grade === 'sunset') {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, `rgba(255, 110, 20, ${0.16 * strength})`);
    g.addColorStop(1, `rgba(255, 0, 90, ${0.22 * strength})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (grade === 'neon') {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    g.addColorStop(0, `rgba(255, 46, 136, ${0.28 * strength})`);
    g.addColorStop(0.5, `rgba(120, 40, 220, ${0.14 * strength})`);
    g.addColorStop(1, `rgba(55, 230, 255, ${0.28 * strength})`);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (grade === 'golden') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(255, 180, 60, ${0.18 * strength})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = `rgba(255, 200, 120, ${0.12 * strength})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

// One photo panel: clipped photo, grade, white frame and soft shadow.
export function drawPhotoPanel(ctx, image, rect, panel, grade, gradeStrength) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = rect.w * 0.03;
  ctx.shadowOffsetY = rect.w * 0.008;
  ctx.fillStyle = '#111';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (image) {
    drawCoverFit(ctx, image, rect, panel.zoom, panel.ox, panel.oy);
    const panelGrade = panel.grade === 'inherit' ? grade : panel.grade;
    paintGradeOverlay(ctx, rect, panelGrade, gradeStrength);
  } else {
    ctx.fillStyle = '#1c1c26';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 ${Math.round(rect.h * 0.07)}px ${SUBTITLE_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Drop a photo here', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();

  const frame = Math.max(2, rect.w * 0.008);
  ctx.lineWidth = frame;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(rect.x + frame / 2, rect.y + frame / 2, rect.w - frame, rect.h - frame);
}

// Big bold poster lettering: heavy weight, slight backward slant, thick
// outline and a hard offset shadow. No font file needed — system fonts only.
export function drawPosterTitle(ctx, text, box, size, color, style) {
  const upper = (text || 'UNTITLED').toUpperCase();
  let fontSize = size;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Shrink until the title fits the box.
  for (;;) {
    ctx.font = `900 ${fontSize}px ${TITLE_FONT}`;
    if (ctx.measureText(upper).width <= box.w || fontSize <= 12) break;
    fontSize *= 0.92;
  }
  const x = box.x;
  const y = box.y + box.h * 0.72;
  // A slight slant, like hand-lettered poster type, anchored at the
  // baseline so the slant never pushes the first letter off the canvas.
  ctx.transform(1, 0, -0.06, 1, 0.06 * y, 0);
  const outline = Math.max(2, fontSize * 0.09);
  if (style === 'glow') {
    ctx.shadowColor = color;
    ctx.shadowBlur = fontSize * 0.35;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = fontSize * 0.045;
    ctx.shadowOffsetY = fontSize * 0.045;
  }
  ctx.lineJoin = 'round';
  ctx.lineWidth = outline;
  ctx.strokeStyle = style === 'outline' ? color : '#14101c';
  ctx.strokeText(upper, x, y);
  if (style === 'outline') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
  } else {
    ctx.fillStyle = color;
  }
  ctx.fillText(upper, x, y);
  ctx.restore();
  return fontSize;
}

export function drawSubtitle(ctx, text, x, y, size, color) {
  ctx.save();
  ctx.font = `700 ${size}px ${SUBTITLE_FONT}`;
  try { ctx.letterSpacing = `${Math.round(size * 0.22)}px`; } catch (e) { /* older canvas */ }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = size * 0.2;
  ctx.fillText((text || '').toUpperCase(), x, y);
  ctx.restore();
}

// The whole poster. images is a Map from photo id to a loaded image element;
// backdropImage is the loaded backdrop image (or null for the gradient).
export function drawCover(ctx, w, h, state, images, backdropImage) {
  ctx.clearRect(0, 0, w, h);
  const backdrop = BACKDROPS[state.backdrop];
  if (backdrop && backdrop.src && backdropImage) {
    drawCoverFit(ctx, backdropImage, { x: 0, y: 0, w, h }, 1, 0, 0);
    ctx.fillStyle = 'rgba(10, 8, 24, 0.18)';
    ctx.fillRect(0, 0, w, h);
  } else {
    paintSunsetGradient(ctx, w, h);
  }

  const layout = LAYOUTS[state.layout];
  const gutter = Math.round(w * 0.012);
  layout.panels.forEach((slot, i) => {
    const rect = {
      x: slot.x * w + (slot.x > 0 ? gutter / 2 : 0),
      y: slot.y * h + (slot.y > 0 ? gutter / 2 : 0),
      w: slot.w * w - gutter,
      h: slot.h * h - gutter,
    };
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0, grade: 'inherit' };
    const photo = panel.photo ? state.photos.find((p) => p.id === panel.photo) : null;
    const image = photo ? images.get(photo.id) || null : null;
    drawPhotoPanel(ctx, image, rect, panel, state.grade, state.gradeStrength);
  });

  // Dark scrim under the title so the lettering reads on any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.68, 0, h);
  scrim.addColorStop(0, 'rgba(8, 6, 18, 0)');
  scrim.addColorStop(1, 'rgba(8, 6, 18, 0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  const pad = w * 0.045;
  const titleBox = { x: pad, y: h * 0.78, w: w - pad * 2, h: h * 0.14 };
  const titleSize = drawPosterTitle(
    ctx, state.title, titleBox, h * 0.115 * state.titleSize, state.titleColor, state.titleStyle,
  );
  drawSubtitle(ctx, state.subtitle, pad, h * 0.965, Math.max(12, h * 0.028), 'rgba(255,255,255,0.92)');

  // Accent bar under the subtitle, in the title colour.
  ctx.fillStyle = state.titleColor;
  ctx.fillRect(pad, h * 0.975, w * 0.16, Math.max(3, h * 0.006));
  return titleSize;
}

// Panel rectangles in canvas pixels, for hit-testing a click or drag.
export function panelRects(w, h, layoutKey) {
  const gutter = Math.round(w * 0.012);
  return LAYOUTS[layoutKey].panels.map((slot) => ({
    x: slot.x * w + (slot.x > 0 ? gutter / 2 : 0),
    y: slot.y * h + (slot.y > 0 ? gutter / 2 : 0),
    w: slot.w * w - gutter,
    h: slot.h * h - gutter,
  }));
}

export function pickPanel(w, h, layoutKey, px, py) {
  const rects = panelRects(w, h, layoutKey);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
