(() => {
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* navigace */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  const toggle = document.getElementById('toggle');
  const menu = document.getElementById('menu');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* odhalování */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal, .reveal-group').forEach(el => io.observe(el));

  /* pohlednice: tažení myší + průběh */
  const cards = document.querySelector('.cards');
  const bar = document.querySelector('.cards-hint b');
  if (cards) {
    const prog = () => {
      const max = cards.scrollWidth - cards.clientWidth;
      bar.style.setProperty('--sp', max > 0 ? Math.max(0.08, cards.scrollLeft / max) : 1);
    };
    cards.addEventListener('scroll', prog, { passive: true });
    prog();
    if (hover) {
      let down = false, moved = false, x0 = 0, s0 = 0;
      cards.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = cards.scrollLeft; });
      addEventListener('pointermove', e => {
        if (!down) return;
        const dx = e.clientX - x0;
        if (Math.abs(dx) > 4) { moved = true; cards.classList.add('dragging'); }
        cards.scrollLeft = s0 - dx;
      });
      addEventListener('pointerup', () => { down = false; cards.classList.remove('dragging'); });
      cards.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
    }
  }

  /* mapa: trasa se kreslí podle aktivního dne */
  const svg = document.querySelector('.map-svg');
  const route = document.getElementById('route');
  const days = [...document.querySelectorAll('.day')];
  if (svg && route) {
    const stops = [...svg.querySelectorAll('.stop')];
    const L = route.getTotalLength();
    // délka trasy k jednotlivým zastávkám (hledání nejbližšího bodu na křivce)
    // délka trasy k jednotlivým zastávkám (nejbližší bod na křivce, hledá se dál od předchozí zastávky — trasa končí tam, kde začala)
    let from = 0;
    const stopLen = stops.map(g => {
      const c = g.querySelector('.stop-halo');
      const sx = +c.getAttribute('cx'), sy = +c.getAttribute('cy');
      let best = from, bestD = Infinity;
      for (let l = from; l <= L; l += 2) {
        const p = route.getPointAtLength(l);
        const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
        if (d < bestD) { bestD = d; best = l; }
      }
      from = best + 20;
      return best / L * 1000;
    });
    // 'mal' = Maledivy (před příletem do Colomba), čísla = zastávky na Srí Lance
    const setStep = key => {
      const idx = key === 'mal' ? -1 : +key;
      svg.style.setProperty('--route-off', idx < 0 ? 1000 : (1000 - stopLen[idx]).toFixed(1));
      svg.style.setProperty('--flight-off', idx < 0 ? 100 : 0);
      svg.classList.toggle('fly', idx < 0);
      stops.forEach((s, i) => { s.classList.toggle('on', i <= idx); s.classList.toggle('cur', i === idx); });
      days.forEach(d => d.classList.toggle('on', (d.dataset.stop === 'mal' ? -1 : +d.dataset.stop) <= idx));
    };
    const dayIO = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) setStep(e.target.dataset.stop);
    }), { rootMargin: '-45% 0px -45% 0px' });
    days.forEach(d => dayIO.observe(d));
    // mobil: mapa je nahoře přilepená, aktivní den je níž
    if (matchMedia('(max-width: 900px)').matches) {
      dayIO.disconnect();
      const mIO = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) setStep(e.target.dataset.stop);
      }), { rootMargin: '-62% 0px -30% 0px' });
      days.forEach(d => mIO.observe(d));
    }
  }

  /* formulář bez backendu → předvyplněný e-mail */
  const form = document.getElementById('form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    let ok = true;
    ['jmeno', 'email'].forEach(n => {
      const bad = !String(f.get(n) || '').trim();
      form.querySelector(`[name="${n}"]`).closest('.f').classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    const note = document.getElementById('form-note');
    if (!ok) { note.textContent = 'Vyplňte prosím jméno a e-mail.'; note.classList.remove('ok'); return; }
    const dest = f.getAll('dest').join(' + ') || 'zatím nevím';
    const body = [
      'Dobrý den, Petro,', '',
      `zajímá mě: ${dest} — ${f.get('typ')}.`,
      f.get('kdy') ? `Termín: ${f.get('kdy')}` : '',
      f.get('osoby') ? `Počet osob: ${f.get('osoby')}` : '',
      '', String(f.get('zprava') || '').trim(), '',
      `${f.get('jmeno')}`, `${f.get('email')}`
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    location.href = `mailto:petra.pilarova@icloud.com?subject=${encodeURIComponent('Poptávka cesty — ' + dest)}&body=${encodeURIComponent(body)}`;
    note.textContent = 'Otevřeli jsme vám e-mail s předvyplněnou zprávou — stačí ho odeslat.';
    note.classList.add('ok');
  });
})();
