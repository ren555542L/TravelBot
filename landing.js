/* Landing page JS */
'use strict';

// ── THEME TOGGLE ─────────────────────────────────
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const saved  = localStorage.getItem('wanderai_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light');
    if (toggle) toggle.textContent = '☀️';
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light');
      toggle.textContent = isLight ? '☀️' : '🌙';
      localStorage.setItem('wanderai_theme', isLight ? 'light' : 'dark');
    });
  }
})();

// ── NAVBAR SCROLL ───────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── HAMBURGER ───────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
});
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) navLinks.classList.remove('open');
});

// ── PARTICLES ───────────────────────────────────
(function createParticles() {
  const container = document.getElementById('particles');
  const count = 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      bottom: ${Math.random() * 20}%;
      animation-duration: ${Math.random() * 15 + 10}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: ${Math.random() * 0.6 + 0.2};
      background: hsl(${220 + Math.random() * 60}, 80%, 70%);
    `;
    container.appendChild(p);
  }
})();

// ── HERO BG PARALLAX ────────────────────────────
const heroBgImg = document.getElementById('hero-bg-img');
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  if (scrolled < window.innerHeight) {
    heroBgImg.style.transform = `scale(1.05) translateY(${scrolled * 0.15}px)`;
  }
}, { passive: true });

// ── REVEAL ON SCROLL (Intersection Observer) ────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

// Hero elements revealed immediately on load
document.querySelectorAll('.hero-content .reveal-up').forEach((el, i) => {
  setTimeout(() => el.classList.add('visible'), i * 130 + 200);
});

// Feature / section cards
document.querySelectorAll('.feature-card, .dest-card, .hiw-step, .testimonial-card').forEach(el => {
  revealObserver.observe(el);
});

// ── COUNTER ANIMATION ───────────────────────────
function animateCounter(el, target, suffix, duration = 1800) {
  let start = 0;
  const increment = target / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + increment, target);
    el.textContent = Math.floor(start).toLocaleString();
    if (start >= target) clearInterval(timer);
  }, 16);
}

const statsSection = document.getElementById('hero-stats');
let counterStarted = false;
const statsObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !counterStarted) {
    counterStarted = true;
    document.querySelectorAll('.stat-num').forEach(el => {
      animateCounter(el, parseInt(el.dataset.target), '');
    });
    statsObserver.disconnect();
  }
}, { threshold: 0.5 });
if (statsSection) statsObserver.observe(statsSection);

// ── FEATURE CARD STAGGER ────────────────────────
document.querySelectorAll('.feature-card').forEach((card, i) => {
  card.style.transitionDelay = `${i * 100}ms`;
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      card.classList.add('visible');
      obs.disconnect();
    }
  }, { threshold: 0.1 });
  obs.observe(card);
});

// ── TESTIMONIALS CAROUSEL ───────────────────────
(function initCarousel() {
  const track = document.getElementById('testimonials-track');
  const dots  = document.querySelectorAll('.dot');
  let current = 0;
  let autoTimer;

  function goTo(idx) {
    const cards = track.querySelectorAll('.testimonial-card');
    const cardW = cards[0] ? cards[0].offsetWidth + 24 : 0;
    current = idx;
    // On large screens show 2 at a time
    const isMobile = window.innerWidth <= 1024;
    const offset = isMobile ? idx * cardW : Math.floor(idx / 2) * cardW * 2;
    track.style.transform = `translateX(-${offset}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => {
    clearInterval(autoTimer);
    goTo(i);
    startAuto();
  }));

  function startAuto() {
    autoTimer = setInterval(() => {
      const next = (current + 1) % dots.length;
      goTo(next);
    }, 5000);
  }
  startAuto();
  window.addEventListener('resize', () => goTo(current));
})();

// ── SMOOTH SCROLL FOR NAV LINKS ─────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      navLinks.classList.remove('open');
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── CTA HOVER RIPPLE ────────────────────────────
document.querySelectorAll('.btn-primary, .btn-cta-lg').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    const rect   = this.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height) * 2;
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${e.clientX - rect.left - size/2}px;
      top:  ${e.clientY - rect.top  - size/2}px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-effect 0.6s ease-out;
      pointer-events: none;
      z-index: 10;
    `;
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

// Add ripple keyframe
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes ripple-effect {
    to { transform: scale(1); opacity: 0; }
  }
`;
document.head.appendChild(rippleStyle);

// ── DESTINATION CARDS TILT ──────────────────────
document.querySelectorAll('.dest-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-8px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
    card.style.transition = 'transform 0.4s ease';
  });
  card.addEventListener('mouseenter', () => {
    card.style.transition = 'transform 0.1s ease';
  });
});

console.log('%c✈ WanderAI Landing Loaded', 'color:#818cf8;font-size:14px;font-weight:bold;');
