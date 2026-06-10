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
    const dark = !!el.closest('.on-dark');
    const fills = dark
      ? ['var(--chart-1-dark)', 'var(--chart-2-dark)', 'var(--chart-3-dark)', 'var(--chart-4-dark)']
      : ['var(--chart-1)',      'var(--chart-2)',      'var(--chart-3)',      'var(--chart-4)'];

    // Read cumulative stops --p1, --p2, … until missing; auto-close at 100%.
    const stops = [0];
    for (let k = 1; k <= fills.length; k++) {
      const v = parseFloat(cs.getPropertyValue('--p' + k));
      if (isNaN(v)) break;
      stops.push(v / 100);
    }
    if (stops[stops.length - 1] < 0.9999) stops.push(1);

    const segs = stops.slice(0, -1).map((s, i) => ({ s, e: stops[i + 1] }));
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

  const isAudience = new URLSearchParams(location.search).get('role') === 'audience';
  const channel = (isAudience && 'BroadcastChannel' in window)
    ? new BroadcastChannel('slide-sync:' + location.pathname) : null;

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

  function requestFs() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req && !document.fullscreenElement && !document.webkitFullscreenElement) {
      Promise.resolve(req.call(el)).then(scaleStage).catch(() => {});
    }
  }

  function enter(startIdx) {
    overlay.classList.add('active');
    show(startIdx !== undefined ? startIdx : cur, 0);
    document.body.style.overflow = 'hidden';
    if (!isAudience) requestFs();
  }
  window._slideEnter = enter;
  window._slidePresentShow = show;

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
    if (isAudience) {
      requestFs();
      const hint = overlay.querySelector('.audience-hint');
      if (hint) hint.remove();
      return;
    }
    if (e.clientX / window.innerWidth < 0.5) goPrev();
    else goNext();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') exit();
    if (isAudience) return;
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
      progress.classList.toggle('visible', e.clientY > window.innerHeight - 60);
    }
  });

  /* ── Audience follower (opened by presenter view) ── */
  if (isAudience) {
    document.body.classList.add('role-audience');
    const hint = document.createElement('div');
    hint.className = 'audience-hint';
    hint.textContent = '點擊進入全螢幕';
    overlay.appendChild(hint);
    enter(0);
    if (channel) {
      channel.addEventListener('message', (ev) => {
        const d = ev.data || {};
        if (d.type === 'goto') show(d.cur, d.step);
        else if (d.type === 'exit') { try { window.close(); } catch (err) {} }
        else if (d.type === 'pointer' && cursor) {
          if (d.hide) { cursor.classList.add('hidden'); return; }
          const rect = stage.getBoundingClientRect();
          cursor.style.left = (rect.left + d.x * rect.width) + 'px';
          cursor.style.top  = (rect.top + d.y * rect.height) + 'px';
          cursor.classList.remove('hidden');
        }
        else if (d.type === 'pie') {
          const segs = stage.querySelectorAll('.pie-segment');
          if (!segs.length) return;
          if (d.idx >= 0 && segs[d.idx]) segs[d.idx].dispatchEvent(new MouseEvent('mouseenter'));
          else segs[0].dispatchEvent(new MouseEvent('mouseleave'));
        }
        else if (d.type === 'scroll') {
          const el = stage.querySelectorAll('.browser-body--scroll')[d.i];
          if (!el) return;
          el.scrollTop = d.ratio * (el.scrollHeight - el.clientHeight);
        }
      });
      channel.postMessage({ type: 'ready' });
    }
  }
}

/* ── View toggle (list / grid) ─────────────────── */

function initViewToggle() {
  const segBtns = document.querySelectorAll('.seg-btn[data-view]');
  const groups  = Array.from(document.querySelectorAll('.slide-group'));
  const STORAGE_KEY = 'slide-view';

  const applyView = (view) => {
    segBtns.forEach(b => b.classList.toggle('seg-btn--active', b.dataset.view === view));
    document.body.classList.toggle('view-grid', view === 'grid');
  };

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'grid' || saved === 'list') applyView(saved);

  segBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyView(btn.dataset.view);
      localStorage.setItem(STORAGE_KEY, btn.dataset.view);
    });
  });

  groups.forEach((group, i) => {
    group.addEventListener('click', () => {
      if (!document.body.classList.contains('view-grid')) return;
      if (window._slideEnter) window._slideEnter(i);
    });
  });
}

/* ── Presenter view (簡報者檢視) ─────────────────── */

function initPresenter() {
  if (new URLSearchParams(location.search).get('role') === 'audience') return;

  const header     = document.querySelector('.viewer-header');
  const presentBtn = document.getElementById('presentBtn');
  const slides     = Array.from(document.querySelectorAll('.slide-wrap .slide'));
  if (!header || !slides.length) return;

  /* inject trigger button next to 簡報模式 */
  const btn = document.createElement('button');
  btn.className = 'present-btn presenter-btn';
  btn.id = 'presenterBtn';
  btn.innerHTML = '<i data-lucide="monitor-play"></i> 簡報者模式';
  if (presentBtn && presentBtn.nextSibling) header.insertBefore(btn, presentBtn.nextSibling);
  else header.appendChild(btn);

  /* inject presenter overlay */
  const overlay = document.createElement('div');
  overlay.className = 'presenter-overlay';
  overlay.id = 'presenterOverlay';
  overlay.innerHTML =
    '<div class="presenter-bar">' +
      '<div class="presenter-timer" id="presenterTimer">00:00</div>' +
      '<button class="presenter-iconbtn" id="presenterReset" title="重設計時"><i data-lucide="rotate-ccw"></i></button>' +
      '<button class="presenter-iconbtn" id="presenterPause" title="暫停"><i data-lucide="pause"></i></button>' +
      '<button class="presenter-iconbtn presenter-bar__exit" id="presenterExit" title="結束 (Esc)"><i data-lucide="x"></i></button>' +
    '</div>' +
    '<div class="presenter-main">' +
      '<div class="presenter-current">' +
        '<div class="presenter-frame presenter-frame--cur">' +
          '<div class="presenter-stage" id="presenterCurStage"></div>' +
          '<div class="presenter-cursor hidden" id="presenterCursor"></div>' +
        '</div>' +
      '</div>' +
      '<div class="presenter-blank"></div>' +
    '</div>' +
    '<div class="presenter-nav">' +
      '<button class="presenter-iconbtn" id="presenterFirst" title="回到第一頁"><i data-lucide="rotate-ccw"></i></button>' +
      '<button class="presenter-iconbtn" id="presenterPrev"><i data-lucide="chevron-left"></i></button>' +
      '<span class="presenter-counter" id="presenterCounter">1 / ' + slides.length + '</span>' +
      '<button class="presenter-iconbtn" id="presenterNext"><i data-lucide="chevron-right"></i></button>' +
    '</div>' +
    '<div class="presenter-filmstrip" id="presenterFilmstrip"></div>';
  document.body.appendChild(overlay);
  if (window.lucide) lucide.createIcons();

  const curStage  = overlay.querySelector('#presenterCurStage');
  const counterEl = overlay.querySelector('#presenterCounter');
  const timerEl   = overlay.querySelector('#presenterTimer');
  const pauseBtn  = overlay.querySelector('#presenterPause');
  const filmstrip = overlay.querySelector('#presenterFilmstrip');
  const curFrame  = curStage.parentElement;
  const cursor    = overlay.querySelector('#presenterCursor');

  const channel = ('BroadcastChannel' in window)
    ? new BroadcastChannel('slide-sync:' + location.pathname) : null;
  let audienceWin = null;

  let cur = 0, step = 0;
  let timerId = null, elapsed = 0, paused = false;

  function stepItems(node) {
    const list = Array.from(node.querySelectorAll('.list-item'));
    if (list.length) return list;
    return Array.from(node.querySelectorAll('.card'));
  }
  function applyStepTo(node, s) {
    stepItems(node).forEach((item, idx) => {
      if (idx > s)        item.style.opacity = '0';
      else if (idx === s) item.style.opacity = '1';
      else                item.style.opacity = '0.2';
    });
  }
  function scalePane(stage) {
    const frame = stage.parentElement;
    const w = frame.clientWidth, h = frame.clientHeight;
    if (!w || !h) return;
    stage.style.zoom = Math.min(w / 1920, h / 1080);
  }
  function fillStage(stage, idx, s) {
    stage.innerHTML = '';
    if (idx < 0 || idx >= slides.length) {
      stage.innerHTML = '<div class="presenter-end">結束</div>';
      scalePane(stage);
      return;
    }
    stage.appendChild(slides[idx].cloneNode(true));
    if (window.lucide) lucide.createIcons({ node: stage });
    initPieCharts(stage);
    applyStepTo(stage, s);
    scalePane(stage);
  }
  function broadcast() {
    if (channel) channel.postMessage({ type: 'goto', cur: cur, step: step });
  }
  function wirePieSync() {
    if (!channel) return;
    curStage.querySelectorAll('.pie-segment').forEach((seg, i) => {
      seg.addEventListener('mouseenter', () => channel.postMessage({ type: 'pie', idx: i }));
      seg.addEventListener('mouseleave', () => channel.postMessage({ type: 'pie', idx: -1 }));
    });
  }
  function wireScrollSync() {
    if (!channel) return;
    curStage.querySelectorAll('.browser-body--scroll').forEach((el, i) => {
      el.addEventListener('scroll', () => {
        const max = el.scrollHeight - el.clientHeight;
        channel.postMessage({ type: 'scroll', i: i, ratio: max > 0 ? el.scrollTop / max : 0 });
      });
    });
  }
  function buildFilmstrip() {
    if (filmstrip.childElementCount) return;
    slides.forEach((slide, i) => {
      const thumb = document.createElement('button');
      thumb.className = 'presenter-thumb';
      thumb.dataset.idx = i;
      const stage = document.createElement('div');
      stage.className = 'presenter-stage';
      stage.appendChild(slide.cloneNode(true));
      thumb.appendChild(stage);
      thumb.addEventListener('click', () => goTo(i));
      filmstrip.appendChild(thumb);
      if (window.lucide) lucide.createIcons({ node: stage });
      initPieCharts(stage);
      // thumb is CSS-fixed at 150px wide; scale by constant so it never
      // silently fails when clientWidth reads 0 before layout settles
      stage.style.transform = 'scale(' + (150 / 1920) + ')';
    });
  }
  function setActiveThumb() {
    Array.from(filmstrip.children).forEach((t, i) => t.classList.toggle('active', i === cur));
    const active = filmstrip.children[cur];
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function goTo(i) {
    cur = Math.max(0, Math.min(i, slides.length - 1));
    step = 0;
    render();
  }
  function render() {
    fillStage(curStage, cur, step);
    wirePieSync();
    wireScrollSync();
    counterEl.textContent = (cur + 1) + ' / ' + slides.length;
    setActiveThumb();
    broadcast();
  }
  function goNext() {
    const n = stepItems(curStage).length;
    if (n > 0 && step < n - 1) { step++; applyStepTo(curStage, step); broadcast(); }
    else if (cur < slides.length - 1) { cur++; step = 0; render(); }
  }
  function goPrev() {
    if (step > 0) { step--; applyStepTo(curStage, step); broadcast(); }
    else if (cur > 0) {
      cur--;
      const n = stepItems(slides[cur]).length;
      step = n > 0 ? n - 1 : 0;
      render();
    }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(t) { return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
  function tick() {
    if (!paused) { elapsed++; timerEl.textContent = fmt(elapsed); }
  }
  function resetTimer() { elapsed = 0; timerEl.textContent = '00:00'; }

  function open() {
    audienceWin = window.open(location.pathname + '?role=audience' + location.hash, 'slide-audience');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    buildFilmstrip();
    cur = 0; step = 0; paused = false;
    resetTimer();
    if (timerId) clearInterval(timerId);
    timerId = setInterval(tick, 1000);
    render();
  }
  function exit() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (channel) channel.postMessage({ type: 'exit' });
    if (audienceWin && !audienceWin.closed) { try { audienceWin.close(); } catch (err) {} }
    audienceWin = null;
  }

  if (channel) {
    channel.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'ready' && overlay.classList.contains('active')) broadcast();
    });
  }

  btn.addEventListener('click', open);
  overlay.querySelector('#presenterNext').addEventListener('click', goNext);
  overlay.querySelector('#presenterPrev').addEventListener('click', goPrev);
  overlay.querySelector('#presenterFirst').addEventListener('click', () => goTo(0));
  overlay.querySelector('#presenterExit').addEventListener('click', exit);
  overlay.querySelector('#presenterReset').addEventListener('click', resetTimer);
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.innerHTML = paused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
    pauseBtn.title = paused ? '繼續' : '暫停';
    if (window.lucide) lucide.createIcons({ node: pauseBtn });
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') { e.preventDefault(); exit(); }
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); goNext(); }
    else if (e.key === 'ArrowLeft'  || e.key === 'PageUp') { e.preventDefault(); goPrev(); }
    else if (e.key === 'r' || e.key === 'R') { resetTimer(); }
  });

  window.addEventListener('resize', () => {
    if (overlay.classList.contains('active')) { scalePane(curStage); scalePane(nextStage); }
  });

  /* current slide: click zones (left/right = prev/next) + tracking cursor */
  curFrame.addEventListener('click', (e) => {
    const r = curFrame.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width < 0.5) goPrev();
    else goNext();
  });

  let cursorTimer;
  curFrame.addEventListener('mousemove', (e) => {
    const r = curFrame.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cursor.style.left = (e.clientX - r.left) + 'px';
    cursor.style.top  = (e.clientY - r.top) + 'px';
    cursor.classList.remove('hidden');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => cursor.classList.add('hidden'), 1500);
    if (channel) channel.postMessage({ type: 'pointer', x: x, y: y });
  });
  curFrame.addEventListener('mouseleave', () => {
    cursor.classList.add('hidden');
    if (channel) channel.postMessage({ type: 'pointer', hide: true });
  });
}
