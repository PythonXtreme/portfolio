/* script.js: vanilla JS. Sections: 1 Nav/progress · 2 Menu · 3 Hero network · 4 Reveals
   5 Skill bars + count-up · 6 Active link · 7 Micro-interactions · 8 Form · 9 Misc */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. NAV STATE + SCROLL PROGRESS */
  const header = $('.site-header'), bar = $('.progress');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 40);
    bar.style.width = (scrollY / (document.documentElement.scrollHeight - innerHeight) * 100) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 2. MOBILE MENU */
  const toggle = $('.nav-toggle'), links = $('.nav-links');
  const setMenu = (o) => { toggle.setAttribute('aria-expanded', o); links.classList.toggle('open', o); };
  toggle.onclick = () => setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  links.onclick = (e) => e.target.closest('a') && setMenu(false);
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  /* 3. HERO NETWORK: nodes link to their 2 nearest neighbours; lines draw in, pulses travel along some.
     Tweak COLS/ROWS for density, JITTER for randomness. */
  const net = $('#net'), NS = 'http://www.w3.org/2000/svg', COLS = 6, ROWS = 4, JITTER = 55;
  const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };
  const layer = mk('g', { class: 'layer' }, net), pts = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // seeded: same layout every load
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    pts.push([100 + c * 120 + (rnd() - .5) * JITTER * 2, 90 + r * 140 + (rnd() - .5) * JITTER * 2]);
  const edges = new Set();
  pts.forEach((p, i) => pts.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2]).filter(([j]) => j !== i)
    .sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([j]) => edges.add(i < j ? i + '-' + j : j + '-' + i)));
  [...edges].forEach((e, k) => {
    const [a, b] = e.split('-').map(Number);
    mk('line', { x1: pts[a][0], y1: pts[a][1], x2: pts[b][0], y2: pts[b][1], pathLength: 1, style: `--k:${k}` }, layer);
    if (!reduced && k % 4 === 0) { // signal pulse travelling along the line
      const c = mk('circle', { class: 'pulse', r: 3, opacity: .9 }, layer);
      const m = mk('animateMotion', { path: `M${pts[a]} L${pts[b]}`, dur: 2.5 + rnd() * 2 + 's', begin: 2 + rnd() * 3 + 's', repeatCount: 'indefinite' }, c);
    }
  });
  pts.forEach((p, k) => mk('circle', { class: 'n', cx: p[0], cy: p[1], r: 4, style: `--k:${k}` }, layer));
  if (!reduced) $('.hero').addEventListener('mousemove', (e) => { // mouse parallax
    layer.style.transform = `translate(${(e.clientX / innerWidth - .5) * -24}px,${(e.clientY / innerHeight - .5) * -24}px)`;
  });

  /* 3b. PROJECT SCENES: scatter dots and calculator keys are generated here (edit the data to restyle) */
  const dots = $('#dots'), keys = $('#keys');
  [[38,126],[50,124],[60,108],[70,88],[78,110],[88,98],[96,104],[104,82],[112,96],[120,90],[128,70],[138,84],[148,74],[156,62],[166,72],[176,54],[186,66],[196,58],[204,50],[214,44]]
    .forEach(([x, y], k) => mk('circle', { cx: x, cy: y, r: 2.8, style: `--k:${k}` }, dots));
  '789÷456×123−0.='.split('').forEach((ch, i) => { // 4-column keypad; "=" is double width
    const eq = ch === '=', x = 22 + (i % 4) * 23, y = 54 + Math.floor(i / 4) * 24, w = eq ? 42 : 19;
    mk('rect', { class: 'key' + (eq ? ' eq' : ''), x, y, width: w, height: 20, rx: 5 }, keys);
    mk('text', { x: x + w / 2, y: y + 13.5, 'text-anchor': 'middle' }, keys).textContent = ch;
  });

  /* 3c. CIRCUIT BACKGROUND: pulses flow along the cables at a constant speed, independent of scrolling.
     FPS caps the redraw rate (lower = lighter on weak devices). SPEED = flow speed in SVG units/second.
     PERIOD must equal the dash pattern total in style.css (22 + 218) so the loop never jumps. */
  const zone = $('.circuit-zone'), FPS = 20, SPEED = 60, PERIOD = 240;
  const flows = $$('.flow path').flatMap((p) => { // add a wider glow twin under each pulse (avoids a costly SVG filter)
    const g = p.cloneNode(); g.classList.add('g'); p.before(g); return [p, g];
  });
  if (!reduced) {
    let live = false, running = false, last = 0;
    const loop = (t) => {
      if (!live) { running = false; return; }
      if (t - last >= 1000 / FPS) { // skip frames above FPS
        last = t;
        const off = (t * SPEED / 1000) % PERIOD;
        flows.forEach((p) => { p.style.strokeDashoffset = (-off * p.dataset.s).toFixed(1); }); // data-s = +1 / -1 (direction only)
      }
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => { // only animate while the zone is on screen
      live = en.isIntersecting;
      if (live && !running) { running = true; requestAnimationFrame(loop); }
    }).observe(zone);
  }

  /* 4. SCROLL REVEALS: fire once at 12% visible */
  const io = new IntersectionObserver((es, o) => es.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('visible'); o.unobserve(en.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => io.observe(el));

  /* 5. SKILL BARS: fill to data-level and count the % up */
  const bio = new IntersectionObserver((es, o) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    const f = en.target, n = $('[data-count]', f.closest('.skill')), to = +f.dataset.level, t0 = performance.now();
    f.style.width = to + '%'; o.unobserve(f);
    const tick = (t) => { const p = Math.min((t - t0) / 1300, 1); n.textContent = Math.round(to * p) + '%'; p < 1 && requestAnimationFrame(tick); };
    reduced ? (n.textContent = to + '%') : requestAnimationFrame(tick);
  }), { threshold: .5 });
  $$('.fill').forEach((f) => bio.observe(f));

  /* 6. ACTIVE NAV LINK */
  const navA = $$('a', links);
  const sio = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting &&
    navA.forEach((a) => a.classList.toggle('active', a.hash === '#' + en.target.id))), { rootMargin: '-45% 0px -50% 0px' });
  navA.forEach((a) => { const t = $(a.hash); t && sio.observe(t); });

  /* 7. MICRO-INTERACTIONS */
  $$('.glass').forEach((el) => el.addEventListener('pointermove', (e) => { // cursor spotlight
    const r = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));
  $$('.btn').forEach((b) => {
    if (!reduced) { // magnetic pull
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', (e.clientX - r.left - r.width / 2) * .18 + 'px'); b.style.setProperty('--ty', (e.clientY - r.top - r.height / 2) * .25 + 'px'); });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    }
    b.addEventListener('click', (e) => { // click ripple
      const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span');
      s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(s); setTimeout(() => s.remove(), 600);
    });
  });
  const toast = $('.toast'); let tt;
  const say = (m) => { toast.textContent = m; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 1800); };
  $$('[data-copy]').forEach((b) => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => {
    const chip = $('.chip', b); b.classList.add('done'); chip.textContent = 'Copied'; say(b.dataset.label + ' copied'); // chip confirms + toast
    setTimeout(() => { b.classList.remove('done'); chip.textContent = 'Copy'; }, 1600);
  }, () => say('Copy failed')));
  const mark = $('.mark'); // logo mark: spin once per click
  $('.logo').addEventListener('click', () => { mark.classList.remove('spin'); void mark.offsetWidth; mark.classList.add('spin'); });

  /* 8. CONTACT FORM: validate on blur/submit, plane animation on success.
     Swap the simulated send for fetch('YOUR_ENDPOINT', {method:'POST', body:new FormData(form)}). */
  const form = $('#form'), status = $('.status', form), send = $('.send', form);
  const rules = {
    name: (v) => v.trim().length >= 2 || 'Enter your name.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Enter a valid email address.',
    message: (v) => v.trim().length >= 10 || 'Write at least 10 characters.'
  };
  const check = (f) => { const r = rules[f.name](f.value); $(`.error[data-for="${f.name}"]`, form).textContent = r === true ? '' : r; f.setAttribute('aria-invalid', r !== true); return r === true; };
  $$('input,textarea', form).forEach((f) => f.addEventListener('blur', () => check(f)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (![...$$('input,textarea', form)].map(check).every(Boolean)) { status.textContent = 'Fix the highlighted fields and try again.'; return; }
    send.classList.add('sent'); status.textContent = 'Message sent. I’ll reply soon.'; form.reset();
    setTimeout(() => send.classList.remove('sent'), 1600);
  });

  /* 9. FOOTER YEAR */
  $('#year').textContent = new Date().getFullYear();
})();
