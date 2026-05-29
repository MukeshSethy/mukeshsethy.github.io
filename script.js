(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const html = document.documentElement;
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Theme toggle (light by default; persist user choice).
  const themeToggle = $(".theme-toggle");
  const THEME_KEY = "theme";

  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
      // localStorage may be unavailable; theme still applies for the session.
    }
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        next === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_) {
      return null;
    }
  }

  const stored = getStoredTheme();
  applyTheme(stored === "light" || stored === "dark" ? stored : "light");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = html.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }

  // Mobile nav menu.
  const navToggle = $(".nav-toggle");
  const navLinks = $("#nav-links");

  function closeMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
  }

  function openMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "Close menu");
    const first = $(".nav-link", navLinks);
    if (first) first.focus({ preventScroll: true });
  }

  function toggleMenu() {
    if (!navLinks || !navToggle) return;
    const isOpen = navLinks.classList.contains("is-open");
    if (isOpen) closeMenu();
    else openMenu();
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", toggleMenu);

    // Close menu after clicking a nav link.
    navLinks.addEventListener("click", (e) => {
      const target = e.target;
      if (target && target.matches && target.matches("a.nav-link")) closeMenu();
    });

    // Escape closes the menu.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // Click outside closes the menu.
    document.addEventListener("click", (e) => {
      if (!navLinks.classList.contains("is-open")) return;
      const t = e.target;
      if (t === navToggle || navToggle.contains(t)) return;
      if (t === navLinks || navLinks.contains(t)) return;
      closeMenu();
    });

    // If resized to desktop, ensure menu is closed.
    window.addEventListener("resize", () => {
      if (window.innerWidth > 920) closeMenu();
    });
  }

  // Project filtering.
  const filterButtons = $$(".filter-button");
  const projectCards = $$(".project-card");

  function setActiveFilter(btn) {
    filterButtons.forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function applyFilter(value) {
    const v = (value || "all").toLowerCase();
    projectCards.forEach((card) => {
      const cat = (card.getAttribute("data-category") || "").toLowerCase();
      const show = v === "all" || cat === v;
      card.classList.toggle("is-hidden", !show);
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-filter") || "all";
      setActiveFilter(btn);
      applyFilter(value);
    });
  });

  // Footer year.
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Scroll progress bar + to-top button (rAF throttled).
  const progressBar = $("#scroll-progress-bar");
  const toTop = $("#to-top");

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;

      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.min(1, Math.max(0, scrollTop / max));

      if (progressBar) progressBar.style.width = `${(pct * 100).toFixed(2)}%`;
      if (toTop) toTop.classList.toggle("is-visible", scrollTop > 720);
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  // Copy-to-clipboard helpers (works on GitHub Pages and attempts fallback for local file opens).
  const toast = $("#toast");
  let toastTimer = 0;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  async function copyText(text) {
    if (!text) return false;

    // Modern API (requires secure context in most browsers).
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // Fall through to legacy approach.
    }

    // Legacy fallback.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  document.addEventListener("click", async (e) => {
    const t = e.target;
    if (!t || !t.matches) return;
    const btn = t.closest("[data-copy]");
    if (!btn) return;
    const text = btn.getAttribute("data-copy") || "";
    const ok = await copyText(text);
    showToast(ok ? "Copied" : "Copy not supported");
  });

  // Scroll-reveal (staggered).
  const revealSelector =
    ".hero-copy, .hero-panel, .two-col > div, .timeline-card, .filters, .project-card, .skill-card, .resume-card, .contact-card, .section-title";
  const revealEls = $$(revealSelector).filter((el) => el && el.classList);

  if (!prefersReducedMotion) {
    // Add base class and per-element delay.
    revealEls.forEach((el, i) => {
      el.classList.add("reveal");
      const d = Math.min(7, i % 8) * 70; // loops per "row" so it doesn't grow forever
      el.style.setProperty("--d", `${d}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    revealEls.forEach((el) => io.observe(el));
  }

  // Active nav link highlighting.
  const navAnchors = $$(".nav-links a.nav-link");
  const sections = navAnchors
    .map((a) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return null;
      const id = href.slice(1);
      const el = document.getElementById(id);
      return el ? { id, el } : null;
    })
    .filter(Boolean);

  function setActiveNav(id) {
    navAnchors.forEach((a) => {
      const isActive = a.getAttribute("href") === `#${id}`;
      a.classList.toggle("is-active", isActive);
    });
  }

  if (sections.length) {
    const navIO = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && visible.target && visible.target.id) setActiveNav(visible.target.id);
      },
      { threshold: [0.2, 0.35, 0.5], rootMargin: "-20% 0px -60% 0px" }
    );

    sections.forEach(({ el }) => navIO.observe(el));
  }
})();
