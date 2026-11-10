'use strict';

const COLORS = [
  { code: 'B01', name: '奶白', hex: '#F7F3E8' },
  { code: 'B02', name: '纯白', hex: '#FFFFFF' },
  { code: 'B03', name: '浅灰', hex: '#D5D5CF' },
  { code: 'B04', name: '中灰', hex: '#969A96' },
  { code: 'B05', name: '深灰', hex: '#555B58' },
  { code: 'B06', name: '黑色', hex: '#252927' },
  { code: 'R01', name: '浅粉', hex: '#F7C8C4' },
  { code: 'R02', name: '珊瑚粉', hex: '#F19A91' },
  { code: 'R03', name: '红色', hex: '#D94B45' },
  { code: 'R04', name: '深红', hex: '#9E3435' },
  { code: 'O01', name: '杏色', hex: '#F5C79F' },
  { code: 'O02', name: '橙色', hex: '#ED8B45' },
  { code: 'O03', name: '焦糖', hex: '#B96136' },
  { code: 'Y01', name: '奶油黄', hex: '#F7E7A4' },
  { code: 'Y02', name: '明黄', hex: '#F2CA4C' },
  { code: 'Y03', name: '金黄', hex: '#D7A52D' },
  { code: 'G01', name: '薄荷绿', hex: '#B7DAB6' },
  { code: 'G02', name: '浅绿', hex: '#82BD83' },
  { code: 'G03', name: '草绿', hex: '#55945D' },
  { code: 'G04', name: '深绿', hex: '#32644C' },
  { code: 'C01', name: '浅青', hex: '#B8DCDD' },
  { code: 'C02', name: '湖蓝', hex: '#64B4BC' },
  { code: 'C03', name: '青蓝', hex: '#388C9E' },
  { code: 'L01', name: '婴儿蓝', hex: '#BCD3E8' },
  { code: 'L02', name: '天蓝', hex: '#78A8D0' },
  { code: 'L03', name: '蓝色', hex: '#4676A9' },
  { code: 'L04', name: '藏蓝', hex: '#344B70' },
  { code: 'P01', name: '浅紫', hex: '#D4C3DF' },
  { code: 'P02', name: '薰衣草', hex: '#AA8EC1' },
  { code: 'P03', name: '紫色', hex: '#765B91' },
  { code: 'N01', name: '肤色', hex: '#EDC5A3' },
  { code: 'N02', name: '浅棕', hex: '#C49A72' },
  { code: 'N03', name: '棕色', hex: '#8B6046' },
  { code: 'N04', name: '深棕', hex: '#593F35' },
  { code: 'S01', name: '淡黄', hex: '#FFF5D6' },
  { code: 'S02', name: '浅蜜桃', hex: '#F9DFCA' }
].map((color, index) => ({ ...color, index, rgb: hexToRgb(color.hex) }));

const PALETTES = {
  classic: [0,1,2,3,4,5,6,7,8,10,11,13,14,16,17,18,19,20,21,22,23,24,26,30],
  full: COLORS.map((_, index) => index),
  soft: [0,2,6,7,10,13,14,16,17,20,23,27,28,30,34,35]
};

const state = {
  source: null,
  sourceName: '像素小花',
  pattern: null,
  usedColors: [],
  zoom: 1,
  fitScale: 1,
  highlight: null,
  showAllColors: false,
  conversionTimer: null,
  toastTimer: null
};

const el = {};
const IDS = [
  'imageInput','uploadZone','sourceImage','sourceName','sourceInfo','useSample','widthRange','widthValue',
  'colorRange','colorValue','paletteSelect','ditherToggle','backgroundToggle','gridToggle','symbolToggle',
  'resetSettings','dimensionHint','previewDimensions','patternCanvas','canvasStage','canvasHolder','processing',
  'zoomOut','zoomIn','zoomValue','fitCanvas','clearHighlight','totalBeads','summarySize','actualColors',
  'colorList','showAllColors','exportPng','exportCsv','topExport','printPattern','printImage','printMeta',
  'guideDialog','openGuide','closeGuide','startCreating','toast'
];

document.addEventListener('DOMContentLoaded', init);

function init() {
  IDS.forEach(id => { el[id] = document.getElementById(id); });
  bindEvents();
  updateRange(el.widthRange);
  updateRange(el.colorRange);
  loadSample();
}

function bindEvents() {
  el.imageInput.addEventListener('change', event => {
    if (event.target.files[0]) loadFile(event.target.files[0]);
    event.target.value = '';
  });

  ['dragenter', 'dragover'].forEach(type => el.uploadZone.addEventListener(type, event => {
    event.preventDefault();
    el.uploadZone.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(type => el.uploadZone.addEventListener(type, event => {
    event.preventDefault();
    el.uploadZone.classList.remove('dragging');
  }));
  el.uploadZone.addEventListener('drop', event => {
    const file = event.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  el.useSample.addEventListener('click', loadSample);
  [el.widthRange, el.colorRange].forEach(input => input.addEventListener('input', () => {
    updateRange(input);
    syncControlLabels();
    scheduleConversion();
  }));
  [el.paletteSelect, el.ditherToggle, el.backgroundToggle].forEach(input => {
    input.addEventListener('change', scheduleConversion);
  });
  [el.gridToggle, el.symbolToggle].forEach(input => input.addEventListener('change', () => {
    state.highlight = null;
    renderPreview();
  }));

  el.resetSettings.addEventListener('click', resetSettings);
  el.zoomIn.addEventListener('click', () => setZoom(state.zoom + .2));
  el.zoomOut.addEventListener('click', () => setZoom(state.zoom - .2));
  el.fitCanvas.addEventListener('click', () => setZoom(1));
  el.patternCanvas.addEventListener('click', handleCanvasClick);
  el.clearHighlight.addEventListener('click', clearHighlight);
  el.showAllColors.addEventListener('click', () => {
    state.showAllColors = !state.showAllColors;
    renderColorList();
  });

  [el.exportPng, el.topExport].forEach(button => button.addEventListener('click', exportPng));
  el.exportCsv.addEventListener('click', exportCsv);
  el.printPattern.addEventListener('click', printPattern);

  el.openGuide.addEventListener('click', () => el.guideDialog.showModal());
  el.closeGuide.addEventListener('click', () => el.guideDialog.close());
  el.startCreating.addEventListener('click', () => el.guideDialog.close());
  el.guideDialog.addEventListener('click', event => {
    if (event.target === el.guideDialog) el.guideDialog.close();
  });

  window.addEventListener('resize', debounce(updateCanvasDisplay, 100));
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function updateRange(input) {
  const progress = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
  input.style.setProperty('--range-progress', `${progress}%`);
}

function syncControlLabels() {
  el.widthValue.textContent = `${el.widthRange.value} 豆`;
  el.colorValue.textContent = `${el.colorRange.value} 色`;
}

function resetSettings() {
  el.widthRange.value = 32;
  el.colorRange.value = 16;
  el.paletteSelect.value = 'classic';
  el.ditherToggle.checked = false;
  el.backgroundToggle.checked = false;
  el.gridToggle.checked = true;
  el.symbolToggle.checked = false;
  updateRange(el.widthRange);
  updateRange(el.colorRange);
  syncControlLabels();
  scheduleConversion();
  showToast('已恢复默认设置');
}

function loadSample() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F6F0DF';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#F1D487';
  ctx.beginPath(); ctx.arc(393, 113, 45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#E6E4CB';
  ctx.beginPath(); ctx.ellipse(110, 389, 83, 20, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#56895D';
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(255, 337); ctx.quadraticCurveTo(245, 249, 270, 177); ctx.stroke();
  ctx.fillStyle = '#72A46D';
  ctx.beginPath(); ctx.ellipse(198, 273, 64, 28, .48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4F8259';
  ctx.beginPath(); ctx.ellipse(314, 253, 66, 29, -.55, 0, Math.PI * 2); ctx.fill();

  const petals = [[260,115,0],[320,151,.8],[298,213,1.6],[226,215,2.5],[199,150,3.4]];
  petals.forEach(([x,y,rotation], index) => {
    ctx.fillStyle = index % 2 ? '#EF9985' : '#F3AA96';
    ctx.beginPath(); ctx.ellipse(x, y, 55, 39, rotation, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#EBC453';
  ctx.beginPath(); ctx.arc(258, 166, 43, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#D9A83E';
  ctx.beginPath(); ctx.arc(258, 166, 17, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#CB7655';
  ctx.beginPath(); ctx.moveTo(160, 327); ctx.lineTo(350, 327); ctx.lineTo(324, 442); ctx.quadraticCurveTo(255, 466, 186, 442); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#E3976D';
  ctx.fillRect(150, 314, 210, 46);
  ctx.fillStyle = '#B76148';
  ctx.fillRect(182, 427, 146, 18);
  ctx.fillStyle = '#F2B189';
  ctx.fillRect(177, 370, 18, 48);

  const image = new Image();
  image.onload = () => setSource(image, '像素小花', '内置示例图片', canvas.toDataURL('image/png'));
  image.src = canvas.toDataURL('image/png');
}

function loadFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    showToast('请选择 JPG、PNG、WebP 或 GIF 图片');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showToast('图片超过 15 MB，请压缩后再试');
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => showToast('图片读取失败，请换一张试试');
  reader.onload = () => {
    const image = new Image();
    image.onload = () => setSource(image, file.name.replace(/\.[^.]+$/, ''), `${image.naturalWidth} × ${image.naturalHeight} px · ${formatFileSize(file.size)}`, reader.result);
    image.onerror = () => showToast('无法解析这张图片，请换一张试试');
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function setSource(image, name, info, previewSrc) {
  state.source = image;
  state.sourceName = name;
  state.highlight = null;
  el.sourceName.textContent = name;
  el.sourceName.title = name;
  el.sourceInfo.textContent = info;
  el.sourceImage.src = previewSrc;
  scheduleConversion();
}

function formatFileSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function scheduleConversion() {
  if (!state.source) return;
  clearTimeout(state.conversionTimer);
  el.processing.hidden = false;
  state.conversionTimer = setTimeout(() => {
    try {
      convertImage();
      renderPreview();
      updateSummary();
    } catch (error) {
      console.error(error);
      showToast('转换遇到问题，请调整尺寸或换一张图片');
    } finally {
      el.processing.hidden = true;
    }
  }, 90);
}

function convertImage() {
  const source = state.source;
  const width = Number(el.widthRange.value);
  const height = Math.max(8, Math.min(100, Math.round(width * source.naturalHeight / source.naturalWidth)));
  const sample = document.createElement('canvas');
  sample.width = width;
  sample.height = height;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const palette = PALETTES[el.paletteSelect.value];
  const maxColors = Math.min(Number(el.colorRange.value), palette.length);
  const counts = new Map();
  const skipped = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    if (isSkippedPixel(pixels[p], pixels[p + 1], pixels[p + 2], pixels[p + 3])) {
      skipped[i] = 1;
      continue;
    }
    const nearest = findNearest(pixels[p], pixels[p + 1], pixels[p + 2], palette);
    counts.set(nearest, (counts.get(nearest) || 0) + 1);
  }

  const allowed = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxColors).map(entry => entry[0]);
  const result = new Int16Array(width * height);
  result.fill(-1);
  const finalCounts = new Map();

  if (el.ditherToggle.checked) {
    applyDithering(pixels, skipped, result, allowed, width, height);
  } else {
    for (let i = 0; i < result.length; i++) {
      if (skipped[i]) continue;
      const p = i * 4;
      result[i] = findNearest(pixels[p], pixels[p + 1], pixels[p + 2], allowed);
    }
  }

  result.forEach(index => {
    if (index >= 0) finalCounts.set(index, (finalCounts.get(index) || 0) + 1);
  });

  state.pattern = { width, height, cells: result, counts: finalCounts };
  state.usedColors = [...finalCounts.entries()]
    .map(([index, count]) => ({ ...COLORS[index], count }))
    .sort((a, b) => b.count - a.count);
  state.highlight = null;
  state.showAllColors = false;
  el.dimensionHint.textContent = `原图比例 · 自动高度为 ${height} 豆`;
}

function isSkippedPixel(r, g, b, a) {
  if (a < 40) return true;
  if (!el.backgroundToggle.checked) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 224 && max - min < 30;
}

function findNearest(r, g, b, allowed) {
  let best = allowed[0];
  let minDistance = Infinity;
  for (const index of allowed) {
    const rgb = COLORS[index].rgb;
    const dr = r - rgb[0];
    const dg = g - rgb[1];
    const db = b - rgb[2];
    const distance = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (distance < minDistance) {
      minDistance = distance;
      best = index;
    }
  }
  return best;
}

function applyDithering(pixels, skipped, result, allowed, width, height) {
  const work = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    work[i * 3] = pixels[i * 4];
    work[i * 3 + 1] = pixels[i * 4 + 1];
    work[i * 3 + 2] = pixels[i * 4 + 2];
  }
  const distribute = (index, er, eg, eb, factor) => {
    if (index < 0 || index >= result.length || skipped[index]) return;
    const p = index * 3;
    work[p] += er * factor;
    work[p + 1] += eg * factor;
    work[p + 2] += eb * factor;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (skipped[i]) continue;
      const p = i * 3;
      const r = Math.max(0, Math.min(255, work[p]));
      const g = Math.max(0, Math.min(255, work[p + 1]));
      const b = Math.max(0, Math.min(255, work[p + 2]));
      const nearest = findNearest(r, g, b, allowed);
      result[i] = nearest;
      const rgb = COLORS[nearest].rgb;
      const er = r - rgb[0], eg = g - rgb[1], eb = b - rgb[2];
      if (x + 1 < width) distribute(i + 1, er, eg, eb, 7 / 16);
      if (y + 1 < height) {
        if (x > 0) distribute(i + width - 1, er, eg, eb, 3 / 16);
        distribute(i + width, er, eg, eb, 5 / 16);
        if (x + 1 < width) distribute(i + width + 1, er, eg, eb, 1 / 16);
      }
    }
  }
}

function renderPreview() {
  if (!state.pattern) return;
  const canvas = el.patternCanvas;
  drawPattern(canvas, { cell: 30, margin: el.gridToggle.checked ? 34 : 0, highlight: state.highlight });
  el.clearHighlight.hidden = state.highlight === null;
  updateCanvasDisplay();
}

function drawPattern(canvas, options = {}) {
  const { width, height, cells } = state.pattern;
  const cell = options.cell || 30;
  const margin = options.margin ?? 34;
  const originX = options.originX || 0;
  const originY = options.originY || 0;
  const showGrid = options.showGrid ?? el.gridToggle.checked;
  const showSymbols = options.showSymbols ?? el.symbolToggle.checked;
  const highlight = options.highlight ?? null;
  const exportMode = options.exportMode || false;

  if (!options.preserveCanvas) {
    canvas.width = originX * 2 + width * cell;
    canvas.height = originY * 2 + height * cell;
  }
  const ctx = canvas.getContext('2d');
  if (!options.preserveCanvas) {
    ctx.fillStyle = '#FFFEFB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const startX = originX + margin;
  const startY = originY + margin;

  if (showGrid) {
    ctx.fillStyle = '#8D958F';
    ctx.font = `${Math.max(8, cell * .26)}px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = 0; x < width; x++) {
      if (x === 0 || (x + 1) % 5 === 0) ctx.fillText(String(x + 1), startX + (x + .5) * cell, originY + margin * .52);
    }
    for (let y = 0; y < height; y++) {
      if (y === 0 || (y + 1) % 5 === 0) ctx.fillText(String(y + 1), originX + margin * .48, startY + (y + .5) * cell);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = cells[y * width + x];
      if (index < 0) continue;
      const color = COLORS[index];
      const cx = startX + (x + .5) * cell;
      const cy = startY + (y + .5) * cell;
      const dimmed = highlight !== null && highlight !== index;
      ctx.save();
      ctx.globalAlpha = dimmed ? .12 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * .435, 0, Math.PI * 2);
      ctx.fillStyle = color.hex;
      ctx.fill();
      ctx.lineWidth = Math.max(.6, cell * .025);
      ctx.strokeStyle = 'rgba(30,40,34,.16)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - cell * .09, cy - cell * .11, cell * .25, Math.PI * 1.05, Math.PI * 1.72);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = cell * .055;
      ctx.stroke();
      if (!showSymbols) {
        ctx.beginPath();
        ctx.arc(cx, cy, cell * .105, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,254,251,.86)';
        ctx.fill();
        ctx.lineWidth = Math.max(.4, cell * .018);
        ctx.strokeStyle = 'rgba(30,40,34,.12)';
        ctx.stroke();
      }
      if (showSymbols) {
        ctx.fillStyle = getTextColor(color.rgb);
        ctx.font = `600 ${Math.max(7, cell * .25)}px DM Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(color.code, cx, cy + cell * .015);
      }
      ctx.restore();
    }
  }

  if (showGrid) {
    for (let x = 0; x <= width; x++) {
      const major = x % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(startX + x * cell, startY);
      ctx.lineTo(startX + x * cell, startY + height * cell);
      ctx.strokeStyle = major ? 'rgba(61,78,67,.34)' : 'rgba(75,88,79,.13)';
      ctx.lineWidth = major ? Math.max(1, cell * .035) : Math.max(.5, cell * .018);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      const major = y % 5 === 0;
      ctx.beginPath();
      ctx.moveTo(startX, startY + y * cell);
      ctx.lineTo(startX + width * cell, startY + y * cell);
      ctx.strokeStyle = major ? 'rgba(61,78,67,.34)' : 'rgba(75,88,79,.13)';
      ctx.lineWidth = major ? Math.max(1, cell * .035) : Math.max(.5, cell * .018);
      ctx.stroke();
    }
  }

  if (exportMode) {
    ctx.strokeStyle = '#D7DBD3';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, width * cell, height * cell);
  }
}

function getTextColor(rgb) {
  const luminance = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114;
  return luminance > 155 ? '#26332D' : '#FFFFFF';
}

function updateCanvasDisplay() {
  if (!state.pattern || !el.patternCanvas.width) return;
  const availableWidth = Math.max(200, el.canvasStage.clientWidth - 64);
  const availableHeight = Math.max(240, el.canvasStage.clientHeight - 64);
  state.fitScale = Math.min(availableWidth / el.patternCanvas.width, availableHeight / el.patternCanvas.height, 1.35);
  const scale = state.fitScale * state.zoom;
  el.patternCanvas.style.width = `${el.patternCanvas.width * scale}px`;
  el.patternCanvas.style.height = `${el.patternCanvas.height * scale}px`;
  el.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setZoom(value) {
  state.zoom = Math.max(.4, Math.min(3, Math.round(value * 10) / 10));
  updateCanvasDisplay();
}

function handleCanvasClick(event) {
  if (!state.pattern) return;
  const canvas = el.patternCanvas;
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) * canvas.width / rect.width;
  const py = (event.clientY - rect.top) * canvas.height / rect.height;
  const margin = el.gridToggle.checked ? 34 : 0;
  const x = Math.floor((px - margin) / 30);
  const y = Math.floor((py - margin) / 30);
  if (x < 0 || y < 0 || x >= state.pattern.width || y >= state.pattern.height) return;
  const index = state.pattern.cells[y * state.pattern.width + x];
  if (index < 0) return;
  state.highlight = state.highlight === index ? null : index;
  renderPreview();
  if (state.highlight !== null) showToast(`已高亮 ${COLORS[state.highlight].code} · ${COLORS[state.highlight].name}`);
}

function clearHighlight() {
  state.highlight = null;
  renderPreview();
}

function updateSummary() {
  const { width, height, counts } = state.pattern;
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  el.previewDimensions.textContent = `${width} × ${height} 豆 · ${total.toLocaleString()} 颗`;
  el.totalBeads.textContent = total.toLocaleString();
  el.summarySize.textContent = `${width} × ${height}`;
  el.actualColors.textContent = `${state.usedColors.length} 色`;
  renderColorList();
}

function renderColorList() {
  const visible = state.showAllColors ? state.usedColors : state.usedColors.slice(0, 8);
  const total = [...state.pattern.counts.values()].reduce((sum, count) => sum + count, 0);
  el.colorList.innerHTML = visible.map(color => `
    <div class="color-row" role="button" tabindex="0" data-color="${color.index}" title="点击高亮 ${color.code} ${color.name}">
      <span class="color-swatch" style="background:${color.hex}"></span>
      <div class="color-name"><strong>${color.code} · ${color.name}</strong><span>${color.hex}</span></div>
      <div class="color-count"><strong>${color.count.toLocaleString()}</strong><span>${(color.count / total * 100).toFixed(1)}%</span></div>
    </div>`).join('');
  el.showAllColors.hidden = state.usedColors.length <= 8;
  el.showAllColors.textContent = state.showAllColors ? '收起颜色列表' : `查看全部 ${state.usedColors.length} 种颜色`;
  el.colorList.querySelectorAll('.color-row').forEach(row => {
    const activate = () => {
      const index = Number(row.dataset.color);
      state.highlight = state.highlight === index ? null : index;
      renderPreview();
    };
    row.addEventListener('click', activate);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
    });
  });
}

function buildExportCanvas() {
  if (!state.pattern) return null;
  const cell = 52;
  const margin = 48;
  const patternWidth = state.pattern.width * cell;
  const patternHeight = state.pattern.height * cell;
  const side = 56;
  const header = 112;
  const columns = Math.min(4, Math.max(1, state.usedColors.length));
  const legendRows = Math.ceil(state.usedColors.length / columns);
  const legendHeight = legendRows * 58 + 64;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(760, patternWidth + margin + side * 2);
  canvas.height = header + patternHeight + margin + legendHeight + 42;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFEFB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#26332D';
  ctx.font = '700 30px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`豆图 · ${state.sourceName}`, side, 49);
  const total = [...state.pattern.counts.values()].reduce((sum, count) => sum + count, 0);
  ctx.fillStyle = '#7E8781';
  ctx.font = '16px "Noto Sans SC", sans-serif';
  ctx.fillText(`${state.pattern.width} × ${state.pattern.height} 豆  /  ${total.toLocaleString()} 颗  /  ${state.usedColors.length} 色`, side, 79);
  ctx.textAlign = 'right';
  ctx.fillText('BEAD PATTERN', canvas.width - side, 61);

  const patternX = (canvas.width - patternWidth - margin) / 2;
  drawPattern(canvas, {
    cell, margin, originX: patternX, originY: header, preserveCanvas: true,
    showGrid: true, showSymbols: el.symbolToggle.checked, highlight: null, exportMode: true
  });

  const legendTop = header + margin + patternHeight + 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#26332D';
  ctx.font = '600 18px "Noto Sans SC", sans-serif';
  ctx.fillText('材料清单', side, legendTop);
  const columnWidth = (canvas.width - side * 2) / columns;
  state.usedColors.forEach((color, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = side + col * columnWidth;
    const y = legendTop + 34 + row * 58;
    ctx.beginPath(); ctx.arc(x + 15, y, 13, 0, Math.PI * 2); ctx.fillStyle = color.hex; ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,34,.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#34433A'; ctx.font = '600 14px "Noto Sans SC", sans-serif';
    ctx.fillText(`${color.code} ${color.name}`, x + 38, y - 2);
    ctx.fillStyle = '#7E8781'; ctx.font = '12px "DM Sans", sans-serif';
    ctx.fillText(`${color.count.toLocaleString()} 颗`, x + 38, y + 17);
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#9AA19C'; ctx.font = '11px "Noto Sans SC", sans-serif';
  ctx.fillText('由豆图生成 · 每一颗都独一无二', canvas.width / 2, canvas.height - 18);
  return canvas;
}

function exportPng() {
  const canvas = buildExportCanvas();
  if (!canvas) return;
  canvas.toBlob(blob => {
    if (!blob) { showToast('导出失败，请重试'); return; }
    downloadBlob(blob, `${safeFileName(state.sourceName)}_拼豆图纸_${state.pattern.width}x${state.pattern.height}.png`);
    showToast('高清图纸已导出');
  }, 'image/png');
}

function exportCsv() {
  if (!state.pattern) return;
  const total = [...state.pattern.counts.values()].reduce((sum, count) => sum + count, 0);
  const rows = [
    ['图纸名称', state.sourceName],
    ['图纸尺寸', `${state.pattern.width} × ${state.pattern.height} 豆`],
    ['拼豆总数', total],
    [],
    ['色号', '颜色名称', 'HEX 色值', '数量（颗）', '用量占比'],
    ...state.usedColors.map(color => [color.code, color.name, color.hex, color.count, `${(color.count / total * 100).toFixed(1)}%`])
  ];
  const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeFileName(state.sourceName)}_材料清单.csv`);
  showToast('材料清单已导出');
}

function printPattern() {
  const canvas = buildExportCanvas();
  if (!canvas) return;
  el.printMeta.textContent = `${state.sourceName} · ${state.pattern.width} × ${state.pattern.height} 豆 · ${state.usedColors.length} 色`;
  el.printImage.onload = () => window.print();
  el.printImage.src = canvas.toDataURL('image/png');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40) || '我的作品';
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add('show');
  state.toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
