/* ===========================================================
   rnn-animations.js — all 6 RNN-tab scenes
   Depends on: GSAP, anime, d3 (loaded via CDN)
   =========================================================== */

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const fired = new Set();   // so each scene animates once per "re-enter"

  function ns(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // Event router: when main.js tells us a scene is visible, run the right animator
  window.addEventListener('scene:visible', (e) => {
    const { name, el } = e.detail;
    if (!name.startsWith('rnn-')) return;
    // Allow re-animation by clearing the fired flag if user scrolls away and back
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight || rect.bottom < 0) { fired.delete(name); return; }
    if (fired.has(name)) return;
    fired.add(name);

    switch (name) {
      case 'rnn-intro':       return animIntro();
      case 'rnn-input-flow':  return animInputFlow();
      case 'rnn-cell':        return animCell();
      case 'rnn-activations': return animActivations();
      case 'rnn-unroll':      return animUnroll();
      case 'rnn-vanish':      return animVanish();
    }
  });

  // Reset "fired" when a scene leaves view, so returning replays it
  const resetObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        const name = entry.target.getAttribute('data-anim');
        if (name) fired.delete(name);
      }
    });
  }, { threshold: 0 });
  window.addEventListener('app:ready', () => {
    document.querySelectorAll('[data-anim^="rnn-"]').forEach(el => resetObs.observe(el));
  });

  /* ------------------------------------------------------------------
     SECTION 1 — INTRO: reader character + thought bubble
  ------------------------------------------------------------------ */
  function animIntro() {
    const svg = document.getElementById('reader-stage');
    if (!svg) return;
    clear(svg);

    // Character (stylized)
    const headCx = 120, headCy = 170;
    svg.appendChild(ns('circle', { cx: headCx, cy: headCy, r: 36, fill: '#1e2447', stroke: '#8fd4ff', 'stroke-width': 2 }));
    svg.appendChild(ns('circle', { cx: headCx - 12, cy: headCy - 4, r: 3, fill: '#8fd4ff' }));
    svg.appendChild(ns('circle', { cx: headCx + 12, cy: headCy - 4, r: 3, fill: '#8fd4ff' }));
    const mouth = ns('path', { d: `M ${headCx-10} ${headCy+12} Q ${headCx} ${headCy+18} ${headCx+10} ${headCy+12}`, stroke: '#8fd4ff', 'stroke-width': 2, fill: 'none' });
    svg.appendChild(mouth);
    svg.appendChild(ns('rect', { x: headCx - 28, y: headCy + 38, width: 56, height: 60, rx: 10, fill: '#1e2447', stroke: '#8fd4ff', 'stroke-width': 2 }));

    // Thought bubble
    const bubble = ns('g', { id: 'thought' });
    bubble.appendChild(ns('circle', { cx: 250, cy: 150, r: 8, fill: '#764ba2', opacity: 0.7 }));
    bubble.appendChild(ns('circle', { cx: 270, cy: 130, r: 12, fill: '#764ba2', opacity: 0.8 }));
    const bubbleMain = ns('rect', { x: 290, y: 60, width: 300, height: 120, rx: 22, fill: '#1e2447', stroke: '#764ba2', 'stroke-width': 2 });
    bubble.appendChild(bubbleMain);
    const bubbleText = ns('text', { x: 440, y: 128, 'text-anchor': 'middle', fill: '#eedcff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '18', id: 'thought-text' });
    bubbleText.textContent = '...';
    bubble.appendChild(bubbleText);
    svg.appendChild(bubble);

    // Words flying in
    const words = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
    const memoryStates = ['The', 'The cat', '...cat sat', '...sat on', '...on the', '...the mat'];

    const track = ns('g');
    svg.appendChild(track);

    words.forEach((w, i) => {
      const g = ns('g', { opacity: 0, transform: 'translate(820,170)' });
      const rect = ns('rect', { x: -30, y: -16, width: 60, height: 32, rx: 16, fill: '#667eea', opacity: 0.9 });
      const t = ns('text', { x: 0, y: 5, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '14' });
      t.textContent = w;
      g.appendChild(rect); g.appendChild(t);
      track.appendChild(g);

      gsap.to(g, {
        attr: { transform: `translate(${headCx + 60},170)`, opacity: 1 },
        duration: 1.0,
        delay: 0.3 + i * 1.1,
        ease: 'power2.out',
        onStart: () => { g.setAttribute('opacity', '1'); },
        onComplete: () => {
          gsap.to(g, { attr: { opacity: 0 }, duration: 0.35, delay: 0.25 });
          bubbleText.textContent = memoryStates[i];
          gsap.fromTo(bubbleText, { opacity: 0.3, attr: { 'font-size': 14 } }, { opacity: 1, attr: { 'font-size': 18 }, duration: 0.4, ease: 'back.out(2)' });
          gsap.fromTo(bubbleMain, { attr: { stroke: '#f06292' } }, { attr: { stroke: '#764ba2' }, duration: 0.5 });
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     SECTION 2 — INPUT FLOW: word -> token -> vector -> cell
  ------------------------------------------------------------------ */
  function animInputFlow() {
    const svg = document.getElementById('input-flow-stage');
    if (!svg) return;
    clear(svg);

    // Three boxes + arrows
    const boxes = [
      { x: 60,  label: '"hello"',         sub: 'raw word',     color: '#8fd4ff' },
      { x: 320, label: '[42]',            sub: 'token id',     color: '#764ba2' },
      { x: 580, label: '[0.12,-0.33,...]',sub: 'embedding',    color: '#f06292' },
    ];

    boxes.forEach((b, i) => {
      const g = ns('g', { transform: `translate(${b.x},60)`, opacity: 0 });
      g.appendChild(ns('rect', { x: 0, y: 0, width: 200, height: 80, rx: 12, fill: '#12152a', stroke: b.color, 'stroke-width': 2 }));
      const t1 = ns('text', { x: 100, y: 38, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '18' });
      t1.textContent = b.label;
      const t2 = ns('text', { x: 100, y: 60, 'text-anchor': 'middle', fill: '#b8bedc', 'font-family': 'Inter', 'font-size': '12' });
      t2.textContent = b.sub;
      g.appendChild(t1); g.appendChild(t2);
      svg.appendChild(g);
      gsap.to(g, { attr: { opacity: 1 }, duration: 0.5, delay: 0.2 + i * 0.6 });
    });

    // Arrows between boxes
    const arrows = [
      { x1: 260, x2: 320 },
      { x1: 520, x2: 580 },
    ];
    arrows.forEach((a, i) => {
      const path = ns('path', {
        d: `M ${a.x1} 100 L ${a.x2} 100`,
        stroke: '#8fd4ff', 'stroke-width': 3, fill: 'none',
        'marker-end': 'url(#arrowhead)'
      });
      path.setAttribute('stroke-dasharray', '80');
      path.setAttribute('stroke-dashoffset', '80');
      svg.appendChild(path);
      gsap.to(path, { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, delay: 0.5 + i * 0.6, ease: 'power2.out' });
    });

    // Arrowhead marker
    const defs = ns('defs');
    const marker = ns('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    marker.appendChild(ns('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#8fd4ff' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Final RNN cell receiver
    const cellG = ns('g', { transform: 'translate(780,40)', opacity: 0 });
    cellG.appendChild(ns('rect', { x: 0, y: 0, width: 100, height: 120, rx: 14, fill: '#1e2447', stroke: '#4ade80', 'stroke-width': 2 }));
    const ct = ns('text', { x: 50, y: 60, 'text-anchor': 'middle', fill: '#4ade80', 'font-family': 'JetBrains Mono, monospace', 'font-size': '18' });
    ct.textContent = 'RNN';
    cellG.appendChild(ct);
    const ct2 = ns('text', { x: 50, y: 84, 'text-anchor': 'middle', fill: '#b8bedc', 'font-family': 'Inter', 'font-size': '12' });
    ct2.textContent = 'cell';
    cellG.appendChild(ct2);
    svg.appendChild(cellG);
    gsap.to(cellG, { attr: { opacity: 1 }, duration: 0.5, delay: 1.8 });

    // Animated packet flowing along the whole line
    const packet = ns('circle', { r: 6, cx: 60, cy: 100, fill: '#f06292' });
    packet.style.filter = 'drop-shadow(0 0 8px #f06292)';
    svg.appendChild(packet);
    gsap.fromTo(packet, { attr: { cx: 60, cy: 100, opacity: 0 } }, {
      attr: { cx: 830, opacity: 1 }, duration: 2.2, delay: 2.2, ease: 'power1.inOut'
    });
  }

  /* ------------------------------------------------------------------
     SECTION 3 — INSIDE THE CELL
  ------------------------------------------------------------------ */
  function animCell() {
    const svg = document.getElementById('cell-stage');
    if (!svg) return;
    clear(svg);

    // Big cell box
    svg.appendChild(ns('rect', { x: 220, y: 60, width: 460, height: 260, rx: 18, fill: '#12152a', stroke: '#667eea', 'stroke-width': 2, 'stroke-dasharray': '6,4' }));
    const cellLabel = ns('text', { x: 450, y: 90, 'text-anchor': 'middle', fill: '#c5cdff', 'font-family': 'Inter', 'font-size': '14' });
    cellLabel.textContent = 'RNN CELL';
    cellLabel.setAttribute('letter-spacing', '3');
    svg.appendChild(cellLabel);

    // x_t (input from bottom)
    const xNode = ns('g', { transform: 'translate(340,330)' });
    xNode.appendChild(ns('circle', { r: 26, fill: '#8fd4ff' }));
    const xt = ns('text', { 'text-anchor': 'middle', y: 5, fill: '#0b0d18', 'font-family': 'JetBrains Mono, monospace', 'font-size': '18' });
    xt.innerHTML = 'x<tspan dy="6" font-size="12">t</tspan>';
    xNode.appendChild(xt);
    svg.appendChild(xNode);

    // h_{t-1} (input from left)
    const hNode = ns('g', { transform: 'translate(180,190)' });
    hNode.appendChild(ns('circle', { r: 26, fill: '#764ba2' }));
    const ht1 = ns('text', { 'text-anchor': 'middle', y: 5, fill: '#fff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '16' });
    ht1.innerHTML = 'h<tspan dy="6" font-size="11">t-1</tspan>';
    hNode.appendChild(ht1);
    svg.appendChild(hNode);

    // Sum node inside the cell
    const sumNode = ns('g', { transform: 'translate(420,190)', opacity: 0 });
    sumNode.appendChild(ns('circle', { r: 24, fill: '#1e2447', stroke: '#c5cdff', 'stroke-width': 2 }));
    const sumT = ns('text', { 'text-anchor': 'middle', y: 6, fill: '#c5cdff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '22' });
    sumT.textContent = '+';
    sumNode.appendChild(sumT);
    svg.appendChild(sumNode);

    // tanh node
    const tanhNode = ns('g', { transform: 'translate(560,190)', opacity: 0 });
    tanhNode.appendChild(ns('rect', { x: -34, y: -22, width: 68, height: 44, rx: 10, fill: '#1e2447', stroke: '#4ade80', 'stroke-width': 2 }));
    const tanhT = ns('text', { 'text-anchor': 'middle', y: 6, fill: '#4ade80', 'font-family': 'JetBrains Mono, monospace', 'font-size': '16' });
    tanhT.textContent = 'tanh';
    tanhNode.appendChild(tanhT);
    svg.appendChild(tanhNode);

    // h_t output (to right)
    const hOut = ns('g', { transform: 'translate(720,190)', opacity: 0 });
    hOut.appendChild(ns('circle', { r: 26, fill: '#764ba2' }));
    const htT = ns('text', { 'text-anchor': 'middle', y: 5, fill: '#fff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '16' });
    htT.innerHTML = 'h<tspan dy="6" font-size="11">t</tspan>';
    hOut.appendChild(htT);
    svg.appendChild(hOut);

    // Labelled paths with weight matrices
    function addPath(d, color, label, labelX, labelY, cls) {
      const p = ns('path', { d, stroke: color, 'stroke-width': 2.5, fill: 'none', 'stroke-dasharray': '260', 'stroke-dashoffset': '260', 'marker-end': 'url(#ah2)' });
      svg.appendChild(p);
      const lbl = ns('text', { x: labelX, y: labelY, fill: color, 'font-family': 'JetBrains Mono, monospace', 'font-size': '14', 'text-anchor': 'middle', opacity: 0 });
      lbl.innerHTML = label;
      svg.appendChild(lbl);
      return { p, lbl, cls };
    }

    // arrowhead
    const defs = ns('defs');
    const marker = ns('marker', { id: 'ah2', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    marker.appendChild(ns('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#c5cdff' }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    const p1 = addPath('M 340 304 C 340 250 380 210 400 196',          '#8fd4ff', 'W<tspan font-size="10" dy="4">xh</tspan>·x<tspan font-size="10" dy="4">t</tspan>', 360, 258, 'term-wxh');
    const p2 = addPath('M 206 190 L 400 190',                          '#764ba2', 'W<tspan font-size="10" dy="4">hh</tspan>·h<tspan font-size="10" dy="4">t-1</tspan>', 300, 176, 'term-whh');
    const p3 = addPath('M 442 190 L 526 190',                          '#c5cdff', '+ b<tspan font-size="10" dy="4">h</tspan>', 484, 178, 'term-bh');
    const p4 = addPath('M 594 190 L 694 190',                          '#4ade80', 'h<tspan font-size="10" dy="4">t</tspan>', 646, 178, '');

    // Timeline
    const tl = gsap.timeline({ delay: 0.2 });
    tl.to(p1.p, { attr: { 'stroke-dashoffset': 0 }, duration: 0.7 })
      .to(p1.lbl, { attr: { opacity: 1 }, duration: 0.3 }, '-=0.4')
      .add(() => highlightTerm('term-wxh'))
      .to(p2.p, { attr: { 'stroke-dashoffset': 0 }, duration: 0.7 }, '+=0.3')
      .to(p2.lbl, { attr: { opacity: 1 }, duration: 0.3 }, '-=0.4')
      .add(() => highlightTerm('term-whh'))
      .to(sumNode, { attr: { opacity: 1 }, duration: 0.4, transformOrigin: 'center', scale: 1.2 }, '+=0.2')
      .to(p3.p, { attr: { 'stroke-dashoffset': 0 }, duration: 0.6 }, '+=0.2')
      .to(p3.lbl, { attr: { opacity: 1 }, duration: 0.3 }, '-=0.3')
      .add(() => highlightTerm('term-bh'))
      .to(tanhNode, { attr: { opacity: 1 }, duration: 0.4 }, '+=0.2')
      .to(p4.p, { attr: { 'stroke-dashoffset': 0 }, duration: 0.6 }, '+=0.2')
      .to(p4.lbl, { attr: { opacity: 1 }, duration: 0.3 }, '-=0.3')
      .to(hOut, { attr: { opacity: 1 }, duration: 0.4 }, '-=0.2')
      .add(() => highlightTerm(null));

    function highlightTerm(cls) {
      document.querySelectorAll('.formula .term').forEach(t => t.classList.remove('hot'));
      if (cls) {
        const el = document.querySelector('.formula .' + cls);
        if (el) el.classList.add('hot');
      }
    }
  }

  /* ------------------------------------------------------------------
     SECTION 4 — ACTIVATION FUNCTIONS (D3)
  ------------------------------------------------------------------ */
  function animActivations() {
    const fns = {
      sigmoid: x => 1 / (1 + Math.exp(-x)),
      tanh:    x => Math.tanh(x),
      relu:    x => Math.max(0, x)
    };
    const yRange = {
      sigmoid: [-0.1, 1.1],
      tanh:    [-1.1, 1.1],
      relu:    [-0.5, 3.2]
    };
    document.querySelectorAll('.act-plot').forEach(svgEl => {
      const fn = svgEl.getAttribute('data-fn');
      drawActivation(svgEl, fns[fn], yRange[fn], fn);
    });
  }

  function drawActivation(svgEl, fn, yDomain, name) {
    const w = 240, h = 180, pad = 24;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear().domain([-4, 4]).range([pad, w - pad]);
    const y = d3.scaleLinear().domain(yDomain).range([h - pad, pad]);

    // axes
    svg.append('line').attr('x1', pad).attr('x2', w - pad).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', '#2b325f');
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', pad).attr('y2', h - pad).attr('stroke', '#2b325f');

    // grid labels
    svg.append('text').attr('x', w - pad).attr('y', y(0) + 12).attr('fill', '#7d85b0').attr('font-size', 9).attr('text-anchor', 'end').text('x');
    svg.append('text').attr('x', x(0) + 4).attr('y', pad + 8).attr('fill', '#7d85b0').attr('font-size', 9).text('f(x)');

    // curve
    const data = d3.range(-4, 4.05, 0.1).map(v => [v, fn(v)]);
    const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX);
    const path = svg.append('path')
      .attr('d', line(data))
      .attr('stroke', '#8fd4ff')
      .attr('stroke-width', 2)
      .attr('fill', 'none');
    const total = path.node().getTotalLength();
    path.attr('stroke-dasharray', total).attr('stroke-dashoffset', total)
      .transition().duration(1200).attr('stroke-dashoffset', 0);

    // moving dots
    const inDot = svg.append('circle').attr('r', 5).attr('fill', '#f06292').attr('cy', y(0));
    const outDot = svg.append('circle').attr('r', 5).attr('fill', '#4ade80').attr('cx', x(0));
    const connect = svg.append('line').attr('stroke', '#764ba2').attr('stroke-dasharray', '3,3').attr('stroke-width', 1);

    // animate a sweeping x
    let t0 = performance.now();
    function tick() {
      const el = svgEl;
      if (!document.body.contains(el)) return;
      const t = (performance.now() - t0) / 1000;
      const xv = Math.sin(t * 1.1) * 3.5;      // -3.5 .. 3.5
      const yv = fn(xv);
      inDot.attr('cx', x(xv));
      outDot.attr('cy', y(yv));
      connect.attr('x1', x(xv)).attr('x2', x(xv)).attr('y1', y(0)).attr('y2', y(yv));
      // also a line from y-axis to out-dot
      requestAnimationFrame(tick);
    }
    setTimeout(() => requestAnimationFrame(tick), 800);
  }

  /* ------------------------------------------------------------------
     SECTION 5 — UNROLLING
  ------------------------------------------------------------------ */
  function animUnroll() {
    const svg = document.getElementById('unroll-stage');
    if (!svg) return;
    clear(svg);

    const steps = 5;
    const gap = 160;
    const startX = 60;
    const y = 130;

    // defs arrowhead
    const defs = ns('defs');
    const m = ns('marker', { id: 'ah3', viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    m.appendChild(ns('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#8fd4ff' }));
    defs.appendChild(m);
    svg.appendChild(defs);

    for (let i = 0; i < steps; i++) {
      const cx = startX + i * gap;
      // hidden state box
      const box = ns('g', { transform: `translate(${cx},${y})`, opacity: 0 });
      const intensity = 0.25 + (i / (steps - 1)) * 0.75; // darker purple as i grows
      box.appendChild(ns('rect', { x: -40, y: -30, width: 80, height: 60, rx: 10, fill: `rgba(118,75,162,${intensity})`, stroke: '#764ba2', 'stroke-width': 2 }));
      const tt = ns('text', { 'text-anchor': 'middle', y: 5, fill: '#fff', 'font-family': 'JetBrains Mono, monospace', 'font-size': '14' });
      tt.innerHTML = `h<tspan font-size="10" dy="4">${i + 1}</tspan>`;
      box.appendChild(tt);
      svg.appendChild(box);
      gsap.to(box, { attr: { opacity: 1 }, duration: 0.35, delay: i * 0.35 });

      // x_i input below
      const xin = ns('g', { transform: `translate(${cx},${y + 80})`, opacity: 0 });
      xin.appendChild(ns('circle', { r: 16, fill: '#8fd4ff' }));
      const xtt = ns('text', { 'text-anchor': 'middle', y: 4, fill: '#0b0d18', 'font-family': 'JetBrains Mono, monospace', 'font-size': '12' });
      xtt.innerHTML = `x<tspan font-size="8" dy="3">${i + 1}</tspan>`;
      xin.appendChild(xtt);
      svg.appendChild(xin);
      gsap.to(xin, { attr: { opacity: 1 }, duration: 0.35, delay: i * 0.35 + 0.1 });

      // vertical arrow from x to h
      const vA = ns('path', { d: `M ${cx} ${y + 64} L ${cx} ${y + 36}`, stroke: '#8fd4ff', 'stroke-width': 2, 'marker-end': 'url(#ah3)', 'stroke-dasharray': '40', 'stroke-dashoffset': '40' });
      svg.appendChild(vA);
      gsap.to(vA, { attr: { 'stroke-dashoffset': 0 }, duration: 0.4, delay: i * 0.35 + 0.15 });

      // horizontal arrow to next
      if (i < steps - 1) {
        const hA = ns('path', { d: `M ${cx + 42} ${y} L ${cx + gap - 42} ${y}`, stroke: '#764ba2', 'stroke-width': 2.5, 'marker-end': 'url(#ah3)', 'stroke-dasharray': '140', 'stroke-dashoffset': '140' });
        svg.appendChild(hA);
        gsap.to(hA, { attr: { 'stroke-dashoffset': 0 }, duration: 0.55, delay: i * 0.35 + 0.3, ease: 'power2.out' });

        // traveling packet
        const pk = ns('circle', { r: 5, cx: cx + 42, cy: y, fill: '#4ade80', opacity: 0 });
        pk.style.filter = 'drop-shadow(0 0 8px #4ade80)';
        svg.appendChild(pk);
        gsap.to(pk, { attr: { opacity: 1 }, duration: 0.2, delay: i * 0.35 + 0.55 });
        gsap.to(pk, { attr: { cx: cx + gap - 42 }, duration: 0.55, delay: i * 0.35 + 0.55, ease: 'power1.inOut' });
        gsap.to(pk, { attr: { opacity: 0 }, duration: 0.2, delay: i * 0.35 + 1.1 });
      }
    }

    // Shared-weights caption
    const cap = ns('text', { x: 450, y: 30, 'text-anchor': 'middle', fill: '#c5cdff', 'font-family': 'Inter', 'font-size': '14' });
    cap.textContent = 'Same weights reused at every step — that is what "recurrent" means.';
    svg.appendChild(cap);
  }

  /* ------------------------------------------------------------------
     SECTION 6 — VANISHING GRADIENT
  ------------------------------------------------------------------ */
  function animVanish() {
    const vSvg = document.getElementById('vanish-stage');
    const lSvg = document.getElementById('lstm-stage');
    if (!vSvg || !lSvg) return;
    clear(vSvg); clear(lSvg);

    const N = 10;
    const w = 900, h = 120;
    const stepX = (w - 80) / (N - 1);

    function buildRow(svg, fadeMode) {
      // chain of cells
      for (let i = 0; i < N; i++) {
        const cx = 40 + i * stepX;
        const cy = h / 2;
        svg.appendChild(ns('circle', { cx, cy, r: 16, fill: '#1e2447', stroke: '#2b325f', 'stroke-width': 1.5 }));
        const t = ns('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: '#7d85b0', 'font-family': 'JetBrains Mono, monospace', 'font-size': '10' });
        t.textContent = 't' + (i + 1);
        svg.appendChild(t);
        if (i < N - 1) {
          svg.appendChild(ns('line', { x1: cx + 16, y1: cy, x2: cx + stepX - 16, y2: cy, stroke: '#2b325f', 'stroke-width': 1.5 }));
        }
      }

      // backward travelling pulse
      const pulse = ns('circle', { r: 14, cx: 40 + (N - 1) * stepX, cy: h / 2, fill: '#ef4444', opacity: 0.95 });
      pulse.style.filter = 'drop-shadow(0 0 18px #ef4444)';
      svg.appendChild(pulse);

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
      for (let i = N - 1; i > 0; i--) {
        const targetX = 40 + (i - 1) * stepX;
        if (fadeMode) {
          tl.to(pulse, { attr: { cx: targetX, r: Math.max(2, 14 * Math.pow(0.7, N - i)), opacity: Math.max(0.08, Math.pow(0.75, N - i)) }, duration: 0.55, ease: 'power1.inOut' });
        } else {
          tl.to(pulse, { attr: { cx: targetX, r: 14, opacity: 0.95 }, duration: 0.55, ease: 'power1.inOut' });
        }
      }
      tl.to(pulse, { attr: { cx: 40 + (N - 1) * stepX, r: 14, opacity: 0.95 }, duration: 0.01, delay: 0.8 });
    }

    buildRow(vSvg, true);
    buildRow(lSvg, false);

    // Counter animation (fade case)
    const valEl = document.getElementById('vanish-value');
    if (valEl) {
      const obj = { v: 1.0 };
      gsap.to(obj, {
        v: 0.0001,
        duration: 5,
        ease: 'power2.in',
        repeat: -1,
        yoyo: false,
        repeatDelay: 1.5,
        onUpdate: () => { valEl.textContent = obj.v.toFixed(4); },
        onRepeat: () => { obj.v = 1.0; valEl.textContent = '1.0000'; }
      });
    }
  }
})();
