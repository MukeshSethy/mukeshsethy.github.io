(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const html = document.documentElement;

  // Theme toggle (dark by default; persist user choice).
  const themeToggle = $(".theme-toggle");
  const THEME_KEY = "theme";

  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {
      // localStorage may be unavailable in some privacy modes; theme still applies for the session.
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
  if (stored === "light" || stored === "dark") applyTheme(stored);
  else applyTheme("dark");

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

    // Click outside closes the menu (mobile overlay behavior).
    document.addEventListener("click", (e) => {
      if (!navLinks.classList.contains("is-open")) return;
      const t = e.target;
      if (t === navToggle || navToggle.contains(t)) return;
      if (t === navLinks || navLinks.contains(t)) return;
      closeMenu();
    });

    // If resized to desktop, ensure menu is closed.
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu();
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
})();

