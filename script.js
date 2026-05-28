document.addEventListener('DOMContentLoaded', () => {
  initScrollingQueue();
  setActiveNav();
  initMobileNav();
  initContactForm();
  initScrollProgress();
  initScrollReveal();
  initCounters();
  initParticles();
  initRipple();
  initHeaderCondense();
  /* ── v3 animations ── */
  initCursorTrail();
  initCardTilt();
  initCardSpotlight();
  initWordReveal();
  initMagneticButtons();
  initParallax();
  initButtonBurst();
  /* ── Products & Contact page enhancements ── */
  initProductImageTilt();
  initFeatListReveal();
  initFormLabelHighlight();
  initMapPulse();
  /* ── Catalogue page ── */
  initCatalogueFilter();
});

function initScrollingQueue() {
  const wrapper = document.querySelector('.queue-wrapper');
  const track   = document.querySelector('.queue-track');
  if (!track || !wrapper) return;

  // Duplicate cards for seamless infinite loop
  track.innerHTML += track.innerHTML;

  let position     = 0;
  let initialized  = false;
  let isHovering   = false;
  let isDragging   = false;
  let dragStartX   = 0;
  let dragStartPos = 0;
  const speed      = 0.8; // px per animation frame

  function halfWidth() {
    return track.scrollWidth / 2;
  }

  function tick() {
    // Initialize to halfWidth on first frame so DOM is fully laid out
    if (!initialized) {
      position    = halfWidth();
      initialized = true;
    }

    if (!isHovering && !isDragging) {
      position -= speed;                          // right-to-left direction
      if (position <= 0) position = halfWidth();  // seamless loop
      track.style.transform = `translateX(-${position}px)`;
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // Pause on hover, resume on leave
  wrapper.addEventListener('mouseenter', () => {
    isHovering = true;
    wrapper.style.cursor = 'grab';
  });

  wrapper.addEventListener('mouseleave', () => {
    isHovering = false;
    isDragging = false;
    wrapper.style.cursor = '';
  });

  // Drag to scroll
  wrapper.addEventListener('mousedown', (e) => {
    isDragging   = true;
    dragStartX   = e.clientX;
    dragStartPos = position;
    wrapper.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const delta = dragStartX - e.clientX;
    let newPos  = dragStartPos + delta;
    const half  = halfWidth();
    // Keep position within the looping range
    if (newPos < 0)     newPos += half;
    if (newPos >= half) newPos -= half;
    position = newPos;
    track.style.transform = `translateX(-${position}px)`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      wrapper.style.cursor = 'grab';
    }
  });

  // Touch support for mobile
  let touchStartX  = 0;
  let touchStartPos = 0;

  wrapper.addEventListener('touchstart', (e) => {
    isDragging    = true;
    isHovering    = true;
    touchStartX   = e.touches[0].clientX;
    touchStartPos = position;
  }, { passive: true });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const delta = touchStartX - e.touches[0].clientX;
    let newPos  = touchStartPos + delta;
    const half  = halfWidth();
    if (newPos < 0)     newPos += half;
    if (newPos >= half) newPos -= half;
    position = newPos;
    track.style.transform = `translateX(-${position}px)`;
  }, { passive: true });

  wrapper.addEventListener('touchend', () => {
    isDragging = false;
    isHovering = false;
  });
}

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === page || (page === '' && link.getAttribute('href') === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.textContent = nav.classList.contains('open') ? '✕' : '☰';
  });

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.textContent = '☰';
    });
  });
}

function initContactForm() {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"]');

  /* ── Clear red border as user types ── */
  form.querySelectorAll('.form-control').forEach(field => {
    field.addEventListener('input', () => field.style.borderColor = '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    /* ── Basic validation ── */
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = 'rgba(239, 83, 80, 0.70)';
        field.style.boxShadow   = '0 0 0 3px rgba(239,83,80,0.12)';
        valid = false;
      }
    });
    if (!valid) {
      form.querySelector('[required]:invalid, [required][style]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* ── Loading state ── */
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML  = 'Sending…';
    submitBtn.disabled   = true;
    submitBtn.style.opacity = '0.75';

    try {
      /* Build form data and set email subject from the dropdown */
      const data  = new FormData(form);
      const topic = data.get('subject') || 'General Enquiry';
      data.set('subject', `Optica Enquiry — ${topic}`);

      const res    = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data
      });
      const result = await res.json();

      if (result.success) {
        /* ── Show success message ── */
        form.style.display = 'none';
        if (success) success.style.display = 'block';
      } else {
        throw new Error(result.message || 'Submission failed');
      }

    } catch (err) {
      /* ── Show error state on button ── */
      submitBtn.innerHTML        = '⚠ Failed — please try again';
      submitBtn.style.background = 'rgba(239, 83, 80, 0.15)';
      submitBtn.style.color      = '#ef5350';
      submitBtn.style.opacity    = '1';

      setTimeout(() => {
        submitBtn.innerHTML        = originalHTML;
        submitBtn.style.background = '';
        submitBtn.style.color      = '';
        submitBtn.disabled         = false;
        submitBtn.style.opacity    = '';
      }, 3500);
    }
  });
}

/* ── Scroll progress bar ───────────────────────────────────────── */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const update = () => {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Scroll-reveal (fade-up on enter viewport) ─────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
}

/* ── Floating green particles in hero ──────────────────────────── */
function initParticles() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  function spawnParticle() {
    const p   = document.createElement('div');
    p.className = 'hero-particle';
    const size = 3 + Math.random() * 5;          // 3–8 px
    const dur  = 5 + Math.random() * 7;           // 5–12 s
    const drift = (Math.random() - 0.5) * 100;   // –50 to +50 px horizontal

    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${dur}s;
      animation-delay: ${Math.random() * 2}s;
      --drift: ${drift}px;
    `;
    hero.appendChild(p);
    setTimeout(() => p.remove(), (dur + 2) * 1000);
  }

  // Initial burst
  for (let i = 0; i < 10; i++) setTimeout(spawnParticle, i * 220);
  // Continuous stream
  setInterval(spawnParticle, 500);
}

/* ── Click ripple on all buttons ───────────────────────────────── */
function initRipple() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const rect  = btn.getBoundingClientRect();
    const size  = Math.max(rect.width, rect.height);
    const r     = document.createElement('span');
    r.className = 'ripple';
    r.style.cssText = `
      width: ${size}px; height: ${size}px;
      left:  ${e.clientX - rect.left - size / 2}px;
      top:   ${e.clientY - rect.top  - size / 2}px;
    `;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });
}

/* ── Header shrinks on scroll — hysteresis prevents jitter ────── */
function initHeaderCondense() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let condensed = false;

  const update = () => {
    const y = window.scrollY;
    // Condense when scrolled DOWN past 90 px …
    if (!condensed && y > 90) {
      condensed = true;
      header.classList.add('condensed');
    // … but only un-condense when scrolled back UP to below 40 px.
    // The 50 px dead-zone stops the toggle loop that causes jitter.
    } else if (condensed && y < 40) {
      condensed = false;
      header.classList.remove('condensed');
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Animated number counter for stat cards ────────────────────── */
function initCounters() {
  const nums = document.querySelectorAll('.stat-number[data-target]');
  if (!nums.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = +el.dataset.target;
      const suffix = el.dataset.suffix || '';
      const dur    = 1500; // ms
      let start    = null;

      const step = (ts) => {
        if (!start) start = ts;
        const prog = Math.min((ts - start) / dur, 1);
        const ease = 1 - Math.pow(1 - prog, 3); // ease-out cubic
        el.textContent = Math.round(ease * target) + suffix;
        if (prog < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  nums.forEach(n => observer.observe(n));
}

/* ════════════════════════════════════════════════════════════════
   ANIMATIONS v3 — 7 new highly visible effects
════════════════════════════════════════════════════════════════ */

/* ── 1. Glowing green cursor trail (canvas-based) ──────────────── */
function initCursorTrail() {
  // Skip on touch-only devices (no cursor)
  if (window.matchMedia('(hover: none)').matches) return;

  const canvas    = document.createElement('canvas');
  canvas.id       = 'cursor-trail-canvas';
  document.body.appendChild(canvas);
  const ctx       = canvas.getContext('2d');
  const particles = [];

  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  document.addEventListener('mousemove', (e) => {
    // Spawn 3 particles per move event
    for (let i = 0; i < 3; i++) {
      particles.push({
        x:     e.clientX + (Math.random() - 0.5) * 10,
        y:     e.clientY + (Math.random() - 0.5) * 10,
        vx:    (Math.random() - 0.5) * 2,
        vy:    (Math.random() - 0.5) * 2 - 0.8,   // slight upward drift
        size:  2.5 + Math.random() * 3.5,
        life:  1.0,
        decay: 0.022 + Math.random() * 0.018,
        hue:   110 + Math.random() * 50            // green spectrum
      });
    }
  });

  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   -= 0.04;        // float upward slightly
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life * 0.75;
      ctx.shadowBlur  = 14;
      ctx.shadowColor = `hsl(${p.hue},80%,55%)`;
      ctx.fillStyle   = `hsl(${p.hue},75%,68%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(loop);
  })();
}

/* ── 2. 3-D perspective tilt on product queue cards ─────────────── */
function initCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.queue-card').forEach(card => {
    let raf;

    card.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r  = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * -10;
        const ry = ((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) *  10;
        card.style.transform  =
          `translateY(-8px) scale(1.04) perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        card.style.transition = 'box-shadow 0.15s, border-color 0.15s';
      });
    });

    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      card.style.transform  = '';
      card.style.transition = 'all 0.55s cubic-bezier(0.34,1.56,0.64,1)';
      setTimeout(() => { card.style.transform = ''; card.style.transition = ''; }, 600);
    });
  });
}

/* ── 3. Mouse-tracked spotlight glow on feature cards ───────────── */
function initCardSpotlight() {
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', ((e.clientX - r.left) / r.width  * 100) + '%');
      card.style.setProperty('--spot-y', ((e.clientY - r.top)  / r.height * 100) + '%');
    });
  });
}

/* ── 4. Word-by-word slide-up on section headings ───────────────── */
function initWordReveal() {
  const sel = '.section-header h2, .about-text h2, .cta-band h2, .contact-info-block h2';

  document.querySelectorAll(sel).forEach(el => {
    // Wrap every word in a two-span structure for the slide-up
    el.innerHTML = el.textContent.trim().split(/\s+/).map(word =>
      `<span class="wr-word"><span class="wr-inner">${word}</span></span>`
    ).join(' ');
  });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.wr-inner').forEach((w, i) => {
        // 200 ms base delay so the block-reveal starts first
        setTimeout(() => w.classList.add('wr-visible'), 200 + i * 80);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll(sel).forEach(el => obs.observe(el));
}

/* ── 5. Magnetic pull — buttons gently attract toward the cursor ─── */
function initMagneticButtons() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width  / 2) * 0.22;
      const y = (e.clientY - r.top  - r.height / 2) * 0.22;
      btn.style.transform = `translate(${x}px, ${y - 2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

/* ── 6. Hero content parallax — text moves slower than scroll ────── */
function initParallax() {
  const hero    = document.querySelector('.hero');
  const content = document.querySelector('.hero-content');
  if (!hero || !content) return;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > hero.offsetHeight) return;           // stop after hero is gone
    content.style.transform = `translateY(${y * 0.28}px)`;
  }, { passive: true });
}

/* ── 7. Green particle burst when any button is clicked ──────────── */
function initButtonBurst() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const COUNT = 14;
    for (let i = 0; i < COUNT; i++) {
      const angle  = (i / COUNT) * Math.PI * 2;
      const dist   = 38 + Math.random() * 34;
      const size   = 4  + Math.random() * 5;
      const hue    = 110 + Math.random() * 45;
      const p      = document.createElement('div');
      p.className  = 'burst-particle';
      p.style.cssText = `
        left:${e.clientX}px; top:${e.clientY}px;
        width:${size}px; height:${size}px;
        background:hsl(${hue},80%,62%);
        box-shadow:0 0 ${size * 2}px hsl(${hue},80%,55%);
        opacity:1;
        transition:transform 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.65s ease;
      `;
      document.body.appendChild(p);

      // Trigger on next frame so transition fires
      requestAnimationFrame(() => {
        p.style.transform = `translate(
          calc(-50% + ${Math.cos(angle) * dist}px),
          calc(-50% + ${Math.sin(angle) * dist}px)
        ) scale(0)`;
        p.style.opacity = '0';
      });

      setTimeout(() => p.remove(), 700);
    }
  });
}

/* ════════════════════════════════════════════════════════════════
   PRODUCTS & CONTACT PAGE — Additional animations
════════════════════════════════════════════════════════════════ */

/* ── Mouse-tracked 3-D tilt on product card images ─────────────── */
function initProductImageTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.prod-img-col.prod-img-real').forEach(col => {
    const img = col.querySelector('.prod-real-img');
    if (!img) return;
    let raf;

    col.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r  = col.getBoundingClientRect();
        const rx = ((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * -7;
        const ry = ((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) *  9;
        img.style.transform  = `scale(1.09) perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
        img.style.filter     = `drop-shadow(0 18px 46px rgba(0,0,0,0.65)) drop-shadow(0 0 24px rgba(76,175,80,0.22))`;
        img.style.transition = 'filter 0.12s';
      });
    });

    col.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      img.style.transition = 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1), filter 0.3s ease';
      img.style.transform  = '';
      img.style.filter     = '';
      setTimeout(() => { img.style.transition = ''; }, 600);
    });
  });
}

/* ── Feature list items cascade in one by one ──────────────────── */
function initFeatListReveal() {
  document.querySelectorAll('.feat-list').forEach(list => {
    // Hide all items initially
    list.querySelectorAll('li').forEach(li => li.classList.add('feat-item-hidden'));

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('li.feat-item-hidden').forEach((li, i) => {
          setTimeout(() => {
            li.classList.remove('feat-item-hidden');
            li.classList.add('feat-item-visible');
          }, i * 70);
        });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    obs.observe(list);
  });
}

/* ── Label turns green & slides when field is focused ──────────── */
function initFormLabelHighlight() {
  document.querySelectorAll('.form-group').forEach(group => {
    const field = group.querySelector('.form-control');
    const label = group.querySelector('label');
    if (!field || !label) return;
    field.addEventListener('focus', () => label.classList.add('label-active'));
    field.addEventListener('blur',  () => label.classList.remove('label-active'));
  });
}

/* ── Catalogue category filter ─────────────────────────────────── */
function initCatalogueFilter() {
  const btns  = document.querySelectorAll('.cat-btn');
  const cards = document.querySelectorAll('.cat-card');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.cat;
      cards.forEach(card => {
        const match = cat === 'all' || card.dataset.category === cat;
        card.classList.toggle('cat-hidden', !match);
      });
    });
  });
}

/* ── Radar ping rings around the map pin ───────────────────────── */
function initMapPulse() {
  const pin = document.querySelector('.map-pin-icon');
  if (!pin) return;

  // Wrap pin in a positioned container
  const wrap = document.createElement('span');
  wrap.className = 'map-pin-wrap';
  pin.parentNode.insertBefore(wrap, pin);
  wrap.appendChild(pin);

  // Add 3 concentric ping rings
  [1, 2, 3].forEach(n => {
    const ring = document.createElement('span');
    ring.className = `map-pin-ring ring-${n}`;
    wrap.appendChild(ring);
  });
}
