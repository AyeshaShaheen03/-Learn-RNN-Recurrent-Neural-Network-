/* ===========================================================
   nltk-animations.js — renders NLTK cards and their visual outputs
   =========================================================== */

(function () {
  'use strict';

  const CARDS = [
    {
      id: 'word-tokenize',
      name: 'word_tokenize',
      desc: 'Splits a sentence into individual words and punctuation.',
      code:
`from nltk.tokenize import word_tokenize
word_tokenize("RNNs love sequences!")
# -> ['RNNs', 'love', 'sequences', '!']`,
      words: ['RNNs', 'love', 'sequences', '!']
    },
    {
      id: 'sent-tokenize',
      name: 'sent_tokenize',
      desc: 'Splits a paragraph into sentences.',
      code:
`from nltk.tokenize import sent_tokenize
sent_tokenize("Hi there. How are you? I am fine.")
# -> ['Hi there.', 'How are you?', 'I am fine.']`,
      sentences: ['Hi there.', 'How are you?', 'I am fine.']
    },
    {
      id: 'stopwords',
      name: "stopwords.words('english')",
      desc: 'A list of common English words that usually carry little meaning.',
      code:
`from nltk.corpus import stopwords
sw = set(stopwords.words('english'))
[w for w in "the cat sat on the mat".split() if w not in sw]
# -> ['cat', 'sat', 'mat']`,
      words: ['the', 'cat', 'sat', 'on', 'the', 'mat'],
      stop:  [true, false, false, true, true, false]
    },
    {
      id: 'porter',
      name: 'PorterStemmer',
      desc: 'Chops suffixes off words to find a rough root.',
      code:
`from nltk.stem import PorterStemmer
ps = PorterStemmer()
ps.stem("running")   # -> 'run'
ps.stem("studies")   # -> 'studi'`,
      peels: [
        { word: 'running', keep: 3 },
        { word: 'studies', keep: 5 }
      ]
    },
    {
      id: 'lemma',
      name: 'WordNetLemmatizer',
      desc: 'Uses a dictionary to return the true base form (lemma).',
      code:
`from nltk.stem import WordNetLemmatizer
lem = WordNetLemmatizer()
lem.lemmatize("geese")        # -> 'goose'
lem.lemmatize("better", "a")  # -> 'good'`,
      morphs: [['geese', 'goose'], ['better', 'good']]
    },
    {
      id: 'pos',
      name: 'pos_tag',
      desc: 'Attaches a part-of-speech tag to each word.',
      code:
`from nltk import pos_tag, word_tokenize
pos_tag(word_tokenize("She sings well"))
# -> [('She','PRP'), ('sings','VBZ'), ('well','RB')]`,
      tags: [['She', 'PRP'], ['sings', 'VBZ'], ['well', 'RB']]
    },
    {
      id: 'ner',
      name: 'ne_chunk',
      desc: 'Finds named entities (people, places, organisations).',
      code:
`from nltk import ne_chunk, pos_tag, word_tokenize
ne_chunk(pos_tag(word_tokenize("Alice went to London")))
# (PERSON Alice) went to (GPE London)`,
      words: ['Alice', 'went', 'to', 'London'],
      ner:   [true,    false,  false, true]
    },
    {
      id: 'freq',
      name: 'FreqDist',
      desc: 'Counts how many times each word appears.',
      code:
`from nltk.probability import FreqDist
FreqDist("to be or not to be".split()).most_common(3)
# -> [('to', 2), ('be', 2), ('or', 1)]`,
      freq: [['to', 2], ['be', 2], ['or', 1], ['not', 1]]
    }
  ];

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function renderGrid() {
    const grid = document.getElementById('nltk-grid');
    if (!grid) return;
    grid.innerHTML = '';
    CARDS.forEach(card => {
      const c = el('div', 'nltk-card');
      c.id = 'card-' + card.id;
      c.appendChild(el('h3', null, card.name));
      c.appendChild(el('p', 'desc', card.desc));
      const pre = el('pre', null);
      pre.textContent = card.code;
      c.appendChild(pre);
      const viz = el('div', 'viz');
      viz.id = 'viz-' + card.id;
      c.appendChild(viz);
      grid.appendChild(c);
    });

    // Observer to animate each card when scrolled in
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id.replace('card-', '');
          runAnim(id);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    CARDS.forEach(c => {
      const node = document.getElementById('card-' + c.id);
      if (node) io.observe(node);
    });
  }

  function runAnim(id) {
    switch (id) {
      case 'word-tokenize': return animateWordTokenize();
      case 'sent-tokenize': return animateSentTokenize();
      case 'stopwords':     return animateStopwords();
      case 'porter':        return animatePorter();
      case 'lemma':         return animateLemma();
      case 'pos':           return animatePOS();
      case 'ner':           return animateNER();
      case 'freq':          return animateFreq();
    }
  }

  function animateWordTokenize() {
    const viz = document.getElementById('viz-word-tokenize');
    if (!viz) return;
    viz.innerHTML = '';
    const sentence = 'RNNs love sequences!';
    const s = el('div', null, `<div style="font-family:var(--font-mono);color:#c5cdff;font-size:1rem;width:100%;text-align:center;">"${sentence}"</div>`);
    viz.appendChild(s);
    const row = el('div', null);
    row.style.display = 'flex'; row.style.gap = '6px'; row.style.flexWrap = 'wrap';
    row.style.justifyContent = 'center'; row.style.marginTop = '10px'; row.style.width = '100%';
    viz.appendChild(row);

    const card = CARDS.find(c => c.id === 'word-tokenize');
    card.words.forEach((w, i) => {
      const chip = el('span', 'chip', w);
      chip.style.opacity = 0;
      row.appendChild(chip);
      anime({ targets: chip, opacity: [0, 1], translateY: [-20, 0], scale: [0.6, 1], duration: 500, delay: 400 + i * 180, easing: 'easeOutBack' });
    });
  }

  function animateSentTokenize() {
    const viz = document.getElementById('viz-sent-tokenize');
    if (!viz) return;
    viz.innerHTML = '';
    const col = el('div', null);
    col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '6px'; col.style.width = '100%';
    viz.appendChild(col);
    const card = CARDS.find(c => c.id === 'sent-tokenize');
    card.sentences.forEach((s, i) => {
      const b = el('span', 'chip bubble', s);
      b.style.opacity = 0;
      col.appendChild(b);
      anime({ targets: b, opacity: [0, 1], translateX: [-40, 0], duration: 600, delay: 200 + i * 300, easing: 'easeOutQuad' });
    });
  }

  function animateStopwords() {
    const viz = document.getElementById('viz-stopwords');
    if (!viz) return;
    viz.innerHTML = '';
    const card = CARDS.find(c => c.id === 'stopwords');
    card.words.forEach((w, i) => {
      const chip = el('span', 'chip', w);
      viz.appendChild(chip);
      if (card.stop[i]) {
        anime({ targets: chip, opacity: [1, 0.25], duration: 800, delay: 1000 + i * 120, easing: 'easeInOutQuad', complete: () => chip.classList.add('faded') });
      }
    });
  }

  function animatePorter() {
    const viz = document.getElementById('viz-porter');
    if (!viz) return;
    viz.innerHTML = '';
    const card = CARDS.find(c => c.id === 'porter');
    card.peels.forEach((p, row) => {
      const line = el('div', null);
      line.style.display = 'flex'; line.style.justifyContent = 'center';
      line.style.alignItems = 'center'; line.style.gap = '12px';
      line.style.marginBottom = '6px'; line.style.width = '100%';
      const mw = el('div', 'morph-word');
      p.word.split('').forEach((ch) => mw.appendChild(el('span', 'peel', ch)));
      line.appendChild(mw);
      const arrow = el('span', null, '&rarr;');
      arrow.style.color = '#764ba2'; arrow.style.fontSize = '1.4rem';
      line.appendChild(arrow);
      const result = el('div', 'morph-word', p.word.substring(0, p.keep));
      result.style.color = '#4ade80'; result.style.opacity = 0;
      line.appendChild(result);
      viz.appendChild(line);

      setTimeout(() => {
        const peels = mw.querySelectorAll('.peel');
        peels.forEach((sp, i) => { if (i >= p.keep) setTimeout(() => sp.classList.add('off'), 200 * (i - p.keep)); });
        setTimeout(() => { result.style.transition = 'opacity 0.5s'; result.style.opacity = 1; }, 200 * (p.word.length - p.keep) + 500);
      }, 700 + row * 1400);
    });
  }

  function animateLemma() {
    const viz = document.getElementById('viz-lemma');
    if (!viz) return;
    viz.innerHTML = '';
    const card = CARDS.find(c => c.id === 'lemma');
    card.morphs.forEach((m, row) => {
      const line = el('div', null);
      line.style.display = 'flex'; line.style.justifyContent = 'center'; line.style.alignItems = 'center';
      line.style.gap = '14px'; line.style.marginBottom = '6px'; line.style.width = '100%';
      const a = el('div', 'morph-word', m[0]);
      const arrow = el('span', null, '&rarr;');
      arrow.style.color = '#764ba2'; arrow.style.fontSize = '1.4rem';
      const b = el('div', 'morph-word', m[1]);
      b.style.color = '#4ade80'; b.style.opacity = 0;
      line.appendChild(a); line.appendChild(arrow); line.appendChild(b);
      viz.appendChild(line);

      setTimeout(() => {
        anime({ targets: a, opacity: [1, 0], translateY: [0, -14], duration: 500, easing: 'easeInOutQuad' });
        setTimeout(() => { b.style.transition = 'opacity 0.5s'; b.style.opacity = 1; }, 500);
      }, 700 + row * 1400);
    });
  }

  function animatePOS() {
    const viz = document.getElementById('viz-pos');
    if (!viz) return;
    viz.innerHTML = '';
    const card = CARDS.find(c => c.id === 'pos');
    card.tags.forEach((t, i) => {
      const g = el('span', 'tag-above');
      g.innerHTML = `<span class="tag">${t[1]}</span><span class="word">${t[0]}</span>`;
      viz.appendChild(g);
      setTimeout(() => g.classList.add('on'), 400 + i * 350);
    });
  }

  function animateNER() {
    const viz = document.getElementById('viz-ner');
    if (!viz) return;
    viz.innerHTML = '';
    const card = CARDS.find(c => c.id === 'ner');
    card.words.forEach((w, i) => {
      const chip = el('span', 'chip', w);
      viz.appendChild(chip);
      if (card.ner[i]) {
        setTimeout(() => {
          chip.classList.add('ner');
          anime({ targets: chip, scale: [1, 1.15, 1], duration: 700, easing: 'easeOutElastic(1, .6)' });
        }, 800 + i * 200);
      }
    });
  }

  function animateFreq() {
    const viz = document.getElementById('viz-freq');
    if (!viz) return;
    viz.innerHTML = '';
    const card = CARDS.find(c => c.id === 'freq');
    const width = 300, height = 140;
    const svg = d3.select(viz).append('svg')
      .attr('width', '100%').attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const maxCount = d3.max(card.freq, d => d[1]);
    const bandH = 22, gap = 6, left = 60;

    card.freq.forEach((d, i) => {
      const y = 10 + i * (bandH + gap);
      svg.append('text').attr('x', 50).attr('y', y + bandH * 0.7)
        .attr('fill', '#c5cdff').attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', 12).attr('text-anchor', 'end').text(d[0]);
      const bar = svg.append('rect')
        .attr('x', left).attr('y', y).attr('width', 0).attr('height', bandH)
        .attr('rx', 4).attr('fill', '#667eea');
      const full = (width - left - 40) * (d[1] / maxCount);
      bar.transition().delay(300 + i * 180).duration(800).ease(d3.easeCubicOut).attr('width', full);
      svg.append('text')
        .attr('x', left + full + 6).attr('y', y + bandH * 0.7)
        .attr('fill', '#4ade80').attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', 12).attr('opacity', 0).text(d[1])
        .transition().delay(300 + i * 180 + 600).duration(300).attr('opacity', 1)
        .attr('x', left + full + 6);
    });
  }

  // Boot after app-ready so d3 and anime are present
  function boot() { renderGrid(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
