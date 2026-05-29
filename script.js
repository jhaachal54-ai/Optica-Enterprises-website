document.addEventListener('DOMContentLoaded', () => {
  initScrollingQueue();
  setActiveNav();
  initMobileNav();
  initContactForm();
  initScrollProgress();
  /* ── Animation classes must be applied BEFORE initScrollReveal ── */
  initColumnSlider();
  initLayerTransform();
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
  /* ── Global UI ── */
  initSplashScreen();
  initWhatsAppFloat();
  initBackToTop();
  initCookieBanner();
  initSearchBar();
  /* ── Products page ── */
  initProductFilter();
  initProductCompare();
  /* ── About / FAQ / Service pages ── */
  initFaqAccordion();
  /* ── Animation suite ── */
  initLightReveal();
  /* ── Animation suite v2 ── */
  initPageTransitions();
  initSectionHeaderStagger();
  initHeroCollage3D();
  initStatCardTilt();
  /* ── New pages ── */
  initReagentAccordion();
  initBlogFilter();
  initCompare();
  initServiceRequest();
  /* ── Nav dropdown ── */
  initNavDropdown();
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
/* Also observes Columns Slider + Layer Transform classes          */
function initScrollReveal() {
  const els = document.querySelectorAll(
    '.reveal, .col-from-left, .col-from-right, .col-from-bottom, .layer-enter'
  );
  if (!els.length) return;

  // Hysteresis: show when ≥12 % in view, hide only when <2 % in view.
  // The dead-zone between 2 % and 12 % prevents rapid add/remove jitter
  // at scroll boundaries (e.g. tall brand cards where only the button shows).
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.12) {
        entry.target.classList.add('visible');
      } else if (entry.intersectionRatio < 0.02) {
        entry.target.classList.remove('visible');
      }
      // 0.02–0.12 zone → do nothing, preserving current state
    });
  }, { threshold: [0, 0.02, 0.12, 1] });

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

/* ══════════════════════════════════════════════════════════════
   PRODUCT DATA — used by Search & Compare
══════════════════════════════════════════════════════════════ */
const PRODUCT_DATA = [
  { id: 'exias-e1',     name: 'EXIAS E1 Electrolyte Analyzer',                      category: 'Electrolyte',    keywords: 'ISE sodium potassium chloride pH Hct electrolyte' },
  { id: 'getein-1100',  name: 'Getein 1100 Immunofluorescence Analyzer',             category: 'Immunoassay',    keywords: 'cardiac thyroid fertility tumor bone fluorescence' },
  { id: 'mispa-clog',   name: 'Mispa CLOG Smart Hemostasis Analyzer',                category: 'Coagulation',    keywords: 'PT APTT TT fibrinogen coagulation hemostasis clot' },
  { id: 'mispa-cxl',    name: 'Mispa CXL Pro Plus Clinical Chemistry Analyzer',      category: 'Chemistry',      keywords: 'biochemistry liver kidney lipid random access 240' },
  { id: 'mispa-count-x',name: 'Mispa Count X Auto Hematology Analyzer',             category: 'Hematology',     keywords: 'CBC 21 parameters WBC differential blood count 60' },
  { id: 'mispa-fab120', name: 'Mispa FAB 120 Clinical Chemistry Analyzer',           category: 'Chemistry',      keywords: 'chemistry 120 tests ISE electrolyte biochemistry' },
  { id: 'mispa-hx50',   name: 'Mispa HX50 Automatic 5-Part Hematology Analyzer',    category: 'Hematology',     keywords: '5-part differential laser fluorescence reticulocyte' },
  { id: 'mispa-maestro',name: 'Mispa Maestro Automated HbA1c Analyzer',             category: 'HbA1c',          keywords: 'HbA1c glycohemoglobin diabetes HPLC 72 seconds' },
  { id: 'mispa-plus',   name: 'Mispa Plus Semi-Automated Biochemistry Analyzer',     category: 'Chemistry',      keywords: 'semi-automated biochemistry penta lens photometry' },
  { id: 'mispa-revo',   name: 'Mispa REVO Dry Immunoassay Analyzer',                category: 'Immunoassay',    keywords: 'TRFIA fluorescence cartridge thyroid cardiac' },
  { id: 'mispa-viva',   name: 'Mispa VIVA Semi-Automated Chemistry Analyzer',       category: 'Chemistry',      keywords: 'semi-auto chemistry ERA flow cell pH urine CSF' },
  { id: 'mispa-i3',     name: 'Mispa i3 Specific Protein Analyzer',                 category: 'Specific Protein',keywords: 'CRP ASO RF IgA IgG IgM nephelometry turbidimetry' },
  { id: 'mispa-nano',   name: 'Mispa nano Plus Fully Automatic Chemistry Analyzer',  category: 'Chemistry',      keywords: 'fully automatic 360 tests refrigeration compact' },
  { id: 'opti-cca',     name: 'OPTI CCA TS 2 Critical Care Analyzer',               category: 'Critical Care',  keywords: 'blood gas pH pCO2 pO2 electrolytes bedside ICU' },
  { id: 'wondfo-ocg',   name: 'Wondfo Optical Coagulation Analyzer OCG-102',        category: 'Coagulation',    keywords: 'coagulation PT APTT fibrinogen ACT portable' },
];

/* ══════════════════════════════════════════════════════════════
   LOADING SPLASH SCREEN
══════════════════════════════════════════════════════════════ */
function initSplashScreen() {
  // Show only once per browser session (not on every page change)
  if (sessionStorage.getItem('splashShown')) return;
  sessionStorage.setItem('splashShown', '1');

  const splash = document.createElement('div');
  splash.id = 'splash-screen';
  splash.innerHTML = `
    <img src="Optica%20Enterprises%20Logo.png?v=2" alt="Optica Enterprises" />
    <div class="splash-spinner"></div>
  `;
  document.body.prepend(splash);

  const exit = () => {
    splash.classList.add('splash-out');
    setTimeout(() => splash.remove(), 650);
  };

  // Show for at least 1.3s, or until all resources load — whichever is later
  const minWait = new Promise(r => setTimeout(r, 1300));
  const loaded  = new Promise(r => {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', r, { once: true });
  });
  Promise.all([minWait, loaded]).then(exit);
}

/* ══════════════════════════════════════════════════════════════
   WHATSAPP FLOATING BUTTON
══════════════════════════════════════════════════════════════ */
function initWhatsAppFloat() {
  const wa = document.createElement('a');
  wa.className = 'wa-float';
  wa.href = 'https://wa.me/917678273175';
  wa.target = '_blank';
  wa.rel = 'noopener noreferrer';
  wa.setAttribute('aria-label', 'Chat with us on WhatsApp');
  wa.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
               -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475
               -.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
               .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207
               -.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
               -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2
               5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085
               1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.564 4.14 1.544 5.875L.057 23.57a.75.75
               0 00.918.93l5.941-1.524A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0
               22a9.95 9.95 0 01-5.093-1.396l-.364-.217-3.527.905.94-3.42-.237-.375A9.953 9.953 0
               012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
    <span class="wa-tooltip">Chat on WhatsApp</span>
  `;
  document.body.appendChild(wa);
}

/* ══════════════════════════════════════════════════════════════
   BACK-TO-TOP BUTTON
══════════════════════════════════════════════════════════════ */
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.textContent = '↑';
  document.body.appendChild(btn);

  window.addEventListener('scroll', () => {
    btn.classList.toggle('btt-visible', window.scrollY > 320);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ══════════════════════════════════════════════════════════════
   COOKIE / PRIVACY BANNER
══════════════════════════════════════════════════════════════ */
function initCookieBanner() {
  if (localStorage.getItem('cookieChoice')) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.id = 'cookieBanner';
  banner.innerHTML = `
    <p class="cookie-text">
      We use cookies to improve your browsing experience and analyse site traffic.
      By clicking <strong>Accept</strong> you consent to our use of cookies.
      <a href="contact.html">Privacy Policy</a>
    </p>
    <div class="cookie-btns">
      <button class="btn btn-primary" id="cookieAccept" style="padding:9px 22px;font-size:0.84rem;">Accept</button>
      <button class="btn btn-ghost"   id="cookieDecline" style="padding:9px 18px;font-size:0.84rem;">Decline</button>
    </div>
  `;
  document.body.appendChild(banner);

  // Small delay so slide-up animation is visible
  setTimeout(() => banner.classList.add('cookie-visible'), 600);

  const dismiss = choice => {
    localStorage.setItem('cookieChoice', choice);
    banner.classList.remove('cookie-visible');
    setTimeout(() => banner.remove(), 500);
  };

  document.getElementById('cookieAccept') .addEventListener('click', () => dismiss('accepted'));
  document.getElementById('cookieDecline').addEventListener('click', () => dismiss('declined'));
}

/* ══════════════════════════════════════════════════════════════
   SEARCH OVERLAY
══════════════════════════════════════════════════════════════ */
function initSearchBar() {
  const navToggle = document.getElementById('navToggle');
  if (!navToggle) return;

  // Inject search icon into header
  const toggle = document.createElement('button');
  toggle.className = 'search-toggle';
  toggle.setAttribute('aria-label', 'Search products');
  toggle.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  navToggle.parentNode.insertBefore(toggle, navToggle);

  // Inject search overlay into body
  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.id = 'searchOverlay';
  overlay.innerHTML = `
    <div class="search-input-wrap">
      <input type="search" class="search-input" id="searchInput" placeholder="Search products, categories…" autocomplete="off" spellcheck="false" />
      <button class="search-close-btn" id="searchClose" aria-label="Close search">✕</button>
    </div>
    <div class="search-results" id="searchResults">
      <p class="search-hint">Type to search across all 15 products</p>
    </div>
  `;
  document.body.appendChild(overlay);

  // Open / close
  const open  = () => { overlay.classList.add('search-open'); document.getElementById('searchInput').focus(); };
  const close = () => { overlay.classList.remove('search-open'); document.getElementById('searchInput').value = ''; document.getElementById('searchResults').innerHTML = '<p class="search-hint">Type to search across all 15 products</p>'; };

  toggle.addEventListener('click', open);
  document.getElementById('searchClose').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Search logic
  document.getElementById('searchInput').addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    const results = document.getElementById('searchResults');
    if (!q) {
      results.innerHTML = '<p class="search-hint">Type to search across all 15 products</p>';
      return;
    }
    const matches = PRODUCT_DATA.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.keywords.toLowerCase().includes(q)
    );
    if (!matches.length) {
      results.innerHTML = `<p class="search-empty">No results for "<strong>${q}</strong>"</p>`;
      return;
    }
    results.innerHTML = matches.map(p => `
      <a href="products.html#${p.id}" class="search-result-item" onclick="document.getElementById('searchOverlay').classList.remove('search-open')">
        <span class="search-result-badge">${p.category}</span>
        <span class="search-result-name">${p.name}</span>
      </a>
    `).join('');
  });
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT CATEGORY FILTER  (products.html)
══════════════════════════════════════════════════════════════ */
function initProductFilter() {
  const btns  = document.querySelectorAll('[data-prod-cat]');
  const cards = document.querySelectorAll('.product-card[data-category]');
  if (!btns.length || !cards.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.prodCat;
      cards.forEach(card => {
        const match = cat === 'all' || card.dataset.category === cat;
        card.classList.toggle('prod-hidden', !match);
      });
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   PRODUCT COMPARISON TOOL  (products.html)
══════════════════════════════════════════════════════════════ */
function initProductCompare() {
  const prodList = document.querySelector('.products-list');
  if (!prodList) return;

  const MAX = 3;
  let selected = []; // [{id, name, badge, features}]

  // ── Inject Compare bar ──
  const bar = document.createElement('div');
  bar.className = 'compare-bar';
  bar.id = 'cmpBar';
  bar.innerHTML = `
    <span class="cmp-bar-label">Comparing:</span>
    <div class="compare-chips" id="cmpChips"></div>
    <button class="btn btn-primary" id="cmpNowBtn" style="padding:9px 24px;font-size:0.84rem;flex-shrink:0;">Compare Now</button>
    <button class="cmp-clear-btn" id="cmpClearBtn">Clear All</button>
  `;
  document.body.appendChild(bar);

  // ── Inject Compare modal ──
  const modal = document.createElement('div');
  modal.className = 'cmp-modal-overlay';
  modal.id = 'cmpModal';
  modal.innerHTML = `
    <div class="cmp-modal">
      <div class="cmp-modal-head">
        <span class="cmp-modal-title">Product Comparison</span>
        <button class="cmp-modal-close" id="cmpModalClose" aria-label="Close">✕</button>
      </div>
      <div class="cmp-grid-wrap">
        <div class="cmp-table" id="cmpTable"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // ── Inject Compare buttons on each product card ──
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.position = 'relative';
    const id       = card.id;
    const name     = card.querySelector('h2')?.textContent?.trim() || 'Product';
    const badge    = card.querySelector('.prod-badge')?.textContent?.trim() || '';
    const features = [...card.querySelectorAll('.feat-list li')].map(li => li.textContent.trim());

    const btn = document.createElement('button');
    btn.className = 'compare-btn';
    btn.dataset.cmpId = id;
    btn.innerHTML = `<span class="cmp-icon">⊕</span> Compare`;
    card.appendChild(btn);

    btn.addEventListener('click', () => {
      const idx = selected.findIndex(p => p.id === id);
      if (idx > -1) {
        selected.splice(idx, 1);
        btn.classList.remove('cmp-selected');
        btn.innerHTML = `<span class="cmp-icon">⊕</span> Compare`;
      } else {
        if (selected.length >= MAX) {
          btn.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(-4px)'},{transform:'translateX(0)'}], {duration:300});
          return;
        }
        selected.push({ id, name, badge, features });
        btn.classList.add('cmp-selected');
        btn.innerHTML = `<span class="cmp-icon">✓</span> Added`;
      }
      refreshBar();
    });
  });

  // ── Refresh bar ──
  function refreshBar() {
    const chips = document.getElementById('cmpChips');
    chips.innerHTML = selected.map(p => `
      <span class="compare-chip" data-cmp-chip="${p.id}">
        <span>${p.name.length > 28 ? p.name.slice(0,28)+'…' : p.name}</span>
        <button class="cmp-chip-remove" onclick="window._cmpRemove('${p.id}')" aria-label="Remove">×</button>
      </span>
    `).join('');
    document.getElementById('cmpBar').classList.toggle('cmp-bar-visible', selected.length > 0);
  }

  // Global helper for inline onclick in chips
  window._cmpRemove = id => {
    selected = selected.filter(p => p.id !== id);
    document.querySelectorAll('.compare-btn').forEach(btn => {
      if (btn.dataset.cmpId === id) {
        btn.classList.remove('cmp-selected');
        btn.innerHTML = `<span class="cmp-icon">⊕</span> Compare`;
      }
    });
    refreshBar();
  };

  document.getElementById('cmpClearBtn').addEventListener('click', () => {
    selected = [];
    document.querySelectorAll('.compare-btn').forEach(btn => {
      btn.classList.remove('cmp-selected');
      btn.innerHTML = `<span class="cmp-icon">⊕</span> Compare`;
    });
    refreshBar();
  });

  // ── Open modal ──
  document.getElementById('cmpNowBtn').addEventListener('click', () => {
    if (selected.length < 2) return;
    const cols  = selected.length;
    const colCSS = `grid-template-columns: 130px repeat(${cols}, 1fr)`;
    const table = document.getElementById('cmpTable');

    const row = (label, cells) => `
      <div class="cmp-row" style="${colCSS}">
        <div class="cmp-cell cmp-label">${label}</div>
        ${cells.map(c => `<div class="cmp-cell">${c}</div>`).join('')}
      </div>`;

    table.innerHTML =
      row('Product',      selected.map(p => `<strong style="font-size:0.92rem;font-weight:800;color:var(--text-dark);line-height:1.45;word-break:break-word;display:block;">${p.name}</strong>`)) +
      row('Category',     selected.map(p => `<span class="cmp-badge">${p.badge}</span>`)) +
      row('Key Features', selected.map(p => `<ul>${p.features.map(f=>`<li>${f}</li>`).join('')}</ul>`));

    document.getElementById('cmpModal').classList.add('cmp-modal-open');
  });

  const closeModal = () => document.getElementById('cmpModal').classList.remove('cmp-modal-open');
  document.getElementById('cmpModalClose').addEventListener('click', closeModal);
  document.getElementById('cmpModal').addEventListener('click', e => { if (e.target.id === 'cmpModal') closeModal(); });
}

/* ══════════════════════════════════════════════════════════════
   FAQ ACCORDION  (faq.html)
══════════════════════════════════════════════════════════════ */
function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn  = item.querySelector('.faq-q');
    const body = item.querySelector('.faq-body');
    if (!btn || !body) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('faq-open');
      // Close all
      document.querySelectorAll('.faq-item.faq-open').forEach(el => el.classList.remove('faq-open'));
      if (!isOpen) item.classList.add('faq-open');
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

/* ══════════════════════════════════════════════════════════════
   ANIMATION SUITE
══════════════════════════════════════════════════════════════ */

/* ── 1. Columns Slider — tags feature/service cards with
         col-from-left / col-from-bottom / col-from-right
         Must run BEFORE initScrollReveal() so the observer picks
         up the new classes.                                      */
function initColumnSlider() {
  const dirs   = ['col-from-left', 'col-from-bottom', 'col-from-right'];
  const delays = ['', 'col-delay-1', 'col-delay-2'];

  function applySlider(cards) {
    if (!cards.length) return;
    cards.forEach((card, i) => {
      const idx = i % 3;
      // Remove existing reveal classes to prevent animation conflict
      card.classList.remove('reveal', 'reveal-delay-1', 'reveal-delay-2', 'reveal-delay-3');
      card.classList.add(dirs[idx]);
      if (delays[idx]) card.classList.add(delays[idx]);
    });
  }

  // Home page "Why Choose Us" feature cards
  // (only on home page — detected by the presence of .hero section)
  if (document.querySelector('.hero')) {
    applySlider(document.querySelectorAll('.features-grid .feature-card'));
  }

  // Service page service cards
  applySlider(document.querySelectorAll('.service-grid .service-card'));

  // About Us page core-values cards
  applySlider(document.querySelectorAll('.values-grid .value-card'));
}

/* ── 2. Layer Transformation — replaces .reveal on timeline items
         and enhances the existing product-card slide-in keyframes
         (keyframes are redefined in CSS at the end of styles.css) */
function initLayerTransform() {
  // About page timeline — swap .reveal for .layer-enter
  document.querySelectorAll('.tl-item').forEach(el => {
    el.classList.remove('reveal');
    el.classList.add('layer-enter');
  });
  // Product cards keep their existing .reveal + slide-in keyframe;
  // the CSS redefines those keyframes to include scale(0.93) — no JS needed.
}

/* ── 3. Hover Light Reveal — tracks the cursor over catalogue cards
         and brand cards, updating CSS custom properties used by a
         radial-gradient hover background defined in styles.css.   */
function initLightReveal() {
  // Skip on touch-only devices
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.cat-card, .brand-card').forEach(card => {
    let raf;
    card.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--lr-x', ((e.clientX - r.left) / r.width  * 100) + '%');
        card.style.setProperty('--lr-y', ((e.clientY - r.top)  / r.height * 100) + '%');
      });
    });
    card.addEventListener('mouseleave', () => {
      // Reset to centre so the gradient starts centred on next hover
      card.style.setProperty('--lr-x', '50%');
      card.style.setProperty('--lr-y', '50%');
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   NEW PAGES — JS
   ═══════════════════════════════════════════════════════════════ */

/* ── Reagent accordion + category filter ─────────────────────── */
function initReagentAccordion() {
  // Accordion
  document.querySelectorAll('.rgt-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.rgt-card');
      const body = card.querySelector('.rgt-body');
      const isOpen = card.classList.contains('rgt-open');

      // Close all
      document.querySelectorAll('.rgt-card.rgt-open').forEach(c => {
        c.classList.remove('rgt-open');
        c.querySelector('.rgt-body').style.maxHeight = null;
      });

      // Toggle clicked
      if (!isOpen) {
        card.classList.add('rgt-open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  // Category filter
  const filterBtns = document.querySelectorAll('#rgtFilter .cat-btn');
  const cards = document.querySelectorAll('.rgt-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.rgt;

      // Close all open accordions first
      document.querySelectorAll('.rgt-card.rgt-open').forEach(c => {
        c.classList.remove('rgt-open');
        c.querySelector('.rgt-body').style.maxHeight = null;
      });

      cards.forEach(card => {
        const match = cat === 'all' || card.dataset.rgtCat === cat;
        card.style.display = match ? '' : 'none';
      });
    });
  });
}

/* ── Blog category filter ─────────────────────────────────────── */
function initBlogFilter() {
  const btns  = document.querySelectorAll('#blogFilter .cat-btn');
  const posts = document.querySelectorAll('.blog-card');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.blog;
      posts.forEach(post => {
        const match = cat === 'all' || post.dataset.blogCat === cat;
        post.style.display = match ? '' : 'none';
      });
    });
  });
}

/* ── Instrument Comparison Tool ───────────────────────────────── */
function initCompare() {
  const selects = [
    document.getElementById('cmp1'),
    document.getElementById('cmp2'),
    document.getElementById('cmp3'),
  ];
  const btn     = document.getElementById('cmpBtn');
  const clearBtn= document.getElementById('cmpClear');
  const result  = document.getElementById('compareResult');
  if (!btn || !result) return;

  const PRODUCTS = {
    'mispa-count-x': {
      name: 'Mispa Count X', brand: 'Agappe Diagnostics', category: 'Hematology',
      technology: '3-Part WBC Differential — impedance + photometry',
      parameters: '21 CBC parameters + 3 histograms + NLR/PLR',
      throughput: '60 samples / hr',
      sampleTypes: 'Whole blood (EDTA)',
      sampleVolume: '9 µL',
      resultTime: '~60 seconds',
      display: '10.4" TFT touchscreen',
      connectivity: 'Bidirectional LIS',
      highlight: 'Auto-cleaning; 3-level QC; compact design'
    },
    'mispa-hx50': {
      name: 'Mispa HX50', brand: 'Agappe Diagnostics', category: 'Hematology',
      technology: '5-Part WBC diff — Nucleic Acid Fluorescence + Tri-angle Laser Scattering',
      parameters: '5-part diff CBC + Reticulocyte analysis',
      throughput: '50 samples / hr',
      sampleTypes: 'Whole blood (EDTA)',
      sampleVolume: 'Small volume',
      resultTime: '~72 seconds',
      display: 'TFT colour touchscreen',
      connectivity: 'LIS connectivity',
      highlight: 'Independent basophil channel; comprehensive flagging; reticulocyte'
    },
    'mispa-viva': {
      name: 'Mispa VIVA', brand: 'Agappe Diagnostics', category: 'Clinical Chemistry',
      technology: 'Semi-automated photometry; ERA Flow Cell; EMF pH measurement',
      parameters: 'Full biochemistry (open system) — liver, kidney, lipid, cardiac, diabetes',
      throughput: 'Semi-automated (manual loading)',
      sampleTypes: 'Serum, plasma, urine, CSF',
      sampleVolume: '30 µL (ERA flow cell)',
      resultTime: 'Per test',
      display: 'Built-in display + thermal printer',
      connectivity: 'RS-232 &amp; USB',
      highlight: 'ERA Flow Cell; 6 filter wavelengths; 3 measurement modes; cost-effective'
    },
    'mispa-plus': {
      name: 'Mispa Plus', brand: 'Agappe Diagnostics', category: 'Clinical Chemistry',
      technology: 'Semi-automated; Penta Lens Photometry System',
      parameters: '300 programmable channels — open system',
      throughput: 'Semi-automated (manual loading)',
      sampleTypes: 'Serum, plasma, urine',
      sampleVolume: 'Standard cuvette',
      resultTime: 'Per test',
      display: '7" capacitive touchscreen + thermal printer',
      connectivity: 'Built-in printer; RS-232',
      highlight: 'Penta Lens optics; 8 filter wavelengths; economic reagent use'
    },
    'mispa-fab120': {
      name: 'Mispa FAB 120', brand: 'Agappe Diagnostics', category: 'Clinical Chemistry',
      technology: 'Fully automated photometry + ISE electrolytes',
      parameters: 'Full biochemistry + ISE electrolytes + special proteins',
      throughput: '120 tests / hr',
      sampleTypes: 'Serum, plasma, urine',
      sampleVolume: 'Automated dispensing',
      resultTime: 'Continuous (random access)',
      display: '10.4" colour touchscreen',
      connectivity: 'Bidirectional LIS',
      highlight: 'Made in India; 40 reagent positions; on-board reagent refrigeration'
    },
    'mispa-cxl': {
      name: 'Mispa CXL Pro Plus', brand: 'Agappe Diagnostics', category: 'Clinical Chemistry',
      technology: 'Fully automated high-throughput; multi-wavelength photometry',
      parameters: 'Full biochemistry + special chemistry',
      throughput: '240 tests / hr',
      sampleTypes: 'Serum, plasma, urine',
      sampleVolume: 'Automated dispensing',
      resultTime: 'Continuous (random access)',
      display: 'Colour touchscreen',
      connectivity: 'Bidirectional LIS',
      highlight: '60 reagent positions; auto rerun &amp; dilution; auto washing &amp; decontamination'
    },
    'mispa-nano': {
      name: 'Mispa nano Plus', brand: 'Agappe Diagnostics', category: 'Clinical Chemistry',
      technology: 'Fully automated; compact bench-top; on-board refrigeration',
      parameters: 'Full biochemistry menu',
      throughput: '360 tests / hr',
      sampleTypes: 'Serum, plasma, urine',
      sampleVolume: 'Automated dispensing',
      resultTime: 'Continuous (random access)',
      display: 'Colour touchscreen',
      connectivity: 'Bidirectional LIS',
      highlight: 'Highest throughput; compact footprint; 2–12°C reagent cooling'
    },
    'mispa-revo': {
      name: 'Mispa REVO', brand: 'Agappe Diagnostics', category: 'Immunoassay',
      technology: 'Time-Resolved Fluorescence Immunoassay (TRFIA); dry cartridge',
      parameters: 'Thyroid, cardiac, fertility, infection, bone, tumour panels',
      throughput: 'Per cartridge (POCT)',
      sampleTypes: 'Serum, plasma, whole blood (panel-dependent)',
      sampleVolume: 'Small (cartridge pre-filled)',
      resultTime: '15–30 min (panel-dependent)',
      display: 'Colour touchscreen',
      connectivity: 'Bluetooth &amp; USB',
      highlight: 'No liquid reagent prep; QR code calibration; POCT-ready; portable'
    },
    'getein-1100': {
      name: 'Getein 1100', brand: 'Getein Biotech', category: 'Immunoassay',
      technology: 'Fluorescence Immunoassay (FIA); fully automated',
      parameters: 'Cardiac, thyroid, fertility, infection, D-dimer, tumour, bone panels',
      throughput: 'Fully automated single-test',
      sampleTypes: 'Serum, plasma, whole blood',
      sampleVolume: 'Small (FIA card)',
      resultTime: '3–15 minutes',
      display: '7" touchscreen',
      connectivity: 'Bluetooth &amp; USB; 100,000-result storage',
      highlight: 'Auto barcode reader; quantitative POCT; widest panel menu'
    },
    'mispa-clog': {
      name: 'Mispa CLOG', brand: 'Agappe Diagnostics', category: 'Coagulation',
      technology: 'Fully automated; optical clot detection; 37°C incubation',
      parameters: 'PT, APTT, TT, Fibrinogen',
      throughput: '2 channels simultaneous',
      sampleTypes: 'Citrated plasma (3.2%)',
      sampleVolume: 'Standard coagulation tube',
      resultTime: 'Test-dependent',
      display: 'Display + thermal printer',
      connectivity: 'LIS / HIS interface',
      highlight: 'Auto sample &amp; reagent detection; comprehensive QC program; precision 37°C'
    },
    'wondfo-ocg': {
      name: 'Wondfo OCG-102', brand: 'Wondfo', category: 'Coagulation',
      technology: 'Optical turbidity; 2-channel; portable; rechargeable battery',
      parameters: 'PT, APTT, TT, Fibrinogen, ACT',
      throughput: '2 channels simultaneous',
      sampleTypes: 'Capillary or venous whole blood',
      sampleVolume: '20 µL',
      resultTime: 'Test-dependent',
      display: 'LCD + thermal printer',
      connectivity: 'LIS interface',
      highlight: 'Portable (850 g); rechargeable battery; capillary blood; ACT testing'
    },
    'mispa-maestro': {
      name: 'Mispa Maestro', brand: 'Agappe Diagnostics', category: 'HbA1c',
      technology: 'HPLC-based detection; RFID reagent management',
      parameters: 'HbA1c, HbA0, HbA2, HbF, haemoglobin variants',
      throughput: '72 sec/sample; up to 50 samples continuous',
      sampleTypes: 'EDTA whole blood',
      sampleVolume: 'Small volume',
      resultTime: '72 seconds per sample',
      display: 'Large touchscreen',
      connectivity: 'LIS / HIS integration',
      highlight: 'RFID chip management; variant identification; 50-sample continuous loading'
    },
    'mispa-i3': {
      name: 'Mispa i3', brand: 'Agappe Diagnostics', category: 'Specific Proteins',
      technology: 'Dual-channel: Nephelometry + Turbidimetry; cartridge-based',
      parameters: 'CRP, ASO, RF, IgA, IgG, IgM, allergy, cardiovascular risk proteins',
      throughput: '15 min/test (POCT)',
      sampleTypes: 'Serum, plasma',
      sampleVolume: 'Small (cartridge)',
      resultTime: '15 minutes',
      display: 'Colour touchscreen',
      connectivity: 'LIS interface',
      highlight: 'No daily maintenance; dual-detection; POCT-ready; sealed cartridges'
    },
    'exias-e1': {
      name: 'EXIAS E1', brand: 'EXIAS Medical (Austria)', category: 'Electrolytes',
      technology: 'Ion-Selective Electrode (ISE); 6-parameter simultaneous',
      parameters: 'Na⁺, K⁺, Cl⁻, iCa²⁺, pH, Hct',
      throughput: '25 sec / sample',
      sampleTypes: 'Serum, plasma, urine, whole blood',
      sampleVolume: 'Small ISE volume',
      resultTime: '25 seconds',
      display: '3.5" colour display + thermal printer',
      connectivity: 'Bidirectional LIS',
      highlight: 'Auto calibration &amp; QC; 4 sample types; 25-second turnaround'
    },
    'opti-cca': {
      name: 'OPTI CCA TS 2', brand: 'OPTI Medical Systems (USA)', category: 'Critical Care / Blood Gas',
      technology: 'Optical fluorescence; single-use cassette; no calibration required',
      parameters: 'Blood gas (pH, pCO₂, pO₂), electrolytes, metabolites, Hct',
      throughput: 'Single cassette; bedside portable',
      sampleTypes: 'Whole blood (arterial, venous, capillary)',
      sampleVolume: '125 µL',
      resultTime: 'Under 120 seconds',
      display: 'Colour touchscreen',
      connectivity: 'LIS; USB',
      highlight: '8-hr battery; 4.3 kg portable; no calibration; ICU / ED use'
    },
  };

  const ROWS = [
    { label: 'Brand',           key: 'brand'       },
    { label: 'Category',        key: 'category'    },
    { label: 'Technology',      key: 'technology'  },
    { label: 'Parameters',      key: 'parameters'  },
    { label: 'Throughput',      key: 'throughput'  },
    { label: 'Sample Types',    key: 'sampleTypes' },
    { label: 'Sample Volume',   key: 'sampleVolume'},
    { label: 'Result Time',     key: 'resultTime'  },
    { label: 'Display',         key: 'display'     },
    { label: 'Connectivity',    key: 'connectivity'},
    { label: 'Key Highlights',  key: 'highlight'   },
  ];

  // Populate dropdowns
  const opts = Object.entries(PRODUCTS)
    .sort((a,b) => a[1].name.localeCompare(b[1].name));

  selects.forEach(sel => {
    opts.forEach(([id, p]) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = p.name + ' (' + p.category + ')';
      sel.appendChild(o);
    });
  });

  function renderTable() {
    const chosen = selects.map(s => s.value).filter(Boolean);
    if (chosen.length < 2) {
      result.innerHTML = `<div class="compare-empty"><span class="cmp-empty-icon">⚗️</span>Select at least 2 instruments above and click <strong>Compare Instruments</strong>.</div>`;
      return;
    }
    const prods = chosen.map(id => ({ id, ...PRODUCTS[id] }));

    let th = '<th>Specification</th>';
    prods.forEach(p => {
      th += `<th><span class="cmp-prod-name">${p.name}</span><span class="cmp-prod-brand">${p.brand}</span></th>`;
    });

    let rows = '';
    ROWS.forEach(r => {
      let cells = `<td>${r.label}</td>`;
      prods.forEach(p => { cells += `<td>${p[r.key] || '—'}</td>`; });
      rows += `<tr>${cells}</tr>`;
    });

    // Actions row
    let actCells = `<td>Enquire</td>`;
    prods.forEach(() => { actCells += `<td><a href="contact.html" class="btn btn-primary" style="font-size:0.8rem;padding:8px 16px;">Get a Quote</a></td>`; });
    rows += `<tr>${actCells}</tr>`;

    result.innerHTML = `<div class="compare-table-wrap"><table class="compare-table"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  btn.addEventListener('click', renderTable);
  clearBtn.addEventListener('click', () => {
    selects.forEach(s => s.value = '');
    result.innerHTML = '';
  });

  // Show placeholder on load
  result.innerHTML = `<div class="compare-empty"><span class="cmp-empty-icon">⚗️</span>Select at least 2 instruments above and click <strong>Compare Instruments</strong>.</div>`;
}

/* ── Nav "More" Dropdown ──────────────────────────────────────── */
function initNavDropdown() {
  const wrapper = document.getElementById('navMore');
  const btn     = document.getElementById('navMoreBtn');
  const panel   = wrapper ? wrapper.querySelector('.nav-more-panel') : null;
  if (!wrapper || !btn || !panel) return;

  // Mark button active when current page is one of the "more" pages
  const morePages = ['service.html','faq.html','reagents.html','compare.html',
                     'testimonials.html','blog.html','service-request.html'];
  const currentPage = window.location.pathname.split('/').pop() || '';
  if (morePages.includes(currentPage)) btn.classList.add('active');

  let hoverOpen = false;

  // Desktop: open/close on hover
  wrapper.addEventListener('mouseenter', () => { hoverOpen = true;  panel.classList.add('open'); });
  wrapper.addEventListener('mouseleave', () => { hoverOpen = false; panel.classList.remove('open'); btn.setAttribute('aria-expanded','false'); });

  // Mobile / keyboard: toggle on click
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close on any outside click
  document.addEventListener('click', () => {
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  });

  // Keyboard: close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { panel.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  });
}

/* ── Service Request Form ─────────────────────────────────────── */
function initServiceRequest() {
  const form    = document.getElementById('serviceRequestForm');
  const success = document.getElementById('srSuccess');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btnText    = form.querySelector('.sr-btn-text');
    const btnSending = form.querySelector('.sr-btn-sending');
    if (btnText) btnText.style.display = 'none';
    if (btnSending) btnSending.style.display = '';

    // Build WhatsApp message from form data
    const data = new FormData(form);
    const msg = encodeURIComponent(
      `*Service Request — Optica Enterprises*\n\n` +
      `Name: ${data.get('name') || '—'}\n` +
      `Organisation: ${data.get('organisation') || '—'}\n` +
      `Phone: ${data.get('phone') || '—'}\n` +
      `Email: ${data.get('email') || '—'}\n` +
      `Address: ${data.get('address') || '—'}\n\n` +
      `Instrument: ${data.get('model') || '—'}\n` +
      `Serial No: ${data.get('serial') || '—'}\n\n` +
      `Request Type: ${data.get('issueType') || '—'}\n` +
      `Urgency: ${data.get('urgency') || '—'}\n\n` +
      `Issue Description:\n${data.get('description') || '—'}\n\n` +
      `Availability: ${data.get('availability') || '—'}`
    );

    // Open WhatsApp after short delay (simulate send)
    setTimeout(() => {
      window.open(`https://wa.me/917678273175?text=${msg}`, '_blank');
      form.reset();
      form.style.display = 'none';
      if (success) success.style.display = 'block';
    }, 800);
  });
}

/* ═══════════════════════════════════════════════════════════════
   ANIMATION SUITE v2
   ═══════════════════════════════════════════════════════════════ */

/* 1 · Page fade transition ----------------------------------- */
function initPageTransitions() {
  // Fade in on page load
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });

  // Fade out before navigating away
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    // Skip anchors, mailto, tel, external, and new-tab links
    if (!href || href.startsWith('#') || href.startsWith('mailto:') ||
        href.startsWith('tel:') || /^https?:\/\//.test(href) ||
        a.target === '_blank') return;
    e.preventDefault();
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = href; }, 280);
  });
}

/* 2 · Section-header stagger --------------------------------- */
function initSectionHeaderStagger() {
  const headers = document.querySelectorAll('.section-header');
  if (!headers.length) return;

  // Mark every header so the CSS can start children hidden
  headers.forEach(h => h.classList.add('stagger-init'));

  // Same hysteresis pattern: show at ≥20 %, hide only at <3 %
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.intersectionRatio >= 0.2) {
        entry.target.classList.add('hdr-in');
      } else if (entry.intersectionRatio < 0.03) {
        entry.target.classList.remove('hdr-in');
      }
    });
  }, { threshold: [0, 0.03, 0.2, 1] });

  headers.forEach(h => obs.observe(h));
}

/* 3 · Hero collage 3D tilt ----------------------------------- */
function initHeroCollage3D() {
  // Desktop / pointer devices only
  if (window.matchMedia('(hover: none)').matches) return;

  const hero    = document.querySelector('.hero');
  const collage = document.querySelector('.hero-collage');
  if (!hero || !collage) return;

  let raf;
  hero.addEventListener('mousemove', e => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r  = hero.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      // Map cursor offset to ±2.5 deg rotation
      const rx = ((e.clientY - cy) / (r.height / 2)) * -2.5;
      const ry = ((e.clientX - cx) / (r.width  / 2)) *  2.5;
      collage.style.transition = 'transform 0.12s linear';
      collage.style.transform  =
        `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    cancelAnimationFrame(raf);
    collage.style.transition = 'transform 0.9s ease';
    collage.style.transform  =
      'perspective(1400px) rotateX(0deg) rotateY(0deg)';
  });
}

/* 4 · Stat card 3D tilt -------------------------------------- */
function initStatCardTilt() {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.stat-card').forEach(card => {
    let raf;
    card.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r  = card.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const rx = ((e.clientY - cy) / (r.height / 2)) * -12;
        const ry = ((e.clientX - cx) / (r.width  / 2)) *  12;
        card.style.transform =
          `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.04)`;
        card.style.boxShadow =
          `${-ry * 0.5}px ${rx * 0.5}px 28px rgba(76,175,80,0.22)`;
      });
    });
    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
}
