/**
 * case-study.js — small interactivity layer for the case study page.
 * All effects are progressive enhancement: page still reads perfectly with JS off.
 */
(() => {
  // ---------- 1. Scroll progress bar ----------
  const bar = document.querySelector('.cs-progress__fill');
  if (bar) {
    const updateBar = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = pct + '%';
    };
    updateBar();
    window.addEventListener('scroll', updateBar, { passive: true });
  }

  // ---------- 2. Fade / slide sections in as they scroll into view ----------
  const revealables = document.querySelectorAll('.cs-reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    // No IO support -> just show everything.
    revealables.forEach((el) => el.classList.add('is-visible'));
  }

  // ---------- 3. Sticky TOC active-section highlighting ----------
  const tocLinks = document.querySelectorAll('.cs-toc a');
  const sections = [...document.querySelectorAll('.cs-section[id]')];
  if (tocLinks.length && sections.length && 'IntersectionObserver' in window) {
    const linkFor = (id) => document.querySelector(`.cs-toc a[href="#${id}"]`);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const link = linkFor(e.target.id);
          if (!link) return;
          if (e.isIntersecting) {
            tocLinks.forEach((l) => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => io.observe(s));
  }

  // ---------- 4. Count-up animation for stat numbers ----------
  const stats = document.querySelectorAll('.cs-stat__num[data-count]');
  if ('IntersectionObserver' in window && stats.length) {
    const animate = (el) => {
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
        const val = Math.round(target * eased);
        el.textContent = val.toLocaleString() + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    stats.forEach((s) => io.observe(s));
  }

  // ---------- 5. Module card modal ----------
  const modal = document.querySelector('.cs-modal');
  const modalBody = document.querySelector('.cs-modal__body');
  const modalTitle = document.querySelector('.cs-modal__title');
  const modalKind = document.querySelector('.cs-modal__kind');

  const openModal = (card) => {
    if (!modal) return;
    modalTitle.textContent = card.dataset.title || '';
    modalKind.textContent = card.dataset.kind || '';
    modalBody.innerHTML = card.dataset.body || '';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.cs-module-card').forEach((card) => {
    card.addEventListener('click', () => openModal(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); }
    });
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('cs-modal__close')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ---------- 6. Subtle tilt on meta cards (desktop pointer only) ----------
  const tiltables = document.querySelectorAll('.cs-tilt');
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (supportsHover) {
    tiltables.forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left) / rect.width - 0.5;
        const dy = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = `perspective(600px) rotateX(${-dy * 6}deg) rotateY(${dx * 6}deg) translateY(-2px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }
})();
