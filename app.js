/* ====================================================
 * 公众号封面配图工具 — 主逻辑
 * 21:9 固定画板 / 背景图 / 得意黑 Regular 文字 / 模板
 * ==================================================== */

(() => {
  'use strict';

  // ---------- 配置常量 ----------
  const CANVAS_W = 1800;
  const CANVAS_H = 766;            // 21:9 (1800 / 9 × 21 ≈ 766)
  const TITLE_FONT = '"得意黑 Smiley Sans", "Smiley Sans", "SmileySans-Oblique", sans-serif';
  const WM_FONT    = '"AlibabaPuHuiTi Bold", "AlibabaPuHuiTi-3-85-Bold", "AlibabaPuHuiTi", sans-serif';
  const WM_X_LOCKED = 70;
  const WM_Y_LOCKED = 700;
  const DEFAULT_TITLE = '你的公众号标题';

  // ---------- 默认状态 ----------
  const state = {
    bg: null,                        // { dataUrl, naturalW, naturalH }
    title: {
      text: DEFAULT_TITLE,
      x: 50,                         // 相对于对齐锚点的偏移（0 ~ 180）
      y: 200,
      fontSize: 120,
      letterSpacing: 0,              // em 倍率
      lineHeight: 1.4,
      color: '#ffffff',
      align: 'left',                 // left | center | right — 相对画布绝对锚定
      maxWidth: 1800,
    },
    stroke: {
      enabled: false,
      width: 3,
      color: '#000000',
    },
    shadow: {
      enabled: false,
      x: 7,
      y: 7,
      blur: 9,
      color: '#000000',
      alpha: 70,                    // 0-100
    },
    watermark: {
      text: 'AI 绘梦师葉子',
      fontSize: 50,
      color: '#ffffff',
      alpha: 80,                    // 0-100
      locked: true,                 // true = 固定在 (70,700)；false = 可调 X/Y 偏移
      x: WM_X_LOCKED,
      y: WM_Y_LOCKED,
    },
  };

  // 对齐 → 画布水平锚点（绝对坐标）
  function alignAnchorX(align) {
    if (align === 'center') return CANVAS_W / 2;
    if (align === 'right') return CANVAS_W;
    return 0;                        // left
  }

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  // ---------- 等待得意黑字体加载 ----------
  function ensureFontLoaded() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

  // ---------- Canvas 绘制 ----------
  function draw() {
    // 背景：透明或上传图
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (state.bg) drawBackground();
    drawTitle();
    drawWatermark();
  }

  function drawBackground() {
    const img = state.bg._img;
    if (!img) return;
    // cover 模式：保持比例铺满
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const targetRatio = CANVAS_W / CANVAS_H;
    const imgRatio = sw / sh;
    let dw, dh;
    if (imgRatio > targetRatio) {
      dh = CANVAS_H;
      dw = dh * imgRatio;
    } else {
      dw = CANVAS_W;
      dh = dw / imgRatio;
    }
    const dx = (CANVAS_W - dw) / 2;
    const dy = (CANVAS_H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function setFontStyle(opts) {
    const parts = [];
    parts.push(`${opts.fontSize}px`);
    parts.push(TITLE_FONT);
    return parts.join(' ');
  }

  // 计算一行字符宽度（含字间距）
  function lineWidth(ctx, text, letterSpacing, fontSize) {
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      w += ctx.measureText(text[i]).width;
      if (i < text.length - 1) w += letterSpacing * fontSize;
    }
    return w;
  }

  // 自动换行（基于像素宽度，支持手动换行）
  function wrapAll(ctx, text, opts) {
    if (!text) return [];
    const paragraphs = text.split(/\r?\n/);
    const lines = [];
    const gap = opts.letterSpacing * opts.fontSize;

    for (const para of paragraphs) {
      if (para === '') { lines.push(''); continue; }
      let current = '';
      for (const ch of para) {
        const test = current + ch;
        const w = lineWidth(ctx, test, opts.letterSpacing, opts.fontSize);
        if (w > opts.maxWidth && current.length > 0) {
          lines.push(current);
          current = ch;
        } else {
          current = test;
        }
      }
      if (current.length > 0) lines.push(current);
    }
    return lines;
  }

  function drawText(ctx, text, x, y, opts) {
    const width = lineWidth(ctx, text, opts.letterSpacing, opts.fontSize);
    let cx = x;
    if (opts.align === 'center') cx = x - width / 2;
    else if (opts.align === 'right') cx = x - width;
    const gap = opts.letterSpacing * opts.fontSize;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const charW = ctx.measureText(ch).width;

      if (opts.stroke.enabled && opts.stroke.width > 0) {
        ctx.strokeStyle = opts.stroke.color;
        ctx.lineWidth = opts.stroke.width;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(ch, cx, y);
      }
      ctx.fillStyle = opts.color;
      ctx.fillText(ch, cx, y);

      cx += charW;
      if (i < text.length - 1) cx += gap;
    }
  }

  function drawTitle() {
    const t = state.title;
    const s = state.stroke;
    const sh = state.shadow;

    // 保存/复位阴影开关
    ctx.save();

    // 阴影设置（仅作用于 fillText/strokeText）
    if (sh.enabled) {
      ctx.shadowColor = hexToRgba(sh.color, sh.alpha / 100);
      ctx.shadowOffsetX = sh.x;
      ctx.shadowOffsetY = sh.y;
      ctx.shadowBlur = sh.blur;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
    }

    ctx.font = setFontStyle({ fontSize: t.fontSize });
    ctx.textBaseline = 'top';

    const drawOpts = {
      align: t.align,
      letterSpacing: t.letterSpacing,
      fontSize: t.fontSize,
      color: t.color,
      stroke: s,
    };

    // 对齐 = 相对画布的绝对锚点（0/900/1800），叠加 t.x 微调
    const baseX = alignAnchorX(t.align) + t.x;
    const lines = wrapAll(ctx, t.text, { ...t });
    const lineGap = t.fontSize * t.lineHeight;
    lines.forEach((line, i) => {
      drawText(ctx, line, baseX, t.y + i * lineGap, drawOpts);
    });

    ctx.restore();
  }

  function drawWatermark() {
    const wm = state.watermark;
    ctx.save();
    ctx.font = `${wm.fontSize}px ${WM_FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = hexToRgba(wm.color, wm.alpha / 100);
    ctx.fillText(wm.text || '', wm.x, wm.y);
    ctx.restore();
  }

  // ---------- 颜色工具 ----------
  function hexToRgba(hex, alpha = 1) {
    const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
    if (!m) return hex;
    const v = m[1];
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ---------- UI 双向绑定 ----------
  function bindInput(id, key, parse = Number, extraSet) {
    const input = $(id);
    if (!input) return;
    const handle = () => {
      const v = parse(input.value);
      applyState(key, v);
      if (extraSet) extraSet(v);
      draw();
    };
    input.addEventListener('input', handle);
  }

  function applyState(path, value) {
    const keys = path.split('.');
    let obj = state;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
  }

  function setupBindings() {
    // ===== 标题文字 =====
    $('titleText').addEventListener('input', (e) => {
      applyState('title.text', e.target.value);
      draw();
    });

    // ===== 字号 =====
    bindRangePair('fontSize', 'title.fontSize');

    // ===== 字间距 =====
    bindRangePair('letterSpacing', 'title.letterSpacing');

    // ===== 行间距 =====
    bindRangePair('lineHeight', 'title.lineHeight');

    // ===== 对齐 =====
    $('alignGroup').querySelectorAll('.seg').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('alignGroup').querySelectorAll('.seg').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyState('title.align', btn.dataset.val);
        applyState('title.x', 0);                // 切换对齐时重置微调偏移
        setRange('titleX', 0);
        draw();
      });
    });

    // ===== 字色 =====
    bindColorPair('textColor', 'title.color');

    // ===== 描边 =====
    bindCheckWithCollapse('strokeEnabled', 'stroke.enabled', 'strokeSection');
    bindRangePair('strokeWidth', 'stroke.width', (v) => Math.max(0, +v || 0));
    bindColorPair('strokeColor', 'stroke.color');

    // ===== 阴影 =====
    bindCheckWithCollapse('shadowEnabled', 'shadow.enabled', 'shadowSection');
    bindRangePair('shadowX', 'shadow.x');
    bindRangePair('shadowY', 'shadow.y');
    bindRangePair('shadowBlur', 'shadow.blur', (v) => Math.max(0, +v || 0));
    bindColorPair('shadowColor', 'shadow.color');
    bindRangePair('shadowAlpha', 'shadow.alpha', (v) => +v);

    // ===== 位置 =====
    bindRangePair('titleX', 'title.x', (v) => Math.max(0, +v || 0));
    bindRangePair('titleY', 'title.y');
    bindRangePair('titleMaxW', 'title.maxWidth', (v) => Math.max(50, +v || 50));

    // ===== 水印 =====
    bindWatermarkLock();
    bindRangePair('wmSize', 'watermark.fontSize', (v) => Math.max(16, Math.min(60, +v || 16)));
    bindColorPair('wmColor', 'watermark.color');
    bindRangePair('wmAlpha', 'watermark.alpha', (v) => Math.max(0, Math.min(100, +v || 0)));
    bindRangePair('wmX', 'watermark.x', (v) => Math.max(0, +v || 0));
    bindRangePair('wmY', 'watermark.y', (v) => Math.max(0, +v || 0));
    $('wmText').addEventListener('input', (e) => {
      applyState('watermark.text', e.target.value);
      draw();
    });
  }

  function bindRange(id, key, parse = (v) => +v) {
    const input = $(id);
    if (!input) return;
    input.addEventListener('input', (e) => {
      const v = parse(e.target.value);
      applyState(key, v);
      draw();
    });
  }

  function bindRangePair(id, key, parse = (v) => +v) {
    const range = $(id);
    const num = $(id + 'Num');
    if (!range || !num) return;
    const onChange = (raw) => {
      const v = parse(raw);
      range.value = v;
      num.value = v;
      applyState(key, v);
      draw();
    };
    range.addEventListener('input', (e) => onChange(e.target.value));
    num.addEventListener('input', (e) => {
      const v = parse(e.target.value);
      range.value = v;
      applyState(key, v);
      draw();
    });
  }

  function bindCheck(id, key) {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      applyState(key, e.target.checked);
      draw();
    });
  }

  function bindCheckWithCollapse(id, key, sectionId) {
    const el = $(id);
    const section = $(sectionId);
    if (!el || !section) return;
    el.addEventListener('change', (e) => {
      const on = e.target.checked;
      applyState(key, on);
      section.setAttribute('data-collapsed', on ? 'false' : 'true');
      draw();
    });
  }

  function bindWatermarkLock() {
    const el = $('wmLocked');
    const posFields = $('wmPosFields');
    const hint = $('wmHint');
    if (!el) return;
    el.addEventListener('change', (e) => {
      const locked = e.target.checked;
      applyState('watermark.locked', locked);
      if (locked) {
        // 锁定：把水印 X/Y 拨回默认 (70, 700)
        applyState('watermark.x', WM_X_LOCKED);
        applyState('watermark.y', WM_Y_LOCKED);
        if (posFields) posFields.classList.add('hidden');
        if (hint) hint.textContent = '已锁定：固定在左下角 (70, 700)。关闭锁定后可调 X/Y 偏移。';
      } else {
        if (posFields) posFields.classList.remove('hidden');
        if (hint) hint.textContent = '未锁定：水印位置和文字都可调整。';
      }
      draw();
    });
  }

  function bindColorPair(id, key) {
    const color = $(id);
    const hex = $(id + 'Hex');
    if (!color || !hex) return;
    color.addEventListener('input', (e) => {
      hex.value = e.target.value.toUpperCase();
      applyState(key, e.target.value);
      draw();
    });
    hex.addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) {
        color.value = v.toLowerCase();
        applyState(key, v);
        draw();
      }
    });
  }

  // ---------- 同步 UI 与状态（用于加载模板） ----------
  function syncUI() {
    $('titleText').value = state.title.text;

    setRange('fontSize', state.title.fontSize);
    setRange('letterSpacing', state.title.letterSpacing);
    setRange('lineHeight', state.title.lineHeight);

    document.querySelectorAll('#alignGroup .seg').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.val === state.title.align);
    });

    setColor('textColor', state.title.color);

    $('strokeEnabled').checked = !!state.stroke.enabled;
    setRange('strokeWidth', state.stroke.width);
    setColor('strokeColor', state.stroke.color);
    $('strokeSection').setAttribute('data-collapsed', state.stroke.enabled ? 'false' : 'true');

    $('shadowEnabled').checked = !!state.shadow.enabled;
    setRange('shadowX', state.shadow.x);
    setRange('shadowY', state.shadow.y);
    setRange('shadowBlur', state.shadow.blur);
    setColor('shadowColor', state.shadow.color);
    setRange('shadowAlpha', state.shadow.alpha);
    $('shadowSection').setAttribute('data-collapsed', state.shadow.enabled ? 'false' : 'true');

    setRange('titleX', state.title.x);
    setRange('titleY', state.title.y);
    setRange('titleMaxW', state.title.maxWidth);

    $('wmText').value = state.watermark.text;
    setRange('wmSize', state.watermark.fontSize);
    setColor('wmColor', state.watermark.color);
    setRange('wmAlpha', state.watermark.alpha);
    $('wmLocked').checked = !!state.watermark.locked;
    setRange('wmX', state.watermark.x);
    setRange('wmY', state.watermark.y);
    const posFields = $('wmPosFields');
    const hint = $('wmHint');
    if (state.watermark.locked) {
      posFields && posFields.classList.add('hidden');
      hint && (hint.textContent = '已锁定：固定在左下角 (70, 700)。关闭锁定后可调 X/Y 偏移。');
    } else {
      posFields && posFields.classList.remove('hidden');
      hint && (hint.textContent = '未锁定：水印位置和文字都可调整。');
    }
  }

  function setRange(id, value) {
    const r = $(id), n = $(id + 'Num');
    if (r) r.value = value;
    if (n) n.value = value;
  }
  function setColor(id, value) {
    const c = $(id), h = $(id + 'Hex');
    if (c) c.value = value;
    if (h) h.value = (value || '').toUpperCase();
  }

  // ---------- 背景图上传 ----------
  $('bgInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.bg = {
          dataUrl: reader.result,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          _img: img,
        };
        draw();
        toast('背景图已加载');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  $('clearBgBtn').addEventListener('click', () => {
    state.bg = null;
    draw();
    toast('背景已清空');
  });

  // ---------- 模板保存 / 加载 ----------
  function exportTemplate() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      title: state.title,
      stroke: state.stroke,
      shadow: state.shadow,
      watermark: state.watermark,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `封面模板-${stamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('模板已下载');
  }

  function importTemplate(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.assign(state.title, data.title || {});
        Object.assign(state.stroke, data.stroke || {});
        Object.assign(state.shadow, data.shadow || {});
        Object.assign(state.watermark, data.watermark || {});
        // 水印文字、标题默认保留锁定
        state.watermark.text = data.watermark?.text || 'AI 绘梦师葉子';
        syncUI();
        draw();
        toast('模板已加载');
      } catch (err) {
        console.error(err);
        toast('模板解析失败');
      }
    };
    reader.readAsText(file);
  }

  $('saveTplBtn').addEventListener('click', exportTemplate);
  $('loadTplBtn').addEventListener('click', () => $('loadTplInput').click());
  $('loadTplInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) importTemplate(file);
    e.target.value = '';
  });

  // ---------- 重置样式（保留水印） ----------
  $('resetStyleBtn').addEventListener('click', () => {
    state.title = {
      text: DEFAULT_TITLE,
      x: 50,
      y: 200,
      fontSize: 120,
      letterSpacing: 0,
      lineHeight: 1.4,
      color: '#ffffff',
      align: 'left',
      maxWidth: 1800,
    };
    state.stroke = { enabled: false, width: 3, color: '#000000' };
    state.shadow = { enabled: false, x: 7, y: 7, blur: 9, color: '#000000', alpha: 70 };
    state.watermark = {
      text: state.watermark.text,
      fontSize: 50,
      color: state.watermark.color,
      alpha: 80,
      locked: true,
      x: WM_X_LOCKED,
      y: WM_Y_LOCKED,
    };
    syncUI();
    draw();
    toast('文字样式已重置');
  });

  // ---------- 导出 ----------
  function exportImage(format, quality = 0.95) {
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataURL = canvas.toDataURL(mime, quality);
    const ext = format === 'jpg' ? 'jpg' : 'png';
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `公众号封面-${stamp()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast(`已导出 ${ext.toUpperCase()}`);
  }

  $('exportPngBtn').addEventListener('click', () => exportImage('png'));
  $('exportJpgBtn').addEventListener('click', () => exportImage('jpg', 0.95));

  // ---------- Toast ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  // ---------- 时间戳 ----------
  function stamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  // ---------- 自适应：画布按容器宽度缩放 ----------
  function fitCanvas() {
    const wrapper = $('canvasWrapper');
    const wrapWidth = wrapper.parentElement.clientWidth - 48; // padding 24*2
    const wrapHeight = wrapper.parentElement.clientHeight - 80;
    const ratio = CANVAS_W / CANVAS_H;
    let targetW = CANVAS_W;
    let targetH = CANVAS_H;

    if (wrapWidth < targetW) {
      targetW = wrapWidth;
      targetH = targetW / ratio;
    }
    if (targetH > wrapHeight) {
      targetH = wrapHeight;
      targetW = targetH * ratio;
    }
    const zoom = Math.round((targetW / CANVAS_W) * 100);
    $('zoomLabel').textContent = `${zoom}%`;
    canvas.style.width = targetW + 'px';
    canvas.style.height = targetH + 'px';
  }

  // ---------- 加载默认背景 ----------
  function loadDefaultBg() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        state.bg = {
          dataUrl: null,
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          _img: img,
        };
        resolve();
      };
      img.onerror = () => resolve();   // 失败不阻塞初始化
      img.src = 'assets/default-bg.png';
    });
  }

  // ---------- 初始化 ----------
  async function init() {
    // 注入得意黑（标题用）+ 阿里巴巴普惠体纤细（水印用）
    const fontCss = document.createElement('style');
    fontCss.textContent = `
@font-face {
  font-family: '得意黑 Smiley Sans';
  src: url('assets/SmileySans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'AlibabaPuHuiTi Bold';
  src: url('assets/AlibabaPuHuiTi-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}`;
    document.head.appendChild(fontCss);

    setupBindings();
    syncUI();

    // 画布自适应
    fitCanvas();
    window.addEventListener('resize', fitCanvas);

    // 先加载默认背景并立即绘制（不依赖字体，避免被慢字体阻塞导致白屏）
    await loadDefaultBg();
    draw();

    // 等待字体加载（最多 3 秒），就绪后重绘以应用真实字体
    try {
      await Promise.race([
        ensureFontLoaded(),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch (e) { /* 忽略 */ }
    draw();
    setTimeout(draw, 200); // 兜底：再画一次防字体替换时序问题
  }

  init();
})();
