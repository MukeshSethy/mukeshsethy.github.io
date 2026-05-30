(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = $(".site-header");

  // Mobile nav menu.
  const navToggle = $(".nav-toggle");
  const navLinks = $("#nav-links");

  // Mega menu (Projects).
  const megaWrap = $(".nav-mega");
  const megaToggle = megaWrap ? $(".nav-mega-toggle", megaWrap) : null;
  const megaPanel = megaWrap ? $(".mega-panel", megaWrap) : null;
  let megaHideTimer = 0;

  function openMega() {
    if (!megaWrap || !megaToggle || !megaPanel) return;
    window.clearTimeout(megaHideTimer);

    // Reveal first, then add open class on next frame so the transition runs.
    megaPanel.hidden = false;
    megaToggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => megaWrap.classList.add("is-open"));
  }

  function closeMega() {
    if (!megaWrap || !megaToggle || !megaPanel) return;
    window.clearTimeout(megaHideTimer);

    megaWrap.classList.remove("is-open");
    megaToggle.setAttribute("aria-expanded", "false");

    // Let the close transition finish before fully hiding.
    megaHideTimer = window.setTimeout(() => {
      if (!megaWrap.classList.contains("is-open")) megaPanel.hidden = true;
    }, 180);
  }

  function toggleMega() {
    if (!megaWrap || !megaToggle || !megaPanel) return;
    const isOpen = megaWrap.classList.contains("is-open");
    if (isOpen) closeMega();
    else openMega();
  }

  function closeMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    closeMega();
  }

  function openMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.add("is-open");
    navToggle.classList.add("is-open");
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
      const t = e.target;
      if (!t || !t.closest) return;
      const a = t.closest("a");
      if (a && navLinks.contains(a)) closeMenu();
    });

    // Escape closes the menu.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
        closeMega();
      }
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
      closeMega();
    });
  }

  // Mega menu interactions.
  if (megaToggle) {
    megaToggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggleMega();
    });

    // Close on outside click.
    document.addEventListener("click", (e) => {
      if (!megaWrap || !megaWrap.classList.contains("is-open")) return;
      const t = e.target;
      if (t === megaWrap || megaWrap.contains(t)) return;
      closeMega();
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

  function setFilterByValue(value) {
    const v = (value || "all").toLowerCase();
    const btn =
      filterButtons.find((b) => (b.getAttribute("data-filter") || "").toLowerCase() === v) ||
      filterButtons[0];
    if (btn) setActiveFilter(btn);
    applyFilter(v);
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-filter") || "all";
      setFilterByValue(value);
    });
  });

  // Apply project filter from mega menu / footer links.
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const a = t.closest("[data-mega-filter]");
    if (!a) return;
    const value = a.getAttribute("data-mega-filter") || "all";
    if (filterButtons.length && projectCards.length) setFilterByValue(value);
    closeMega();
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
      if (header) header.classList.toggle("is-scrolled", scrollTop > 8);
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

  // Contact form: select topics + open a prefilled mailto draft (works offline).
  const CONTACT_EMAIL = "mukeshatnitr@gmail.com";
  const topicPills = $$(".topic-pill");
  const contactForm = $("#contact-form");

  topicPills.forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      const isActive = btn.classList.toggle("is-active");
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  });

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fd = new FormData(contactForm);
      const name = String(fd.get("name") || "").trim();
      const email = String(fd.get("email") || "").trim();
      const company = String(fd.get("company") || "").trim();
      const message = String(fd.get("message") || "").trim();

      const topics = topicPills
        .filter((b) => b.classList.contains("is-active"))
        .map((b) => String(b.getAttribute("data-topic") || b.textContent || "").trim())
        .filter(Boolean);

      const subject = topics.length ? `Portfolio: ${topics.join(", ")}` : "Portfolio inquiry";
      const bodyLines = [
        `Name: ${name || "-"}`,
        `Email: ${email || "-"}`,
        `Company: ${company || "-"}`,
        `Topics: ${topics.length ? topics.join(", ") : "-"}`,
        "",
        message || "",
      ];

      const mailto =
        `mailto:${CONTACT_EMAIL}` +
        `?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(bodyLines.join("\\n"))}`;

      showToast("Opening email client...");
      window.location.href = mailto;
    });
  }

  // Scroll-reveal (staggered).
  const revealSelector =
    ".hero-copy, .hero-panel, .offering-head, .offering-rail, .offering-card, .timeline-card, .filters, .project-card, .snapshot-copy, .snapshot-art, .stat, .about-body, .resume-card, .field, .topic-pill, .send-button, .section-title";
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
  const projectsNav = megaToggle;
  const sections = navAnchors
    .map((a) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return null;
      const id = href.slice(1);
      const el = document.getElementById(id);
      return el ? { id, el } : null;
    })
    .filter(Boolean);

  if (projectsNav) {
    const projectsSection = document.getElementById("projects");
    if (projectsSection) sections.push({ id: "projects", el: projectsSection });
  }

  function setActiveNav(id) {
    navAnchors.forEach((a) => {
      const isActive = a.getAttribute("href") === `#${id}`;
      a.classList.toggle("is-active", isActive);
    });
    if (projectsNav) projectsNav.classList.toggle("is-active", id === "projects");
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
