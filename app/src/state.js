// Neon Coast Cover Studio — shared state, layouts, presets and export sizes.
// Everything here is plain data: no network, no external assets.

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
};

// Built-in backdrops and sample photos. All four images were made for this
// entry with an image model: original art, no Rockstar content, no real people.
export const BACKDROPS = {
  sunset: { src: './assets/sunset-skyline.jpg', label: 'Sunset Coast' },
  neon: { src: './assets/neon-palm.jpg', label: 'Neon Nights' },
  gradient: { src: null, label: 'Gradient only' },
};

export const SAMPLE_PHOTOS = [
  { id: 'portrait', src: './assets/sample-portrait.jpg', label: 'Boardwalk portrait' },
  { id: 'group', src: './assets/sample-group.jpg', label: 'Beach friends' },
  { id: 'sunset', src: './assets/sunset-skyline.jpg', label: 'Sunset skyline' },
  { id: 'neon', src: './assets/neon-palm.jpg', label: 'Neon street' },
];

export const GRADES = {
  sunset: { label: 'Sunset', hint: 'Warm orange-pink wash, like golden hour' },
  neon: { label: 'Neon', hint: 'Magenta / cyan glow, like a night street' },
  golden: { label: 'Golden', hint: 'Soft warm light, gentle saturation' },
  none: { label: 'Original', hint: 'No colour grade, the photo as it is' },
};

export const TITLE_COLORS = [
  { value: '#ffffff', label: 'White' },
  { value: '#ffd60a', label: 'Sunset yellow' },
  { value: '#ff2e88', label: 'Neon pink' },
  { value: '#37e6ff', label: 'Neon cyan' },
];

export const TITLE_STYLES = {
  block: { label: 'Block', hint: 'Solid fill, hard shadow' },
  outline: { label: 'Outline', hint: 'Hollow letters, coloured edge' },
  glow: { label: 'Neon glow', hint: 'Soft coloured glow around the letters' },
};

// Panel layouts. Each panel is a fraction of the cover: x, y, w, h in 0..1.
// The hero panel is the big one on the left; the rest stack on the right.
export const LAYOUTS = {
  hero3: {
    label: 'Hero + 3',
    hint: 'One big panel, three stacked beside it',
    panels: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 0.34 },
      { x: 0.58, y: 0.34, w: 0.42, h: 0.33 },
      { x: 0.58, y: 0.67, w: 0.42, h: 0.33 },
    ],
  },
  hero2: {
    label: 'Hero + 2',
    hint: 'One big panel, two tall ones beside it',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  grid4: {
    label: 'Grid 2 × 2',
    hint: 'Four equal panels',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
};

// One-click looks: layout + backdrop + grade + caption in a single press.
export const PRESETS = {
  sunsetHeist: {
    label: 'Sunset Heist',
    layout: 'hero3',
    backdrop: 'sunset',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'Neon Coast · Est. 2026',
    titleColor: '#ffffff',
    titleStyle: 'block',
  },
  neonNights: {
    label: 'Neon Nights',
    layout: 'hero2',
    backdrop: 'neon',
    grade: 'neon',
    title: 'NEON NIGHTS',
    subtitle: 'Downtown after dark',
    titleColor: '#37e6ff',
    titleStyle: 'glow',
  },
  goldenHour: {
    label: 'Golden Hour',
    layout: 'grid4',
    backdrop: 'gradient',
    grade: 'golden',
    title: 'GOLDEN HOUR',
    subtitle: 'Friends · Beach · Sunset',
    titleColor: '#ffd60a',
    titleStyle: 'outline',
  },
};

export function freshPanelState() {
  return { photo: null, zoom: 1, ox: 0, oy: 0, grade: 'inherit' };
}

export function defaultState() {
  return {
    layout: 'hero3',
    backdrop: 'sunset',
    grade: 'sunset',
    gradeStrength: 0.85,
    title: 'SUNSET HEIST',
    subtitle: 'Neon Coast · Est. 2026',
    titleColor: '#ffffff',
    titleStyle: 'block',
    titleSize: 1,
    // The photo library: each entry is { id, src, name, image? }.
    // image is the loaded HTMLImageElement, filled in by the editor.
    photos: [],
    panels: [freshPanelState(), freshPanelState(), freshPanelState(), freshPanelState()],
    selectedPanel: 0,
    size: '1080x1080',
  };
}

// Resize the panel list when the layout changes, keeping each panel's photo.
export function panelsForLayout(state, layoutKey) {
  const count = LAYOUTS[layoutKey].panels.length;
  const next = [];
  for (let i = 0; i < count; i += 1) {
    next.push(state.panels[i] ? { ...state.panels[i] } : freshPanelState());
  }
  return next;
}
