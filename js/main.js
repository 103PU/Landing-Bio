// ============================================================
// 103_PU PORTFOLIO — interactions
// ============================================================
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const burger = document.getElementById('navBurger');
    const mobileMenu = document.getElementById('mobileMenu');
    const themeToggle = document.getElementById('themeToggle');
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'));

    // --- 1. Navbar frosted-glass on scroll ---
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- 2. Mobile hamburger overlay ---
    const setMenu = (open) => {
        burger.classList.toggle('open', open);
        mobileMenu.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
        mobileMenu.setAttribute('aria-hidden', String(!open));
        document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setMenu(!burger.classList.contains('open')));

    // --- 3. Smooth scroll for in-page links (+ close mobile menu) ---
    document.querySelectorAll('[data-scroll]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            setMenu(false);
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // --- 4. Active section highlight (Intersection Observer) ---
    const sections = navLinks
        .map((a) => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((a) =>
                a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id)
            );
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));

    // --- 5. Scroll entrance with stagger ---
    const revealEls = document.querySelectorAll('.reveal');
    const revealObs = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const siblings = Array.from(entry.target.parentElement.querySelectorAll('.reveal'));
            entry.target.style.transitionDelay = Math.max(0, siblings.indexOf(entry.target)) * 80 + 'ms';
            entry.target.classList.add('in-view');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => revealObs.observe(el));

    // --- 6. Theme toggle (persisted) ---
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });

    // --- 7. Contact form -> mailto fallback (no real submit) ---
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const d = new FormData(form);
            const subject = encodeURIComponent(`[${d.get('type')}] from ${d.get('name')}`);
            const body = encodeURIComponent(`${d.get('message')}\n\n— ${d.get('name')} (${d.get('email')})`);
            window.location.href = `mailto:hello@103pu.dev?subject=${subject}&body=${body}`;
        });
    }

    // --- 8. Footer year ---
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
})();
