/* ===========================================================
   outcomes-animations.js — model comparison cards + charts
   =========================================================== */

(function () {
  'use strict';

  const MODELS = [
    {
      id: 'simplernn',
      name: 'SimpleRNN',
      color: '#8fd4ff',
      strengths: 'Tiny, fast to train, easy to understand.',
      weaknesses: 'Suffers from vanishing gradients; forgets long context.',
      expected: 'Fluent for ~5-10 words then repeats or drifts.',
      sample:
`Seed:  "shall i compare thee to"
Output: "shall i compare thee to the sun the sun the sun the"`,
      accuracy: 0.32,
      loss: [3.8, 3.2, 2.9, 2.7, 2.6, 2.55, 2.52, 2.50, 2.49, 2.49]
    },
    {
      id: 'lstm',
      name: 'LSTM',
      color: '#764ba2',
      strengths: 'Forget/input/output gates keep long-range memory.',
      weaknesses: 'Slower than RNN; more parameters to train.',
      expected: 'Keeps Shakespeare-like rhythm for dozens of words.',
      sample:
`Seed:  "shall i compare thee to"
Output: "shall i compare thee to a summer's day thou art more fair"`,
      accuracy: 0.54,
      loss: [3.8, 3.0, 2.5, 2.1, 1.8, 1.6, 1.45, 1.35, 1.28, 1.22]
    },
    {
      id: 'gru',
      name: 'GRU',
      color: '#4ade80',
      strengths: 'Like LSTM but with fewer gates — faster to train.',
      weaknesses: 'Slightly less expressive on very long sequences.',
      expected: 'Nearly LSTM quality at ~75% of the cost.',
      sample:
`Seed:  "shall i compare thee to"
Output: "shall i compare thee to the day of my love and truth"`,
      accuracy: 0.51,
      loss: [3.8, 3.05, 2.55, 2.15, 1.85, 1.65, 1.5, 1.4, 1.33, 1.28]
    },
    {
      id: 'bilstm',
      name: 'Bidirectional LSTM',
      color: '#f06292',
      strengths: 'Reads the sequence forward AND backward.',
      weaknesses: 'Needs the full sequence — cannot stream/generate live.',
      expected: 'Great for classification; awkward for next-word generation.',
      sample:
`Task: tag sentiment of a review
Input:  "I loved the acting but hated the pacing"
Output: POSITIVE on 'acting', NEGATIVE on 'pacing'`,
      accuracy: 0.62,
      loss: [3.8, 2.8, 2.3, 1.9, 1.6, 1.4, 1.25, 1.15, 1.08, 1.02]
    }
  ];

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function renderCards() {
    const grid = document.getElementById('outcomes-grid');
    if (!grid) return;
    grid.innerHTML = '';
    MODELS.forEach(m => {
      const c = el('div', 'outcome-card');
      const head = el('h3', null, m.name);
      head.style.color = m.color;
      c.appendChild(head);
      const t = el('div', 'traits');
      t.innerHTML =
        `<div><b>Strengths:</b> ${m.strengths}</div>` +
        `<div><b>Weaknesses:</b> ${m.weaknesses}</div>` +
        `<div><b>Expected output:</b> ${m.expected}</div>`;
      c.appendChild(t);
      const s = el('div', 'sample');
      s.textContent = m.sample;
      c.appendChild(s);
      grid.appendChild(c);
    });
  }

  function renderAccuracyBars() {
    const svg = d3.select('#acc-bars');
    if (svg.empty()) return;
    svg.selectAll('*').remove();
    const w = 420, h = 220, pad = { t: 10, r: 20, b: 30, l: 110 };

    const y = d3.scaleBand().domain(MODELS.map(m => m.name)).range([pad.t, h - pad.b]).padding(0.3);
    const x = d3.scaleLinear().domain([0, 1]).range([pad.l, w - pad.r]);

    // axes labels
    MODELS.forEach(m => {
      svg.append('text').attr('x', pad.l - 8).attr('y', y(m.name) + y.bandwidth() * 0.65)
        .attr('fill', '#c5cdff').attr('font-size', 12).attr('font-family', 'JetBrains Mono, monospace')
        .attr('text-anchor', 'end').text(m.name);
    });

    // axis line
    svg.append('line').attr('x1', pad.l).attr('x2', w - pad.r).attr('y1', h - pad.b + 2).attr('y2', h - pad.b + 2).attr('stroke', '#2b325f');

    // x ticks
    [0, 0.25, 0.5, 0.75, 1].forEach(v => {
      svg.append('text').attr('x', x(v)).attr('y', h - pad.b + 16)
        .attr('fill', '#7d85b0').attr('font-size', 10).attr('text-anchor', 'middle').text(v.toFixed(2));
      svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', pad.t).attr('y2', h - pad.b).attr('stroke', '#2b325f').attr('stroke-dasharray', '2,3').attr('opacity', 0.4);
    });

    // bars (animated)
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        MODELS.forEach((m, i) => {
          const full = x(m.accuracy) - pad.l;
          svg.append('rect')
            .attr('x', pad.l).attr('y', y(m.name))
            .attr('height', y.bandwidth()).attr('width', 0)
            .attr('rx', 4).attr('fill', m.color).attr('opacity', 0.9)
            .transition().delay(i * 180).duration(900).ease(d3.easeCubicOut).attr('width', full);

          svg.append('text')
            .attr('x', pad.l + 6).attr('y', y(m.name) + y.bandwidth() * 0.65)
            .attr('fill', '#0b0d18').attr('font-size', 12).attr('font-weight', 700)
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('opacity', 0)
            .text(`${(m.accuracy * 100).toFixed(0)}%`)
            .transition().delay(i * 180 + 700).duration(300).attr('opacity', 1);
        });
        io.disconnect();
      });
    }, { threshold: 0.3 });
    io.observe(document.getElementById('acc-bars'));
  }

  function renderLossCurves() {
    const svgEl = document.getElementById('loss-curves');
    if (!svgEl) return;
    const svg = d3.select('#loss-curves');
    svg.selectAll('*').remove();
    const w = 420, h = 220, pad = { t: 14, r: 90, b: 28, l: 34 };

    const epochs = MODELS[0].loss.length;
    const x = d3.scaleLinear().domain([0, epochs - 1]).range([pad.l, w - pad.r]);
    const y = d3.scaleLinear().domain([0.8, 4]).range([h - pad.b, pad.t]);

    // grid + axes
    [1, 2, 3, 4].forEach(v => {
      svg.append('line').attr('x1', pad.l).attr('x2', w - pad.r)
        .attr('y1', y(v)).attr('y2', y(v)).attr('stroke', '#2b325f').attr('stroke-dasharray', '2,3').attr('opacity', 0.4);
      svg.append('text').attr('x', pad.l - 6).attr('y', y(v) + 3).attr('fill', '#7d85b0').attr('font-size', 10).attr('text-anchor', 'end').text(v.toFixed(1));
    });
    svg.append('text').attr('x', pad.l - 6).attr('y', h - pad.b + 14).attr('fill', '#7d85b0').attr('font-size', 10).attr('text-anchor', 'end').text('loss');
    svg.append('text').attr('x', w - pad.r).attr('y', h - pad.b + 14).attr('fill', '#7d85b0').attr('font-size', 10).attr('text-anchor', 'end').text('epochs');

    const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        MODELS.forEach((m, i) => {
          const path = svg.append('path')
            .attr('d', line(m.loss))
            .attr('stroke', m.color)
            .attr('stroke-width', 2.2)
            .attr('fill', 'none');
          const total = path.node().getTotalLength();
          path.attr('stroke-dasharray', total).attr('stroke-dashoffset', total)
            .transition().delay(i * 250).duration(1400).ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0);

          // Legend
          const ly = pad.t + 10 + i * 18;
          svg.append('rect').attr('x', w - pad.r + 10).attr('y', ly - 8).attr('width', 14).attr('height', 3).attr('fill', m.color);
          svg.append('text').attr('x', w - pad.r + 28).attr('y', ly - 3).attr('fill', '#c5cdff').attr('font-size', 11).attr('font-family', 'JetBrains Mono, monospace').text(m.name);
        });
        io.disconnect();
      });
    }, { threshold: 0.3 });
    io.observe(svgEl);
  }

  function boot() {
    renderCards();
    renderAccuracyBars();
    renderLossCurves();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
