/* HRMS site interactions — no dependencies, no third-party calls. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M19 12H5M11 6l-6 6 6 6"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>', pause: '<path d="M8 5h3v14H8zM14 5h3v14h-3z" fill="currentColor" stroke="none"/>',
  };
  const ICON = (n) => `<svg class="ic" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n]}</svg>`;

  /* ---------- Analytics: first-party dataLayer only ---------- */
  window.dataLayer = window.dataLayer || [];
  const track = (event, data = {}) => {
    const e = { event, page: location.pathname, ...data };
    window.dataLayer.push(e);
    document.dispatchEvent(new CustomEvent('hrms:track', { detail: e }));
  };
  window.hrmsTrack = track;
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-track]');
    if (t) track(t.dataset.track || 'link_click', { label: t.dataset.label || t.textContent.trim().slice(0, 60) });
  });

  /* ---------- Slot debug mode (?slots=1) ---------- */
  if (/[?&]slots=1/.test(location.search)) {
    document.documentElement.classList.add('show-slots');
    console.table($$('[data-media-slot]').map((f) => ({ id: f.dataset.mediaSlot, need: f.dataset.slotNeed, ratio: f.dataset.slotRatio, res: f.dataset.slotResolution })));
  }

  /* ---------- Header: scroll state, dropdowns, mobile menu ---------- */
  const header = $('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const closeDDs = (except) => $$('.has-dd.is-open').forEach((li) => {
    if (li === except) return;
    li.classList.remove('is-open'); $('.dd-toggle', li).setAttribute('aria-expanded', 'false');
  });
  $$('.dd-toggle').forEach((b) => {
    const li = b.closest('.has-dd');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !li.classList.contains('is-open');
      closeDDs(li); li.classList.toggle('is-open', open); b.setAttribute('aria-expanded', String(open));
    });
    li.addEventListener('keydown', (e) => { if (e.key === 'Escape' && li.classList.contains('is-open')) { closeDDs(); b.focus(); } });
    li.addEventListener('focusout', (e) => { if (!li.contains(e.relatedTarget) && matchMedia('(min-width: 1081px)').matches) closeDDs(); });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.has-dd')) closeDDs(); });

  const menuBtn = $('[data-menu-btn]');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open); if (!open) closeDDs();
    menuBtn.setAttribute('aria-expanded', String(open));
    $('[data-menu-label]', menuBtn).textContent = open ? 'Close menu' : 'Open menu';
  };
  if (menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
    matchMedia('(min-width: 1081px)').addEventListener('change', (m) => m.matches && setMenu(false));
  }

  /* ---------- Reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  } else $$('.reveal').forEach((el) => el.classList.add('in'));

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduced) {
    const co = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      co.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, t0 = performance.now(), d = 1400;
      const step = (t) => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN'); if (p < 1) requestAnimationFrame(step); };
      el.textContent = '0'; requestAnimationFrame(step);
    }), { threshold: .6 });
    counters.forEach((c) => co.observe(c));
  }

  /* ---------- Hero chip parallax (desktop pointer only) ---------- */
  const hv = $('.hero-visual');
  if (hv && !reduced && matchMedia('(hover: hover) and (min-width: 1081px)').matches) {
    const chips = $$('[data-depth]', hv);
    hv.addEventListener('pointermove', (e) => {
      const r = hv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      chips.forEach((c) => { const d = +c.dataset.depth; c.style.transform = `translate(${x * d}px, ${y * d}px)`; });
    });
    hv.addEventListener('pointerleave', () => chips.forEach((c) => { c.style.transform = ''; }));
  }

  /* ---------- Generic segmented control helper ---------- */
  const seg = (btns, attr, fn) => btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
    fn(b.dataset[attr], b);
  }));

  /* ---------- Recognition toggle ---------- */
  const rfig = $('[data-recog-fig]');
  if (rfig) {
    const cap = $('[data-recog-cap]');
    const caps = { apart: 'One question, three places to look. A simple drawing, not measured data.', together: 'One record carries the change, the rule and the approval. A simple drawing, not measured data.' };
    seg($$('[data-recog]'), 'recog', (v) => { rfig.dataset.state = v; cap.textContent = caps[v]; track('recognition_toggle', { label: v }); });
  }

  /* ---------- Trace demo ---------- */
  const trace = $('[data-trace]');
  if (trace) {
    const b = $('[data-trace-btn]', trace), lbl = $('span', b);
    b.addEventListener('click', () => {
      const on = !trace.classList.contains('is-traced');
      trace.classList.toggle('is-traced', on);
      lbl.textContent = on ? 'Reset the trace' : 'Trace this number';
      b.setAttribute('aria-pressed', String(on));
    });
    b.setAttribute('aria-pressed', 'false');
  }

  /* ---------- Journey: sticky frame follows the step in view ---------- */
  $$('[data-journey]').forEach((j) => {
    const steps = $$('[data-step]', j), frames = $$('[data-frame]', j);
    const set = (i) => { steps.forEach((s, k) => s.classList.toggle('is-on', k === i)); frames.forEach((f, k) => f.classList.toggle('is-on', k === i)); };
    set(0);
    if (!('IntersectionObserver' in window)) return;
    const jo = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) set(+e.target.dataset.step); }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => jo.observe(s));
  });

  /* ---------- Tabs (roles) ---------- */
  $$('[data-tabs]').forEach((t) => {
    const tabs = $$('[role="tab"]', t);
    const sel = (tab, focus) => {
      tabs.forEach((x) => { const on = x === tab; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => sel(tab));
      tab.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); sel(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); sel(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); sel(tabs[tabs.length - 1], true); }
      });
    });
  });

  /* ---------- Leave: both sides ---------- */
  const leave = $('[data-leave]');
  if (leave) {
    const st = $('[data-leave-state]', leave), pill = $('.lv-emp .up', leave), stage = $('.leave-stage', leave);
    stage.dataset.sideOn = 'emp';
    const msgs = { emp: 'Showing the employee’s side. Switch to see the manager’s view of the same request.', mgr: 'Showing the manager’s side. Try approving the request.' };
    seg($$('[data-side]', leave), 'side', (v) => { stage.dataset.sideOn = v; if (!leave.classList.contains('approved')) st.textContent = msgs[v]; });
    const ap = $('[data-approve]', leave);
    ap.setAttribute('role', 'button'); ap.tabIndex = 0;
    const approve = () => {
      if (leave.classList.contains('approved')) return;
      leave.classList.add('approved');
      pill.innerHTML = ICON('check') + 'Approved by Rohan';
      ap.textContent = 'Approved';
      st.textContent = 'Approved. The employee’s side now shows the decision, and the change is added to the recorded history.';
      $('[data-side="emp"]', leave).click();
      track('demo_leave_approve');
    };
    ap.addEventListener('click', approve);
    ap.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); approve(); } });
  }

  /* ---------- Payroll run stages ---------- */
  const run = $('[data-run]');
  if (run) {
    const items = $$('[data-stage]', run), st = $('[data-run-state]', run), back = $('[data-run-back]', run), next = $('[data-run-next]', run);
    const names = ['Inputs under review', 'Calculated · changes highlighted', 'Approved by the checker', 'Locked'];
    items[items.length - 1].classList.add('lock');
    let i = 0;
    const draw = () => {
      items.forEach((li, k) => { li.classList.toggle('done', k < i); li.classList.toggle('cur', k === i); });
      st.textContent = `Stage ${i + 1} of ${items.length} · ${names[i]}`;
      back.disabled = i === 0;
      $('span', next).textContent = i === items.length - 1 ? 'Start again' : 'Move to next stage';
    };
    back.addEventListener('click', () => { if (i > 0) { i--; draw(); } });
    next.addEventListener('click', () => { i = i === items.length - 1 ? 0 : i + 1; draw(); });
    draw();
  }

  /* ---------- Letter picker ---------- */
  const letters = $('[data-letters]');
  if (letters) seg($$('[data-letter]', letters), 'letter', (v) => $$('[data-letter-body]', letters).forEach((b) => { b.hidden = b.dataset.letterBody !== v; }));

  /* ---------- Tamper-evident chain demo (SHA-256) ---------- */
  const chain = $('[data-chain]');
  if (chain) {
    const rows = $$('[data-ev]', chain), inputs = rows.map((r) => $('.ce-d', r)), res = $('[data-chain-result]', chain);
    const orig = inputs.map((x) => x.value);
    let stored = [];
    const hasCrypto = !!(window.crypto && crypto.subtle);
    const sha = async (s) => {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
    };
    const compute = async () => { const out = []; let prev = 'genesis'; for (const inp of inputs) { prev = await sha(prev + '|' + inp.value); out.push(prev); } return out; };
    const show = (hs) => rows.forEach((r, k) => { $('[data-hash]', r).textContent = hs[k].slice(0, 10) + '…'; });
    const seal = async () => { if (!hasCrypto) { res.textContent = 'Your browser does not expose the hashing API here, so this demo cannot run. The idea: each event stores a fingerprint of its details plus the previous fingerprint.'; return; } stored = await compute(); show(stored); rows.forEach((r) => r.classList.remove('ok', 'bad')); };
    seal();
    $('[data-chain-verify]', chain).addEventListener('click', async () => {
      if (!hasCrypto) return;
      const now = await compute();
      let bad = -1; let prev = 'genesis';
      for (let k = 0; k < inputs.length; k++) { const h = await sha(prev + '|' + inputs[k].value); if (h !== stored[k]) { bad = k; break; } prev = stored[k]; }
      rows.forEach((r, k) => { r.classList.toggle('bad', bad > -1 && k >= bad); r.classList.toggle('ok', bad === -1 || k < bad); });
      show(now);
      res.className = 'chain-result ' + (bad === -1 ? 'ok' : 'bad');
      res.textContent = bad === -1
        ? 'Check passed: every stored fingerprint matches the details it covers.'
        : `Check failed at event ${bad + 1}: its details no longer match the stored fingerprint, so every later link is flagged too. The edit is detected, not prevented.`;
    });
    $('[data-chain-tamper]', chain).addEventListener('click', () => {
      const x = inputs[2]; x.value = x.value.replace(/\d[\d,]*/, (m) => (parseInt(m.replace(/,/g, ''), 10) + 500).toLocaleString('en-IN')) || x.value + ' (edited)';
      if (x.value === orig[2]) x.value += ' (edited)';
      res.className = 'chain-result'; res.textContent = 'Event 3 was edited without adding a new event. Now run the history check.';
      rows.forEach((r) => r.classList.remove('ok', 'bad'));
    });
    $('[data-chain-reset]', chain).addEventListener('click', () => {
      inputs.forEach((x, k) => { x.value = orig[k]; });
      res.className = 'chain-result'; res.textContent = 'Reset to the original events.'; seal();
    });
    inputs.forEach((x) => x.addEventListener('input', () => rows.forEach((r) => r.classList.remove('ok', 'bad'))));
  }

  /* ---------- Trust status filter & insights filter ---------- */
  const status = $('[data-status]');
  if (status) seg($$('.seg-btn[data-st]', status), 'st', (v) => $$('.status-list li', status).forEach((li) => { li.hidden = v !== 'all' && li.dataset.st !== v; }));
  const filter = $('[data-filter]');
  if (filter) seg($$('[data-cat]', filter), 'cat', (v) => $$('.art-card[data-cat]').forEach((c) => { c.hidden = v !== 'all' && c.dataset.cat !== v; }));

  /* ---------- Evaluation scope ---------- */
  const scope = $('[data-scope]');
  if (scope) {
    const msg = $('[data-scope-msg]', scope);
    const list = () => $$('[data-scope-item]:checked', scope).map((x) => '- ' + x.value).join('\n');
    $('[data-scope-copy]', scope).addEventListener('click', async () => {
      const t = list();
      if (!t) { msg.textContent = 'Select at least one item first.'; return; }
      try { await navigator.clipboard.writeText('My HRMS evaluation scope:\n' + t); msg.textContent = 'Copied. Paste it into your notes or the enquiry form.'; }
      catch { msg.textContent = 'Copying is blocked in this browser. Select the items and use “Use it in an enquiry” instead.'; }
    });
    $('[data-scope-go]', scope).addEventListener('click', () => { try { sessionStorage.setItem('hrms-scope', list()); } catch { /* storage unavailable */ } });
  }

  /* ---------- Enquiry form ---------- */
  const form = $('[data-enquiry]');
  if (form) {
    const explore = $('#explore', form);
    try { const s = sessionStorage.getItem('hrms-scope'); if (s && explore && !explore.value) { explore.value = s.replace(/^- /gm, '').split('\n').join('; '); sessionStorage.removeItem('hrms-scope'); } } catch { /* ignore */ }
    const status = $('[data-form-status]', form), submit = $('[data-submit]', form), label = $('[data-submit-label]', form);
    const setErr = (el, m) => {
      const wrap = el.closest('.field, .field-check'), err = $('#' + el.id + '-err');
      wrap.classList.toggle('has-err', !!m); el.setAttribute('aria-invalid', String(!!m));
      if (err) { err.textContent = m || ''; err.hidden = !m; }
    };
    const check = (el) => {
      let m = '';
      if (el.type === 'checkbox') m = el.required && !el.checked ? 'Please confirm you agree to be contacted about this enquiry.' : '';
      else if (el.required && !el.value.trim()) m = 'Please complete this field.';
      else if (el.type === 'email' && el.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) m = 'Enter a valid email address so we can reply.';
      setErr(el, m); return !m;
    };
    const fields = $$('input, textarea', form);
    fields.forEach((el) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => { if (el.closest('.has-err') || el.value) check(el); }));
    const show = (cls, text) => { status.hidden = false; status.className = 'form-status ' + cls; status.textContent = text; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bad = fields.filter((el) => !check(el));
      if (bad.length) { bad[0].focus(); show('err', `Please fix ${bad.length === 1 ? 'the highlighted field' : `the ${bad.length} highlighted fields`} before sending.`); return; }
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        show('info', 'Nothing was sent. This preview form is not yet connected to an enquiry inbox. Your details stayed in this browser. Please keep a copy of what you wrote and use the form again once it is switched on.');
        track('enquiry_preview_submit'); return;
      }
      submit.disabled = true; label.textContent = 'Sending your enquiry…';
      try {
        const data = Object.fromEntries(new FormData(form)); data.consent = !!$('#consent', form).checked; data.page = location.pathname;
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error(r.status);
        form.reset();
        show('ok', 'Your enquiry has been received. Keep a copy of the information you shared for your records.');
        track('enquiry_submit_success');
      } catch {
        show('err', 'Your enquiry could not be sent. Please try again.');
        track('enquiry_submit_error');
      } finally { submit.disabled = false; label.textContent = 'Send my enquiry'; }
    });
  }

  /* ---------- Modal ---------- */
  const modal = $('[data-modal]');
  const mTitle = $('[data-modal-title]'), mBody = $('[data-modal-body]');
  let lastFocus = null, onClose = null;
  const focusables = () => $$('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])', modal).filter((x) => x.offsetParent !== null);
  const openModal = (title, html, close) => {
    lastFocus = document.activeElement; onClose = close || null;
    mTitle.textContent = title; mBody.innerHTML = html;
    modal.hidden = false; document.body.classList.add('modal-open');
    requestAnimationFrame(() => (focusables()[1] || $('[data-modal-close].icon-btn', modal)).focus());
  };
  const closeModal = () => {
    if (modal.hidden) return;
    if (onClose) onClose();
    modal.hidden = true; mBody.innerHTML = ''; document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  };
  if (modal) {
    $$('[data-modal-close]', modal).forEach((b) => b.addEventListener('click', closeModal));
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Explainer scene player ---------- */
  const K = (n) => `<img class="koala" src="/img/mascot/koala-${n}-520.webp" width="347" height="520" alt="" loading="lazy">`;
  const SCENES = [
    { k: 'The question', h: '“Why has my salary changed?”', p: 'Every payroll team hears it. The answer usually sits in three different places.', a: K('02') },
    { k: 'One record', h: 'Employee details, leave and attendance in one place.', p: 'HRMS keeps the people record and the inputs that feed payroll together.', a: `<div class="p-card"><div class="row"><span>Employee</span><b>Kabir M.</b></div><div class="row"><span>Leave this month</span><b>1 day · approved</b></div><div class="row"><span>Attendance</span><b>1 correction reviewed</b></div></div>` },
    { k: 'Effective-dated rules', h: 'Rules carry the date they apply from.', p: 'A change made in April does not quietly rewrite March. Rule changes pass a maker-checker review.', a: `<div class="p-card"><div class="row"><span>Tax rule</span><b>v1 → v2</b></div><div class="row hl"><span>Applies from</span><b>1 April</b></div><div class="row"><span>Checker</span><b>Approved</b></div></div>` },
    { k: 'Staged payroll', h: 'Inputs, calculated, approved, locked.', p: 'Each run moves through review stages before the result is locked.', a: `<div class="p-card"><div class="row"><span>1 Inputs</span><b>✓</b></div><div class="row"><span>2 Calculated</span><b>✓</b></div><div class="row"><span>3 Approved</span><b>✓</b></div><div class="row hl"><span>4 Locked</span><b>Now</b></div></div>` },
    { k: 'The explanation', h: 'The payslip line points to its reason.', p: 'Which input changed, which adjustment was recorded, which rule version applied.', a: `<div class="p-card"><div class="row"><span>Net pay</span><b class="big">₹48,300</b></div><div class="row hl"><span>Why</span><b>Rule v2 from 1 April · travel adjustment</b></div></div>` },
    { k: 'Recorded history', h: 'Changes are recorded, and tampering can be detected.', p: 'Each event carries a fingerprint linked to the one before. This is tamper-evident, not certified immutable.', a: K('10') },
    { k: 'Your next step', h: 'See it with sample data first.', p: 'HRMS is offered as a sample-data walkthrough. No live payroll, filing or salary transfers are included.', a: K('05') },
  ];
  const DUR = 5200;
  const playerHTML = () => `<div class="player">
    <div class="p-stage" aria-live="polite">${SCENES.map((s, i) => `<div class="p-scene${i ? '' : ' is-on'}" data-scene="${i}" aria-hidden="${!!i}"><div><p class="p-k">${i + 1} / ${SCENES.length} · ${s.k}</p><h3>${s.h}</h3><p>${s.p}</p></div><div class="p-art">${s.a}</div></div>`).join('')}<span class="p-label">Animated explainer · sample data</span></div>
    <div class="p-bar"><button class="p-btn" data-p-toggle aria-label="Pause">${ICON('pause')}</button><div class="p-segs">${SCENES.map((s, i) => `<button class="p-seg" data-p-seg="${i}" aria-label="Go to scene ${i + 1}: ${s.k}"><i></i></button>`).join('')}</div><span class="p-time" data-p-time></span></div>
    <p class="p-note">A short animated explainer built from sample data while the recorded product walkthrough is being prepared. <a href="/contact/">Request a sample-data walkthrough</a> to see the product itself.</p>
  </div>`;
  const startPlayer = () => {
    const scenes = $$('[data-scene]', mBody), segs = $$('[data-p-seg]', mBody), tog = $('[data-p-toggle]', mBody), time = $('[data-p-time]', mBody);
    let i = 0, t0 = performance.now(), elapsed = 0, playing = !reduced, raf = 0;
    const go = (n) => {
      i = n; elapsed = 0; t0 = performance.now();
      scenes.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
      segs.forEach((s, k) => { s.classList.toggle('done', k < i); $('i', s).style.width = k < i ? '100%' : '0'; });
    };
    const setPlay = (p) => {
      playing = p; tog.innerHTML = ICON(p ? 'pause' : 'play'); tog.setAttribute('aria-label', p ? 'Pause' : 'Play');
      t0 = performance.now() - elapsed;
    };
    const fmt = (ms) => { const s = Math.floor(ms / 1000); return `0:${String(s).padStart(2, '0')}`; };
    const tick = (t) => {
      if (playing) elapsed = t - t0;
      const p = Math.min(1, elapsed / DUR);
      $('i', segs[i]).style.width = p * 100 + '%';
      time.textContent = `${fmt(i * DUR + elapsed)} / ${fmt(SCENES.length * DUR)}`;
      if (p >= 1 && playing) { if (i < SCENES.length - 1) go(i + 1); else { setPlay(false); elapsed = DUR; } }
      raf = requestAnimationFrame(tick);
    };
    tog.addEventListener('click', () => { if (!playing && i === SCENES.length - 1 && elapsed >= DUR) go(0); setPlay(!playing); });
    segs.forEach((s, k) => s.addEventListener('click', () => go(k)));
    mBody.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && i < SCENES.length - 1) go(i + 1);
      if (e.key === 'ArrowLeft' && i > 0) go(i - 1);
    });
    setPlay(playing); go(0); raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-explainer]');
    if (!t || !modal) return;
    e.preventDefault();
    let stop = null;
    openModal('How HRMS explains a payroll result · animated explainer', playerHTML(), () => stop && stop());
    stop = startPlayer();
  });

  /* ---------- Brochure lightbox ---------- */
  const titles = $$('[data-brochure] [data-brochure-open]').map((b) => (b.getAttribute('aria-label') || '').replace(/^Open page \d+: /, ''));
  const pages = +(($('[data-brochure]') || {}).dataset || {}).pages || 14;
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-brochure-open]');
    if (!t || !modal) return;
    e.preventDefault();
    let i = +t.dataset.brochureOpen || 0;
    const n = (k) => String(k + 1).padStart(2, '0');
    openModal('HRMS brochure · sample-data preview', `<div class="viewer">
      <div class="viewer-img"><img data-v-img src="/img/brochure/page-${n(i)}-1000.webp" width="1000" height="1415" alt=""></div>
      <div class="viewer-ctl"><button class="btn btn-secondary btn-sm" data-v-prev>${ICON('back')}<span>Previous</span></button><p aria-live="polite" data-v-cap></p><button class="btn btn-secondary btn-sm" data-v-next><span>Next</span>${ICON('arrow')}</button></div>
      <p class="small">Use the arrow keys to turn pages. <a href="/downloads/HRMS-Brochure-Sample-Data-Preview.pdf" download data-track="brochure_download" data-label="viewer">Download the PDF</a>.</p></div>`);
    const img = $('[data-v-img]', mBody), cap = $('[data-v-cap]', mBody);
    const draw = () => {
      img.src = `/img/brochure/page-${n(i)}-1000.webp`;
      img.alt = `Brochure page ${i + 1}${titles[i] ? ': ' + titles[i] : ''}`;
      cap.textContent = `Page ${i + 1} of ${pages}${titles[i] ? ' · ' + titles[i] : ''}`;
      $('[data-v-prev]', mBody).disabled = i === 0; $('[data-v-next]', mBody).disabled = i === pages - 1;
    };
    img.onerror = () => { $('.viewer-img', mBody).textContent = 'The preview could not load. You can still read the product details below.'; };
    $('[data-v-prev]', mBody).addEventListener('click', () => { if (i > 0) { i--; draw(); } });
    $('[data-v-next]', mBody).addEventListener('click', () => { if (i < pages - 1) { i++; draw(); } });
    mBody.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight' && i < pages - 1) { i++; draw(); }
      if (ev.key === 'ArrowLeft' && i > 0) { i--; draw(); }
    });
    draw();
  });

  /* ---------- Article TOC highlight ---------- */
  const toc = $$('.art-toc a');
  if (toc.length && 'IntersectionObserver' in window) {
    const map = new Map(toc.map((a) => [a.getAttribute('href').slice(1), a]));
    const to = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      toc.forEach((a) => a.classList.remove('is-on'));
      const a = map.get(e.target.id); if (a) a.classList.add('is-on');
    }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((a, id) => { const h = document.getElementById(id); if (h) to.observe(h); });
  }

  /* ---------- Media fallback ---------- */
  $$('.slot img, .bs-cover img, .bro-grid img').forEach((img) => img.addEventListener('error', () => {
    const f = img.closest('.slot-frame') || img.parentElement;
    if (f && !f.querySelector('.media-fallback')) f.insertAdjacentHTML('beforeend', '<p class="media-fallback small">The preview could not load. You can still read the product details below.</p>');
    img.style.visibility = 'hidden';
  }));

  /* ---------- Mobile sticky CTA ---------- */
  const mcta = $('[data-mobile-cta]');
  if (mcta) {
    const hideNear = $$('.site-footer, .enquiry, .cta-band, .hero .actions, .page-hero .actions');
    const visible = new Set();
    const upd = () => mcta.classList.toggle('is-on', scrollY > 480 && visible.size === 0 && !document.body.classList.contains('menu-open'));
    if ('IntersectionObserver' in window) {
      const mo = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))); upd(); });
      hideNear.forEach((el) => mo.observe(el));
    }
    addEventListener('scroll', upd, { passive: true });
    if (location.pathname === '/contact/') mcta.remove();
  }
})();
