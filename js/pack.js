/* Made Very Simple – free personalised colouring pack builder.
   Everything happens in the visitor's browser: no server needed, so it works on GitHub Pages.
   Needs /js/shop.js (BOOKS, cardHTML, wireAddButtons) and jsPDF loaded first. */
(function () {
  const FREE_LIMIT = 3;
  // Same MailerLite form as free.html. To keep pack sign-ups in their own group (and stop the
  // safari-pages email going out to them), make a second embedded form in MailerLite and paste its
  // "action" URL here.
  const FORM_ACTION = 'https://assets.mailerlite.com/jsonp/2734658/forms/202059724226561384/subscribe';
  const SAMPLES_PER_BOOK = 3;
  // Where each page's picture comes from. The website previews (408 x 528 px) print a little soft.
  // For sharper prints, put larger copies in /pack-pages/ named like dinosaurs-1.jpg and use:
  //   const pageSrc = (key, n) => `/pack-pages/${key}-${n}.jpg`;
  const pageSrc = (key, n) => `/books/${key}-sample${n}.jpg`;
  const SITE = 'madeverysimple.co.za';

  const $ = id => document.getElementById(id);
  document.getElementById('y').textContent = new Date().getFullYear();

  const pages = [];
  BOOKS.forEach(b => { for (let n = 1; n <= SAMPLES_PER_BOOK; n++) pages.push({ id: `${b.key}-${n}`, key: b.key, n, book: b }); });
  const pageById = Object.fromEntries(pages.map(p => [p.id, p]));
  let chosen = [];

  /* ---------- storage helpers (never break if storage is blocked) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- image cache ---------- */
  const imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) imgCache[src] = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Could not load ' + src));
      im.src = src;
    });
    return imgCache[src];
  }

  /* ---------- 1. page picker ---------- */
  function renderGroups(filter) {
    const list = BOOKS.filter(b => filter === 'all' || b.line === filter);
    $('groups').innerHTML = list.map(b => `
      <div class="pack-group">
        <h3>${b.title} <a class="see" href="${b.url}">See all 36 →</a></h3>
        <div class="pack-grid">
          ${[1, 2, 3].slice(0, SAMPLES_PER_BOOK).map(n => {
            const id = `${b.key}-${n}`;
            return `<button type="button" class="pick" data-page="${id}" aria-pressed="false">
              <img src="${pageSrc(b.key, n)}" alt="Colouring page ${n} from ${b.title}" width="408" height="528" loading="lazy">
              <span class="tick" aria-hidden="true"></span>
            </button>`;
          }).join('')}
        </div>
      </div>`).join('');
    $('groups').querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => toggle(btn.dataset.page)));
    syncPicks();
  }

  function toggle(id) {
    if (chosen.includes(id)) chosen = chosen.filter(x => x !== id);
    else if (chosen.length >= FREE_LIMIT) { toast(`A free pack has ${FREE_LIMIT} pages. Tap a chosen page to swap it.`); return; }
    else chosen.push(id);
    syncPicks();
    drawCoverSoon();
  }

  function syncPicks() {
    document.querySelectorAll('[data-page]').forEach(btn => {
      const i = chosen.indexOf(btn.dataset.page);
      btn.setAttribute('aria-pressed', i >= 0 ? 'true' : 'false');
      btn.querySelector('.tick').textContent = i >= 0 ? i + 1 : '';
    });
    const left = FREE_LIMIT - chosen.length;
    $('bar-text').textContent = chosen.length === 0 ? `Choose ${FREE_LIMIT} pages`
      : left > 0 ? `${chosen.length} of ${FREE_LIMIT} chosen · ${left} to go` : `${FREE_LIMIT} of ${FREE_LIMIT} chosen 🎉`;
    $('bar-go').hidden = chosen.length === 0;
  }

  document.querySelectorAll('[data-filter]').forEach(chip => chip.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(c => c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
    renderGroups(chip.dataset.filter);
  }));

  function toast(text) {
    const t = $('toast'); t.textContent = text; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3500);
  }

  /* ---------- 2. cover (A4 at 150 dpi, black outlines so it can be coloured too) ---------- */
  const W = 1240, H = 1754;
  const FONT = '"Bricolage Grotesque", "Arial Black", sans-serif';

  function cleanName(s) {
    return (s || '').replace(/[^\p{L}\p{M}' \-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  }
  function titleLines(name) {
    if (!name) return ['My Colouring', 'Pack'];
    const nice = name.charAt(0).toLocaleUpperCase() + name.slice(1);
    return [`${nice}’s`, 'Colouring Pack'];
  }

  function star(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Big outlined "bubble" text that shrinks to fit the width.
  function bubbleText(ctx, text, y, maxSize, maxW) {
    let size = maxSize;
    do { ctx.font = `800 ${size}px ${FONT}`; size -= 4; } while (ctx.measureText(text).width > maxW && size > 40);
    ctx.lineWidth = Math.max(10, size / 9);
    ctx.strokeText(text, W / 2, y); ctx.fillText(text, W / 2, y);
  }

  async function drawCover(canvas, name, ids) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#111'; ctx.fillStyle = '#fff'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // double rounded border
    ctx.lineWidth = 10; roundRect(ctx, 50, 50, W - 100, H - 100, 60); ctx.stroke();
    ctx.lineWidth = 4; roundRect(ctx, 80, 80, W - 160, H - 160, 40); ctx.stroke();

    // little stars to colour
    ctx.lineWidth = 6;
    [[175, 175, 48], [1065, 175, 42], [200, 1420, 44], [1040, 1420, 54], [420, 1440, 24], [820, 1440, 30]]
      .forEach(([x, y, r]) => star(ctx, x, y, r));

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#111'; ctx.font = `600 44px Inter, Arial, sans-serif`;
    ctx.fillText('This colouring pack belongs to', W / 2, 290);

    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111';
    const [l1, l2] = titleLines(name);
    bubbleText(ctx, l1, 500, 210, 960);
    bubbleText(ctx, l2, 680, 150, 960);

    // the chosen pages as little framed previews
    const slots = FREE_LIMIT, tw = 310, th = Math.round(tw * 528 / 408), gap = 45;
    const x0 = (W - (slots * tw + (slots - 1) * gap)) / 2, y0 = 850;
    for (let i = 0; i < slots; i++) {
      const x = x0 + i * (tw + gap);
      ctx.save();
      roundRect(ctx, x, y0, tw, th, 22); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
      const p = pageById[ids[i]];
      if (p) { try { ctx.drawImage(await loadImg(pageSrc(p.key, p.n)), x, y0, tw, th); } catch (e) {} }
      ctx.restore();
      ctx.lineWidth = 6; ctx.strokeStyle = '#111'; roundRect(ctx, x, y0, tw, th, 22); ctx.stroke();
      if (!p) { ctx.fillStyle = '#999'; ctx.font = `800 120px ${FONT}`; ctx.fillText('?', x + tw / 2, y0 + th / 2 + 40); }
    }

    ctx.fillStyle = '#111'; ctx.font = `700 40px ${FONT}`;
    ctx.fillText('made very simple.', W / 2, 1520);
    ctx.font = `500 32px Inter, Arial, sans-serif`;
    ctx.fillText(SITE, W / 2, 1575);
  }

  let pending = false;
  function drawCoverSoon() {
    if (pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; drawCover($('cover'), cleanName($('kid').value), chosen); });
  }
  $('kid').addEventListener('input', drawCoverSoon);

  /* ---------- 3. PDF ---------- */
  async function promoCanvas(books) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FBF7F0'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#1C1B22';
    ctx.font = `800 84px ${FONT}`; ctx.fillText('Want more pictures', W / 2, 230); ctx.fillText('like these?', W / 2, 330);
    ctx.font = `500 40px Inter, Arial, sans-serif`; ctx.fillStyle = '#5E5B66';
    ctx.fillText('Every book has 36 big, bold pictures to print again and again.', W / 2, 420);
    const n = books.length, cw = n === 1 ? 520 : n === 2 ? 440 : 340, ch = Math.round(cw * 776 / 600), gap = 40;
    const x0 = (W - (n * cw + (n - 1) * gap)) / 2, y0 = 520;
    for (let i = 0; i < n; i++) {
      try { ctx.drawImage(await loadImg(`/books/${books[i].key}.jpg`), x0 + i * (cw + gap), y0, cw, ch); } catch (e) {}
    }
    const yb = y0 + ch + 130;
    ctx.fillStyle = '#F2643A'; roundRect(ctx, W / 2 - 430, yb - 80, 860, 130, 65); ctx.fill();
    ctx.fillStyle = '#fff';
    let fs = 54; do { ctx.font = `800 ${fs}px ${FONT}`; fs -= 2; } while (ctx.measureText(`R100 each at ${SITE}`).width > 780 && fs > 24);
    ctx.fillText(`R100 each at ${SITE}`, W / 2, yb + 4 + (54 - fs) / 3);
    ctx.fillStyle = '#5E5B66'; ctx.font = `500 34px Inter, Arial, sans-serif`;
    ctx.fillText('Also in paperback on Amazon.', W / 2, yb + 130);
    return { canvas: c, button: { y: yb - 80, h: 130 } };
  }

  async function buildPdf(name) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    pdf.setProperties({ title: titleLines(name).join(' '), author: 'Made Very Simple', subject: SITE });
    const PW = 210, PH = 297;

    const cover = document.createElement('canvas'); cover.width = W; cover.height = H;
    await drawCover(cover, name, chosen);
    pdf.addImage(cover.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PW, PH);

    for (const id of chosen) {
      const p = pageById[id];
      const im = await loadImg(pageSrc(p.key, p.n));
      const m = 10, maxW = PW - 2 * m, maxH = PH - 2 * m;
      const s = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      pdf.addPage();
      pdf.addImage(im, 'JPEG', (PW - w) / 2, (PH - h) / 2, w, h);
    }

    const books = [...new Set(chosen.map(id => pageById[id].key))].map(k => byKey[k]);
    const promo = await promoCanvas(books);
    pdf.addPage();
    pdf.addImage(promo.canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, PW, PH);
    const k = PH / H; // canvas px -> mm
    pdf.link(PW / 2 - 430 * k, promo.button.y * k, 860 * k, promo.button.h * k, { url: `https://${SITE}/?utm_source=pack-pdf` });

    const fname = `${(name || 'my').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my'}-colouring-pack.pdf`;
    pdf.save(fname);
    return { fname, books };
  }

  /* ---------- form ---------- */
  const SIGNED_UP = 'mvs_pack_signed_up';
  function syncGate() {
    const done = store.get(SIGNED_UP) === '1';
    $('gate').hidden = done; $('welcome-back').hidden = !done;
  }
  syncGate();

  $('pack-form').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('msg'), btn = $('go');
    if (chosen.length < FREE_LIMIT) {
      msg.textContent = `Please choose ${FREE_LIMIT - chosen.length} more page${FREE_LIMIT - chosen.length > 1 ? 's' : ''} first.`;
      $('choose').scrollIntoView({ behavior: 'smooth' }); return;
    }
    const signedUp = store.get(SIGNED_UP) === '1';
    if (!signedUp) {
      const email = $('email');
      if (!email.value || !email.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; email.focus(); return; }
      if (!$('consent').checked) { msg.textContent = 'Please tick the box to get your free pack.'; return; }
    }
    if (!window.jspdf) { msg.textContent = 'The PDF maker didn’t load. Please check your connection and refresh the page.'; return; }

    btn.disabled = true; msg.textContent = 'Making your pack…';
    try {
      if (!signedUp) {
        // MailerLite doesn't let other websites read its reply, so we send and carry on.
        const fd = new FormData();
        fd.append('fields[email]', $('email').value.trim());
        if ($('name').value.trim()) fd.append('fields[name]', $('name').value.trim());
        fd.append('ml-submit', '1'); fd.append('anticsrf', 'true');
        await fetch(FORM_ACTION, { method: 'POST', body: fd, mode: 'no-cors' });
        store.set(SIGNED_UP, '1');
      }
      const { fname, books } = await buildPdf(cleanName($('kid').value));
      msg.textContent = '';
      $('fname').textContent = fname;
      $('upsell').innerHTML = books.map(cardHTML).join('');
      wireAddButtons($('upsell'));
      $('done').hidden = false;
      $('done').scrollIntoView({ behavior: 'smooth' });
      syncGate();
    } catch (err) {
      msg.textContent = 'Something went wrong. Please try again in a moment.';
    }
    btn.disabled = false;
  });

  $('again').addEventListener('click', () => {
    chosen = []; syncPicks(); drawCoverSoon();
    $('done').hidden = true;
    $('choose').scrollIntoView({ behavior: 'smooth' });
  });

  // Hide the floating bar once the name/download step is on screen.
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => en.isIntersecting ? seen.add(en.target.id) : seen.delete(en.target.id));
      $('bar').classList.toggle('away', seen.size > 0);
    }, { rootMargin: '0px 0px -30% 0px' });
    io.observe($('make')); io.observe($('done'));
  }

  renderGroups('all');
  (document.fonts ? document.fonts.load(`800 100px "Bricolage Grotesque"`).catch(() => {}) : Promise.resolve())
    .then(drawCoverSoon);
})();
