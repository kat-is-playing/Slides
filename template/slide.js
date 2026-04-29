/* Shared slide utilities — pie charts + present mode */

/* ── Pie charts ────────────────────────────────────── */

function pieArcPath(cx, cy, r, startPct, endPct) {
  const tau = 2 * Math.PI;
  const a0 = startPct * tau - Math.PI / 2;
  const a1 = endPct   * tau - Math.PI / 2;
  const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0);
  const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
  const lg = (endPct - startPct) > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function attachPieHover(svg) {
  const layout = svg.closest('.pie-layout');
  if (!layout) return;
  const dark = !!svg.closest('.on-dark');
  const strokeColor = dark ? 'var(--gray-50)' : 'var(--gray-900)';
  const legendItems = Array.from(layout.querySelectorAll('.pie-legend-item'));
  const segs = Array.from(svg.querySelectorAll('.pie-segment'));

  function highlight(idx) {
    segs.forEach((s, i) => {
      if (i === idx) {
        s.style.opacity = '';
        s.style.stroke = strokeColor;
        s.style.strokeWidth = '2';
      } else {
        s.style.opacity = '0.3';
        s.style.stroke = '';
        s.style.strokeWidth = '';
      }
    });
    legendItems.forEach((item, i) => { item.style.opacity = i === idx ? '' : '0.3'; });
  }
  function reset() {
    segs.forEach(s => { s.style.opacity = ''; s.style.stroke = ''; s.style.strokeWidth = ''; });
    legendItems.forEach(item => { item.style.opacity = ''; });
  }

  segs.forEach((seg, i) => {
    seg.addEventListener('mouseenter', () => highlight(i));
    seg.addEventListener('mouseleave', reset);
  });
}

function initPieCharts(root) {
  const NS = 'http://www.w3.org/2000/svg';
  root.querySelectorAll('.pie-chart').forEach(el => {
    const cs   = getComputedStyle(el);
    const p1   = parseFloat(cs.getPropertyValue('--p1')) / 100;
    const p2   = parseFloat(cs.getPropertyValue('--p2')) / 100;
    const dark = !!el.closest('.on-dark');
    const fills = dark
      ? ['var(--chart-1-dark)', 'var(--chart-2-dark)', 'var(--chart-3-dark)']
      : ['var(--chart-1)',      'var(--chart-2)',      'var(--chart-3)'];

    const segs = [{ s: 0, e: p1 }, { s: p1, e: p2 }, { s: p2, e: 1 }];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 600');
    svg.setAttribute('width', '600');
    svg.setAttribute('height', '600');
    svg.classList.add('pie-svg');

    segs.forEach(({ s, e }, i) => {
      if (e - s < 0.0001) return;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', pieArcPath(300, 300, 300, s, e));
      path.style.fill = fills[i];
      path.classList.add('pie-segment', `pie-segment--${i + 1}`);
      svg.appendChild(path);
    });

    el.replaceWith(svg);
    attachPieHover(svg);
  });

  root.querySelectorAll('.pie-svg').forEach(svg => attachPieHover(svg));
}

/* ── Present mode ──────────────────────────────────── */

function initPresent() {
  const slides = Array.from(document.querySelectorAll('.slide-wrap .slide'));
  let cur = 0;
  let step = 0;

  const overlay     = document.getElementById('presentOverlay');
  const stage       = document.getElementById('presentStage');
  const cursor      = document.getElementById('presentCursor');
  const btn         = document.getElementById('presentBtn');
  const progress    = document.getElementById('presentProgress');
  const progressFill = progress ? progress.querySelector('#progressFill') : null;
  const progressTip  = progress ? progress.querySelector('#progressTooltip') : null;
  const progressThumb = progress ? progress.querySelector('#progressThumb') : null;
  const progressNum  = progress ? progress.querySelector('#progressNum') : null;

  if (!overlay || !stage) return;

  function scaleStage() {
    const w = window.innerWidth  || document.documentElement.clientWidth;
    const h = window.innerHeight || document.documentElement.clientHeight;
    if (!w || !h) return;
    const s = Math.min(w / 1920, h / 1080);
    stage.style.zoom = s;
  }

  function stepItems() {
    const list = Array.from(stage.querySelectorAll('.list-item'));
    if (list.length) return list;
    return Array.from(stage.querySelectorAll('.card'));
  }

  function applyStep() {
    stepItems().forEach((item, idx) => {
      if (idx > step)        item.style.opacity = '0';
      else if (idx === step) item.style.opacity = '1';
      else                   item.style.opacity = '0.2';
    });
  }

  function updateProgress() {
    if (!progressFill) return;
    progressFill.style.width = ((cur + 1) / slides.length * 100) + '%';
  }

  function show(i, startStep) {
    cur = Math.max(0, Math.min(i, slides.length - 1));
    stage.innerHTML = '';
    stage.appendChild(slides[cur].cloneNode(true));
    lucide.createIcons({ node: stage });
    initPieCharts(stage);
    const items = stepItems();
    step = items.length > 0
      ? Math.min(startStep !== undefined ? startStep : 0, items.length - 1)
      : 0;
    applyStep();
    scaleStage();
    updateProgress();
  }

  function goNext() {
    const items = stepItems();
    if (items.length > 0 && step < items.length - 1) {
      step++;
      applyStep();
    } else if (cur < slides.length - 1) {
      show(cur + 1, 0);
    }
  }

  function goPrev() {
    const items = stepItems();
    if (items.length > 0 && step > 0) {
      step--;
      applyStep();
    } else {
      show(cur - 1, Infinity);
    }
  }

  function enter(startIdx) {
    overlay.classList.add('active');
    show(startIdx !== undefined ? startIdx : cur, 0);
    document.body.style.overflow = 'hidden';
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
      Promise.resolve(req.call(el)).then(scaleStage).catch(() => {});
    }
  }
  window._slideEnter = enter;

  function exit() {
    overlay.classList.remove('active');
    if (progress) progress.classList.remove('visible');
    if (progressTip) progressTip.classList.remove('visible');
    if (progressNum) progressNum.classList.remove('visible');
    document.body.style.overflow = '';
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex && (document.fullscreenElement || document.webkitFullscreenElement)) {
      ex.call(document).catch(() => {});
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && overlay.classList.contains('active')) exit();
    else if (overlay.classList.contains('active')) scaleStage();
  });

  /* ── Progress bar interactions ── */
  if (progress) {
    let thumbCache = -1;

    progress.addEventListener('mousemove', (e) => {
      const rect = progress.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1 - 1e-9, (e.clientX - rect.left) / rect.width));
      const idx = Math.floor(ratio * slides.length);

      const tipX = Math.max(120, Math.min(window.innerWidth - 120, e.clientX));

      if (progressTip) {
        progressTip.style.left = tipX + 'px';
        progressTip.classList.add('visible');
      }
      if (progressNum) {
        progressNum.style.left = tipX + 'px';
        progressNum.textContent = idx + 1;
        progressNum.classList.add('visible');
      }

      if (progressThumb && idx !== thumbCache) {
        thumbCache = idx;
        progressThumb.innerHTML = '';
        const clone = slides[idx].cloneNode(true);
        progressThumb.appendChild(clone);
        lucide.createIcons({ node: progressThumb });
        initPieCharts(progressThumb);
      }
    });

    progress.addEventListener('mouseleave', () => {
      if (progressTip) progressTip.classList.remove('visible');
      if (progressNum) progressNum.classList.remove('visible');
    });

    progress.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = progress.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1 - 1e-9, (e.clientX - rect.left) / rect.width));
      show(Math.floor(ratio * slides.length), 0);
    });
  }

  if (btn) btn.addEventListener('click', () => enter());

  overlay.addEventListener('click', (e) => {
    if (e.clientX / window.innerWidth < 0.5) goPrev();
    else goNext();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') exit();
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
    if (e.key === 'ArrowLeft'  || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
  });

  window.addEventListener('resize', () => {
    if (overlay.classList.contains('active')) scaleStage();
  });

  let cursorTimer;
  overlay.addEventListener('mousemove', (e) => {
    if (cursor) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
      cursor.classList.remove('hidden');
      clearTimeout(cursorTimer);
      cursorTimer = setTimeout(() => cursor.classList.add('hidden'), 1500);
    }
    if (progress) {
      progress.classList.toggle('visible', e.clientY > window.innerHeight - 200);
    }
  });
}

/* ── View toggle (list / grid) ─────────────────── */

function initViewToggle() {
  const segBtns = document.querySelectorAll('.seg-btn[data-view]');
  const groups  = Array.from(document.querySelectorAll('.slide-group'));

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      segBtns.forEach(b => b.classList.toggle('seg-btn--active', b === btn));
      document.body.classList.toggle('view-grid', btn.dataset.view === 'grid');
    });
  });

  groups.forEach((group, i) => {
    group.addEventListener('click', () => {
      if (!document.body.classList.contains('view-grid')) return;
      if (window._slideEnter) window._slideEnter(i);
    });
  });
}
