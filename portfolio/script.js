/* script.js: vanilla JS. Sections: 1 Nav/progress · 2 Menu · 3 Hero network · 4 Reveals
   5 Skill bars + count-up · 6 Active link · 7 Micro-interactions · 8 Form · 9 Misc */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. NAV STATE + SCROLL PROGRESS */
  const header = $('.site-header'), bar = $('.progress'), hero = $('.hero');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 40);
    hero.style.setProperty('--hs', Math.min(scrollY / (innerHeight * .8), 1).toFixed(3)); // 0 at top -> 1 once the hero is mostly gone
    bar.style.width = (scrollY / (document.documentElement.scrollHeight - innerHeight) * 100) + '%';
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* 2. MOBILE MENU */
  const toggle = $('.nav-toggle'), links = $('.nav-links');
  const setMenu = (o) => { toggle.setAttribute('aria-expanded', o); links.classList.toggle('open', o); };
  toggle.onclick = () => setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  links.onclick = (e) => e.target.closest('a') && setMenu(false);
  addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  /* 3. HERO: headline word split, circuit traces from the lock, pointer tilt, click ping */
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent.appendChild(el); return el; };

  const h1 = $('#hero-title'), title = h1.textContent.trim(); // words rise in one by one (CSS .w); aria-label keeps it readable
  h1.setAttribute('aria-label', title);
  h1.innerHTML = title.split(/\s+/).map((w, n) => `<span class="w" aria-hidden="true" style="--n:${n}">${w}</span>`).join(' ');

  // Traces: start beside the lock, run flat, bend 45 degrees away from centre, run to the edge. COUNT = number of cables, seed = layout.
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const COUNT = 16, tr = $('#traces');
  for (let i = 0; i < COUNT; i++) {
    const side = i % 2 ? 1 : -1, row = i >> 1, y0 = Math.round(170 + row * 25 + rnd() * 8), up = y0 < 260 ? -1 : 1;
    const x0 = 260 + side * 62, x1 = Math.round(x0 + side * (30 + rnd() * 60)), d = Math.round(25 + rnd() * 55), far = side > 0 ? 1200 : -260;
    const dAttr = `M${x0} ${y0}H${x1}l${side * d} ${up * d}H${far}`;
    mk('path', { class: 'wire', d: dAttr, pathLength: 1, style: `--k:${i}` }, tr);
    mk('circle', { class: 'hn', cx: x1, cy: y0, r: 2.5, style: `--k:${i}` }, tr);
    mk('circle', { class: 'hn', cx: x1 + side * d, cy: y0 + up * d, r: 2.5, style: `--k:${i + 3}` }, tr);
    mk('path', { class: 'hp', d: dAttr, 'data-s': i % 3 ? 1 : -1 }, tr); // pulses: mostly outward, some inbound
  }

  if (!reduced && matchMedia('(pointer: fine)').matches) { // pointer tilt + background parallax (mouse only)
    let f = 0, nx = 0, ny = 0;
    const set = () => { hero.style.setProperty('--px', nx.toFixed(3)); hero.style.setProperty('--py', ny.toFixed(3)); f = 0; };
    hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); nx = (e.clientX - r.left) / r.width * 2 - 1; ny = (e.clientY - r.top) / r.height * 2 - 1; f = f || requestAnimationFrame(set); });
    hero.addEventListener('pointerleave', () => { nx = ny = 0; set(); });
  }

  const art = $('.art-tilt'), chipText = $('.chip span'); let ct; // click the lock: ripple + status message
  art.addEventListener('click', (e) => {
    const r = art.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'pr'; s.style.left = e.clientX - r.left + 'px'; s.style.top = e.clientY - r.top + 'px';
    art.appendChild(s); setTimeout(() => s.remove(), 900);
    chipText.textContent = 'Signal received'; clearTimeout(ct); ct = setTimeout(() => { chipText.textContent = 'Open to internships'; }, 1800);
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

  /* 3c. PULSE FLOW (hero + circuit background): evenly spaced pulses move along SVG paths at a constant speed,
     independent of scrolling. FPS caps redraws for weak devices; SPEED = SVG units/second; period = dash pattern total in CSS. */
  const FPS = 20, SPEED = 60;
  const startFlow = (el, selector, period) => {
    if (reduced) return;
    const flows = $$(selector, el).flatMap((p) => { const g = p.cloneNode(); g.classList.add('g'); p.before(g); return [p, g]; }); // glow twin (no SVG filter)
    let live = false, running = false, last = 0;
    const loop = (t) => {
      if (!live) { running = false; return; }
      if (t - last >= 1000 / FPS) {
        last = t; const off = (t * SPEED / 1000) % period;
        flows.forEach((p) => { p.style.strokeDashoffset = (-off * p.dataset.s).toFixed(1); }); // data-s = +1 / -1 (direction only)
      }
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => { live = en.isIntersecting; if (live && !running) { running = true; requestAnimationFrame(loop); } }).observe(el); // only while on screen
  };
  startFlow($('.circuit-zone'), '.flow path', 240);
  startFlow(hero, '.hp', 200);

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
