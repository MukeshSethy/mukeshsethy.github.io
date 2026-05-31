(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Folder-style URLs are clean on GitHub Pages, but `file://` does not auto-open folder `index.html`.
  // Rewrite internal links ending with `/` to `.../index.html` when opened locally.
  (function fixFileProtocolFolderLinks() {
    try {
      if (location.protocol !== "file:") return;
      $$("a[href]").forEach((a) => {
        const href = String(a.getAttribute("href") || "").trim();
        if (!href) return;
        if (href.startsWith("#")) return;
        if (/^(https?:)?\/\//i.test(href)) return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
        if (a.hasAttribute("download")) return;
        if (href.endsWith("/")) a.setAttribute("href", `${href}index.html`);
      });
    } catch (_) {
      // Ignore.
    }
  })();

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lightweight perf tiering to keep the site snappy on low-end devices.
  const perf = (() => {
    const cores = Math.max(1, navigator.hardwareConcurrency || 4);
    const coarse =
      window.matchMedia && window.matchMedia("(pointer: coarse), (hover: none)").matches;
    const small = Math.min(window.innerWidth || 0, window.innerHeight || 0) < 760;
    const saveData =
      navigator.connection && typeof navigator.connection.saveData === "boolean"
        ? navigator.connection.saveData
        : false;
    const mem =
      typeof navigator.deviceMemory === "number" && Number.isFinite(navigator.deviceMemory)
        ? navigator.deviceMemory
        : 0;

    // Default to "med" unless we are fairly sure the device can handle "high".
    let tier = "med";
    if (prefersReducedMotion || coarse || saveData) tier = "low";
    else if (cores <= 4 || small || (mem && mem <= 4)) tier = "low";
    else if (cores <= 8 || (mem && mem <= 8)) tier = "med";
    else tier = "high";

    return { tier, cores, coarse, small, saveData, mem };
  })();

  // Used by CSS to adjust costly effects automatically.
  try {
    document.documentElement.classList.add(`perf-${perf.tier}`);
  } catch (_) {
    // Ignore.
  }

  // Read key CSS vars once so canvas FX can match the current theme.
  const theme = (() => {
    const root = document.documentElement;

    function readVar(name, fallback) {
      try {
        const v = getComputedStyle(root).getPropertyValue(name);
        const s = String(v || "").trim();
        return s || fallback;
      } catch (_) {
        return fallback;
      }
    }

    function clampByte(n) {
      return Math.max(0, Math.min(255, Math.round(n)));
    }

    // Supports hex (#rgb/#rrggbb) and rgb()/rgba() strings.
    function parseRgb(color) {
      if (!color) return null;
      const c = String(color).trim();
      if (!c) return null;

      if (c[0] === "#") {
        let hex = c.slice(1).trim();
        if (hex.length === 3) hex = hex.split("").map((ch) => ch + ch).join("");
        if (hex.length !== 6) return null;
        const num = Number.parseInt(hex, 16);
        if (!Number.isFinite(num)) return null;
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
      }

      const m = c.match(/rgba?\(([^)]+)\)/i);
      if (m && m[1]) {
        const nums = String(m[1]).match(/[0-9.]+/g);
        if (nums && nums.length >= 3) {
          const r = Number(nums[0]);
          const g = Number(nums[1]);
          const b = Number(nums[2]);
          if ([r, g, b].every((x) => Number.isFinite(x))) {
            return { r: clampByte(r), g: clampByte(g), b: clampByte(b) };
          }
        }
      }

      return null;
    }

    function rgba(rgb, a) {
      const r = rgb && typeof rgb.r === "number" ? rgb.r : 0;
      const g = rgb && typeof rgb.g === "number" ? rgb.g : 0;
      const b = rgb && typeof rgb.b === "number" ? rgb.b : 0;
      return `rgba(${r},${g},${b},${a})`;
    }

    const brand = readVar("--brand", "#00d992");
    const ink = readVar("--ink", "#f2f2f2");
    const canvas = readVar("--canvas", "#101010");

    return {
      brand,
      ink,
      canvas,
      brandRgb: parseRgb(brand) || { r: 0, g: 217, b: 146 },
      inkRgb: parseRgb(ink) || { r: 242, g: 242, b: 242 },
      canvasRgb: parseRgb(canvas) || { r: 16, g: 16, b: 16 },
      rgba,
    };
  })();

  function runWhenIdle(cb, timeout = 650) {
    try {
      if ("requestIdleCallback" in window) {
        return window.requestIdleCallback(() => cb(), { timeout });
      }
    } catch (_) {
      // Fall through to setTimeout.
    }
    return window.setTimeout(() => cb(), Math.min(360, timeout));
  }

  const header = $(".site-header");

  // Mobile nav menu.
  const navToggle = $(".nav-toggle");
  const navLinks = $("#nav-links");

  // Mega menu (Projects).
  const megaWrap = $(".nav-mega");
  const megaToggle = megaWrap ? $(".nav-mega-toggle", megaWrap) : null;
  const megaPanel = megaWrap ? $(".mega-panel", megaWrap) : null;
  let megaHideTimer = 0;

  let pendingNavTimer = 0;
  function cancelPendingNavigation() {
    if (!pendingNavTimer) return;
    window.clearTimeout(pendingNavTimer);
    pendingNavTimer = 0;
    document.body.classList.remove("is-leaving");
  }

  // Subtle page-leave transition for internal navigations.
  (function setupPageTransitions() {
    const LEAVE_MS = 190;

    function isModifiedEvent(e) {
      return !!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
    }

    function shouldIntercept(a, href) {
      if (!a || !href) return false;
      if (href.startsWith("#")) return false;
      if (a.hasAttribute("download")) return false;
      if (a.target && a.target !== "_self") return false;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
      if (/^(https?:)?\/\//i.test(href)) return false;
      return true; // relative/internal
    }

    document.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (isModifiedEvent(e)) return;
      const t = e.target;
      if (!t || !t.closest) return;
      const a = t.closest("a");
      if (!a) return;
      const href = String(a.getAttribute("href") || "").trim();
      if (!shouldIntercept(a, href)) return;

      // Avoid double navigation.
      if (document.body.classList.contains("is-leaving")) return;

      e.preventDefault();
      document.body.classList.add("is-leaving");
      pendingNavTimer = window.setTimeout(() => {
        pendingNavTimer = 0;
        window.location.href = href;
      }, LEAVE_MS);
    });

    // If restored from bfcache, ensure we don't get stuck in the leaving state.
    window.addEventListener("pageshow", () => {
      cancelPendingNavigation();
    });
  })();

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

  function getInitialProjectFilter() {
    // 1) Cross-page handoff via sessionStorage.
    try {
      const stored = sessionStorage.getItem("projectFilter");
      if (stored) {
        sessionStorage.removeItem("projectFilter");
        return stored;
      }
    } catch (_) {
      // Ignore.
    }

    // 2) Optional query param: `?filter=robotics`
    try {
      const sp = new URLSearchParams(location.search || "");
      return sp.get("filter") || "";
    } catch (_) {
      return "";
    }
  }

  if (filterButtons.length && projectCards.length) {
    setFilterByValue(getInitialProjectFilter() || "all");

    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.getAttribute("data-filter") || "all";
        setFilterByValue(value);
      });
    });
  }

  // Apply project filter from mega menu / footer links.
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t || !t.closest) return;
    const a = t.closest("a[data-mega-filter]");
    if (!a) return;
    const value = a.getAttribute("data-mega-filter") || "all";

    // Persist across pages.
    try {
      sessionStorage.setItem("projectFilter", value);
    } catch (_) {
      // Ignore.
    }

    // If we're already on the projects grid, filter in-place and keep the user here.
    if (filterButtons.length && projectCards.length) {
      e.preventDefault();
      cancelPendingNavigation();
      setFilterByValue(value);
      closeMega();
    }
  });

  // Footer year.
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Ambient background FX (canvas).
  const ambientFxCanvas = $("#ambient-fx");
  if (ambientFxCanvas && !prefersReducedMotion && perf.tier === "high") {
    // Defer to idle time so initial paint remains quick.
    runWhenIdle(() => initAmbientFx(ambientFxCanvas), 900);
  }

  // Pointer light overlay (desktop fine pointer only).
  const pointerLight = $("#pointer-light");
  if (pointerLight && !prefersReducedMotion && !perf.coarse && perf.tier === "high") {
    runWhenIdle(() => initPointerLight(pointerLight), 520);
  }

  // Cursor FX (desktop fine pointer only).
  const cursorFx = $("#cursor-fx");
  if (cursorFx && !prefersReducedMotion && !perf.coarse && perf.tier !== "low") {
    runWhenIdle(() => initCursorFx(cursorFx), 700);
  }

  // Click ripples (subtle HUD feedback).
  const clickRipples = $("#click-ripples");
  if (clickRipples && !prefersReducedMotion && perf.tier !== "low") {
    initClickRipples(clickRipples);
  }

  // Futuristic hero FX: interactive flow-field trails (canvas).
  const heroFxCanvas = $("#hero-fx");
  if (heroFxCanvas && !prefersReducedMotion && perf.tier !== "low") {
    // Let the browser paint the hero once before starting the canvas loop.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => initHeroFx(heroFxCanvas)));
  }

  // Pointer-reactive 3D tilt + glare for cards.
  if (!prefersReducedMotion && perf.tier !== "low") {
    runWhenIdle(() => initTiltCards(), 900);
  }

  // Magnetic micro-motion on interactive elements (desktop only).
  if (!prefersReducedMotion && !perf.coarse && perf.tier !== "low") {
    runWhenIdle(() => initMagneticMotion(), 750);
  }

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

      // Used for subtle scroll-linked parallax in CSS (kept lightweight).
      doc.style.setProperty("--scroll", `${scrollTop}px`);

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

  // Non-critical enhancements: defer to idle time so initial load stays snappy.
  runWhenIdle(() => initNonCriticalEnhancements(), 1200);

  function initNonCriticalEnhancements() {
    // Toast + copy-to-clipboard helpers.
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
      ".page-title, .page-lead, .hero-copy, .hero-panel, .offering-head, .offering-rail, .offering-card, .timeline-card, .filters, .project-card, .snapshot-copy, .snapshot-art, .stat, .about-body, .resume-card, .field, .topic-pill, .send-button, .cta-panel, .section-title, .section-head, .section-actions";
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

    // Experience timeline: click-to-pin a card (subtle micro-interaction).
    const timelineCards = $$(".timeline-card");
    if (timelineCards.length) {
      timelineCards.forEach((card) => {
        if (!card || !card.classList) return;
        if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-pressed", card.classList.contains("is-pinned") ? "true" : "false");

        function togglePin() {
          const pinned = card.classList.toggle("is-pinned");
          card.setAttribute("aria-pressed", pinned ? "true" : "false");
        }

        card.addEventListener("click", (e) => {
          const t = e.target;
          if (t && t.closest && t.closest("a, button, input, textarea, select")) return;
          togglePin();
        });

        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePin();
          }
        });
      });
    }

    // Active nav link highlighting + smooth nav indicator.
    const navAnchors = $$(".nav-links a.nav-link");
    const projectsNav = megaToggle;

    const navIndicator = $("#nav-indicator");
    let activeNavEl = null;
    let hoverNavEl = null;

    function canUseNavIndicator() {
      return !!(navIndicator && navLinks && window.innerWidth > 980);
    }

    function moveNavIndicator(el) {
      if (!canUseNavIndicator() || !el) {
        if (navIndicator) navIndicator.classList.remove("is-visible");
        return;
      }

      const pr = navLinks.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left - pr.left);
      const w = Math.max(0, Math.round(r.width));

      navIndicator.style.width = `${w}px`;
      navIndicator.style.transform = `translateX(${x}px)`;
      navIndicator.classList.add("is-visible");
    }

    function syncNavIndicator() {
      moveNavIndicator(hoverNavEl || activeNavEl || navAnchors[0]);
    }

    function detectPageKey() {
      const explicit = document.body ? document.body.getAttribute("data-page") : "";
      if (explicit) return explicit;

      const p = String(location.pathname || "").replace(/\\/g, "/");
      if (/\/projects(\/|$)/i.test(p)) return "projects";
      if (/\/experience(\/|$)/i.test(p)) return "experience";
      if (/\/about(\/|$)/i.test(p)) return "about";
      if (/\/contact(\/|$)/i.test(p)) return "contact";
      return "home";
    }

    function setActiveNav(pageKey) {
      activeNavEl = null;
      navAnchors.forEach((a) => {
        const isActive = (a.getAttribute("data-page") || "") === pageKey;
        a.classList.toggle("is-active", isActive);
        if (isActive) {
          activeNavEl = a;
          a.setAttribute("aria-current", "page");
        } else {
          a.removeAttribute("aria-current");
        }
      });
      if (projectsNav) projectsNav.classList.toggle("is-active", pageKey === "projects");
      if (!hoverNavEl) syncNavIndicator();
    }

    if (navAnchors.length) setActiveNav(detectPageKey());

    if (navIndicator && navAnchors.length && navLinks) {
      navAnchors.forEach((a) => {
        a.addEventListener("pointerenter", () => {
          hoverNavEl = a;
          syncNavIndicator();
        });
        a.addEventListener("pointerleave", () => {
          hoverNavEl = null;
          syncNavIndicator();
        });
        a.addEventListener("focus", () => {
          hoverNavEl = a;
          syncNavIndicator();
        });
        a.addEventListener("blur", () => {
          hoverNavEl = null;
          syncNavIndicator();
        });
      });

      window.addEventListener("resize", () => {
        hoverNavEl = null;
        syncNavIndicator();
      });

      window.requestAnimationFrame(() => syncNavIndicator());
    }

    // Projects page: open a lightweight details modal using card content.
    const modal = $("#project-modal");
    const modalTitle = $("#project-modal-title");
    const modalPill = $("#project-modal-pill");
    const modalDesc = $("#project-modal-desc");
    const modalChips = $("#project-modal-chips");
    const modalClose = modal ? $("[data-modal-close]", modal) : null;
    let lastFocused = null;

    function getFocusable(root) {
      const sel =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return $$(sel, root).filter((el) => el && el.offsetParent !== null);
    }

    function openModalFromCard(card) {
      if (!modal || !card || !modalTitle || !modalDesc) return;
      lastFocused = document.activeElement;

      const titleEl = $(".card-title", card);
      const pillEl = $(".pill", card);
      const descEl = $(".muted", card);
      const chips = $$(".chips li", card).map((li) => String(li.textContent || "").trim()).filter(Boolean);

      modalTitle.textContent = titleEl ? String(titleEl.textContent || "").trim() : "Project";
      modalDesc.textContent = descEl ? String(descEl.textContent || "").trim() : "";
      if (modalPill) modalPill.textContent = pillEl ? String(pillEl.textContent || "").trim() : "";

      if (modalChips) {
        modalChips.innerHTML = "";
        chips.forEach((c) => {
          const li = document.createElement("li");
          li.textContent = c;
          modalChips.appendChild(li);
        });
      }

      modal.hidden = false;
      document.body.classList.add("modal-open");
      window.requestAnimationFrame(() => {
        modal.classList.add("is-open");
        const focusables = getFocusable(modal);
        (focusables[0] || modal).focus({ preventScroll: true });
      });
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove("is-open");
      document.body.classList.remove("modal-open");
      window.setTimeout(() => {
        modal.hidden = true;
        if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
      }, 240);
    }

    if (modal) {
      modal.setAttribute("tabindex", "-1");

      // Make cards keyboard-openable when the modal feature is present.
      $$(".project-card").forEach((card) => {
        if (!card || !card.getAttribute) return;
        if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-haspopup", "dialog");
        card.addEventListener("keydown", (e) => {
          if (modal.hidden) {
            // still allow open
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModalFromCard(card);
          }
        });
      });

      document.addEventListener("click", (e) => {
        const t = e.target;
        if (!t || !t.closest) return;
        const closeBtn = t.closest("[data-modal-close]");
        if (closeBtn && modal.contains(closeBtn)) {
          e.preventDefault();
          closeModal();
          return;
        }
        const card = t.closest(".project-card");
        if (card && card.getAttribute("data-category")) {
          // Avoid opening the modal while filtering with keyboard shortcuts etc.
          openModalFromCard(card);
        }
      });

      document.addEventListener("keydown", (e) => {
        if (modal.hidden) return;
        if (e.key === "Escape") {
          e.preventDefault();
          closeModal();
          return;
        }
        if (e.key !== "Tab") return;
        const focusables = getFocusable(modal);
        if (!focusables.length) {
          e.preventDefault();
          modal.focus({ preventScroll: true });
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });

      // Click backdrop closes.
      if (modalClose) {
        // no-op: presence is enough, handled in the click delegate above
      }
    }
  }

  function initTiltCards() {
    const mq = window.matchMedia
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : null;
    if (!mq || !mq.matches) return;

    const cards = $$(".project-card, .timeline-card, .offering-card");
    if (!cards.length) return;

    cards.forEach((el) => attachTilt(el));
  }

  function attachTilt(el) {
    let raf = 0;
    let px = 0;
    let py = 0;
    const max = el.classList.contains("project-card") ? 7 : 6;

    function reset() {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "50%");
    }

    function update() {
      raf = 0;
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (px - r.left) / Math.max(1, r.width)));
      const y = Math.max(0, Math.min(1, (py - r.top) / Math.max(1, r.height)));

      const dx = x - 0.5;
      const dy = y - 0.5;

      // Rotate "towards" the cursor.
      const rx = (-dy * max).toFixed(2);
      const ry = (dx * max).toFixed(2);

      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
    }

    el.addEventListener(
      "pointermove",
      (e) => {
      px = e.clientX;
      py = e.clientY;
      if (raf) return;
      raf = window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    el.addEventListener("pointerleave", () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      reset();
    });

    reset();
  }

  function initCursorFx(root) {
    const mq = window.matchMedia
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : null;
    if (!mq || !mq.matches) return;

    const ring = $("#cursor-ring", root);
    const dot = $("#cursor-dot", root);
    if (!ring || !dot) return;

    let tx = window.innerWidth * 0.5;
    let ty = window.innerHeight * 0.5;
    let dx = tx;
    let dy = ty;
    let rx = tx;
    let ry = ty;

    let raf = 0;
    let visible = false;
    let down = false;
    let hoverEl = null;

    const hoverSel =
      "a, button, .btn, .filter-button, .topic-pill, .nav-toggle, .header-cta, .text-link";

    function step() {
      raf = 0;
      if (!visible) return;

      // Dot is tighter; ring has more "drag" for the premium feel.
      dx += (tx - dx) * 0.42;
      dy += (ty - dy) * 0.42;

      let mx = tx;
      let my = ty;
      if (hoverEl && hoverEl.getBoundingClientRect) {
        const r = hoverEl.getBoundingClientRect();
        const cx = r.left + r.width * 0.5;
        const cy = r.top + r.height * 0.5;
        mx = tx + (cx - tx) * 0.22;
        my = ty + (cy - ty) * 0.22;
      }

      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;

      dot.style.setProperty("--cx", `${dx.toFixed(2)}px`);
      dot.style.setProperty("--cy", `${dy.toFixed(2)}px`);
      ring.style.setProperty("--cx", `${rx.toFixed(2)}px`);
      ring.style.setProperty("--cy", `${ry.toFixed(2)}px`);

      raf = window.requestAnimationFrame(step);
    }

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
      document.documentElement.classList.add("has-cursor-fx");
      visible = true;
      if (!raf) raf = window.requestAnimationFrame(step);
    }

    function onDown(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      down = true;
      root.classList.add("is-down");
    }

    function onUp() {
      down = false;
      root.classList.remove("is-down");
    }

    function setHover(el) {
      hoverEl = el;
      root.classList.toggle("is-hover", !!hoverEl);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("blur", onUp);

    document.addEventListener(
      "pointerover",
      (e) => {
        const t = e.target;
        if (!t || !t.closest) return;
        const hit = t.closest(hoverSel);
        if (hit) setHover(hit);
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerout",
      (e) => {
        if (!hoverEl) return;
        const rel = e.relatedTarget;
        if (rel && hoverEl.contains && hoverEl.contains(rel)) return;
        setHover(null);
      },
      { passive: true }
    );

    // When the pointer leaves the window, stop animating until the next move.
    window.addEventListener(
      "mouseout",
      (e) => {
        if (e.relatedTarget || e.toElement) return;
        visible = false;
        setHover(null);
      },
      { passive: true }
    );

    // Keep center-ish on resize so it doesn't jump to (0,0).
    window.addEventListener("resize", () => {
      tx = window.innerWidth * 0.5;
      ty = window.innerHeight * 0.5;
      dx = tx;
      dy = ty;
      rx = tx;
      ry = ty;
    });

    // Kick-start (hidden until first move).
    dot.style.setProperty("--cx", `${tx.toFixed(2)}px`);
    dot.style.setProperty("--cy", `${ty.toFixed(2)}px`);
    ring.style.setProperty("--cx", `${tx.toFixed(2)}px`);
    ring.style.setProperty("--cy", `${ty.toFixed(2)}px`);
  }

  function initPointerLight(el) {
    const mq = window.matchMedia
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : null;
    if (!mq || !mq.matches) return;

    const root = document.documentElement;

    // Keep it subtle but responsive; values are percentages so it scales with viewport.
    let x = 0.5;
    let y = 0.28;
    let tx = x;
    let ty = y;

    let raf = 0;
    let running = false;

    function setVars() {
      root.style.setProperty("--px", `${(x * 100).toFixed(2)}%`);
      root.style.setProperty("--py", `${(y * 100).toFixed(2)}%`);
    }

    function tick() {
      raf = 0;
      const dx = tx - x;
      const dy = ty - y;
      x += dx * 0.11;
      y += dy * 0.11;
      setVars();

      if (Math.abs(dx) + Math.abs(dy) > 0.0006) {
        raf = window.requestAnimationFrame(tick);
      } else {
        running = false;
      }
    }

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const vw = Math.max(1, window.innerWidth || 1);
      const vh = Math.max(1, window.innerHeight || 1);
      tx = (e.clientX || 0) / vw;
      ty = (e.clientY || 0) / vh;
      root.classList.add("has-pointer-light");
      if (!running) {
        running = true;
        raf = window.requestAnimationFrame(tick);
      }
    }

    function onLeaveWindow(e) {
      if (e.relatedTarget || e.toElement) return;
      root.classList.remove("has-pointer-light");
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeaveWindow, { passive: true });
    window.addEventListener("resize", setVars);

    // Initialize once so gradients don't jump from default.
    el.style.opacity = "";
    setVars();
  }

  function initMagneticMotion() {
    const mq = window.matchMedia
      ? window.matchMedia("(hover: hover) and (pointer: fine)")
      : null;
    if (!mq || !mq.matches) return;

    const els = $$(".btn, .header-cta, .filter-button, .topic-pill, .send-button");
    if (!els.length) return;

    const maxPull = perf.tier === "high" ? 14 : 10;
    const damp = perf.tier === "high" ? 0.22 : 0.18;
    const strength = perf.tier === "high" ? 0.8 : 0.65;

    els.forEach((el) => {
      let raf = 0;
      let hovering = false;
      let tx = 0;
      let ty = 0;
      let cx = 0;
      let cy = 0;

      function set(x, y) {
        el.style.setProperty("--bx", `${x.toFixed(2)}px`);
        el.style.setProperty("--by", `${y.toFixed(2)}px`);
      }

      function reset() {
        tx = 0;
        ty = 0;
        cx = 0;
        cy = 0;
        set(0, 0);
      }

      function step() {
        raf = 0;
        cx += (tx - cx) * damp;
        cy += (ty - cy) * damp;
        set(cx, cy);
        if (hovering) raf = window.requestAnimationFrame(step);
      }

      el.addEventListener("pointerenter", (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        hovering = true;
        if (!raf) raf = window.requestAnimationFrame(step);
      });

      el.addEventListener(
        "pointermove",
        (e) => {
          if (!hovering) return;
          if (e.pointerType && e.pointerType !== "mouse") return;
          const r = el.getBoundingClientRect();
          const cx0 = r.left + r.width * 0.5;
          const cy0 = r.top + r.height * 0.5;
          const dx = (e.clientX - cx0) / Math.max(1, r.width);
          const dy = (e.clientY - cy0) / Math.max(1, r.height);
          const pull = maxPull * Math.max(0.65, Math.min(1.0, Math.min(r.width, r.height) / 140));
          const nx = Math.max(-1, Math.min(1, dx * 2));
          const ny = Math.max(-1, Math.min(1, dy * 2));
          tx = nx * pull * strength;
          ty = ny * pull * strength;
          if (!raf) raf = window.requestAnimationFrame(step);
        },
        { passive: true }
      );

      el.addEventListener("pointerleave", () => {
        hovering = false;
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        reset();
      });
    });
  }

  function initClickRipples(root) {
    let lastTs = 0;
    const cooldown = perf.tier === "high" ? 40 : 85;
    const maxRipples = perf.tier === "high" ? 10 : perf.tier === "med" ? 7 : 5;

    function addRipple(x, y) {
      const vw = Math.max(1, window.innerWidth || 1);
      const vh = Math.max(1, window.innerHeight || 1);

      // Distance to farthest corner (size the ring so it fills the viewport).
      const dx = Math.max(x, vw - x);
      const dy = Math.max(y, vh - y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const size = Math.max(220, Math.min(1600, dist * 2));

      const r = document.createElement("div");
      r.className = "click-ripple";
      r.style.setProperty("--x", `${x.toFixed(2)}px`);
      r.style.setProperty("--y", `${y.toFixed(2)}px`);
      r.style.setProperty("--s", `${size.toFixed(2)}px`);

      root.appendChild(r);

      // Trim old nodes to keep DOM tiny.
      while (root.childElementCount > maxRipples) {
        const first = root.firstElementChild;
        if (!first) break;
        root.removeChild(first);
      }

      // Remove after animation.
      window.setTimeout(() => {
        if (r && r.parentNode === root) root.removeChild(r);
      }, 980);
    }

    window.addEventListener(
      "pointerdown",
      (e) => {
        const now = performance.now();
        if (now - lastTs < cooldown) return;
        lastTs = now;

        // Ignore non-primary buttons (e.g., right click).
        if (typeof e.button === "number" && e.button !== 0) return;

        addRipple(e.clientX || 0, e.clientY || 0);
      },
      { passive: true }
    );
  }

  function initAmbientFx(canvas) {
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const brand = theme.brand;
    const ink = theme.ink;
    const hazeStop = theme.rgba(theme.brandRgb, 0.055);
    const sweepStop = theme.rgba(theme.brandRgb, 0.06);

    let w = 1;
    let h = 1;
    let dpr = 1;
    let raf = 0;
    let t = 0;
    let last = -1;

    const targetFps = perf.tier === "high" ? 24 : perf.tier === "med" ? 18 : 12;
    const frameMs = 1000 / targetFps;
    const dprCap = perf.tier === "high" ? 1.5 : perf.tier === "med" ? 1.25 : 1.0;

    const pointer = { x: 0, y: 0, has: false };
    let pts = [];

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    function seed() {
      const div = perf.tier === "high" ? 28000 : perf.tier === "med" ? 36000 : 48000;
      const minN = perf.tier === "high" ? 40 : perf.tier === "med" ? 34 : 28;
      const maxN = perf.tier === "high" ? 100 : perf.tier === "med" ? 82 : 68;
      const target = clamp(Math.floor((w * h) / div), minN, maxN);
      pts = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        p: 0.25 + Math.random() * 0.85,
      }));
    }

    function resize() {
      w = Math.max(1, window.innerWidth || 1);
      h = Math.max(1, window.innerHeight || 1);
      dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    let haze = null;
    let hazeAge = 0;

    function draw(now) {
      raf = window.requestAnimationFrame(draw);
      if (last < 0) last = now;
      const dt = now - last;
      if (dt < frameMs) return;
      last = now;

      t += dt / 1000;

      ctx.clearRect(0, 0, w, h);

      // Low-contrast base haze for depth.
      ctx.globalCompositeOperation = "source-over";
      hazeAge += dt;
      if (!haze || hazeAge > 180) {
        hazeAge = 0;
        haze = ctx.createRadialGradient(
          w * (0.55 + 0.06 * Math.sin(t * 0.7)),
          h * (0.35 + 0.06 * Math.cos(t * 0.6)),
          40,
          w * 0.5,
          h * 0.5,
          Math.max(w, h) * 0.7
        );
        haze.addColorStop(0, hazeStop);
        haze.addColorStop(1, "rgba(0,0,0,0)");
      }
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);

      // Update points.
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx + Math.sin(t * 0.9 + p.p * 10) * 0.06;
        p.y += p.vy + Math.cos(t * 0.8 + p.p * 12) * 0.06;

        if (p.x < -40) p.x = w + 40;
        if (p.x > w + 40) p.x = -40;
        if (p.y < -40) p.y = h + 40;
        if (p.y > h + 40) p.y = -40;
      }

      // Connections.
      const linkMax = perf.tier === "high" ? 170 : perf.tier === "med" ? 155 : 140;
      const link = clamp(Math.min(w, h) * 0.16, 95, linkMax);
      const link2 = link * link;
      const pr = pointer.has ? link * 1.35 : 0;
      const pr2 = pr * pr;

      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.globalAlpha = 1;

      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > link2) continue;

          const base = (1 - d2 / link2) * 0.12;

          // Mouse proximity boosts brightness + shifts towards brand accent.
          let boost = 0;
          if (pointer.has) {
            const adx = a.x - pointer.x;
            const ady = a.y - pointer.y;
            const bd2 = adx * adx + ady * ady;
            if (bd2 < pr2) boost = (1 - bd2 / pr2) * 0.22;
          }

          const alpha = Math.min(0.22, base + boost);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = boost > 0.02 ? brand : ink;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Nodes.
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        let glow = 0.08;
        if (pointer.has) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const rr = link * 1.15;
          const rr2 = rr * rr;
          const d2 = dx * dx + dy * dy;
          glow += Math.max(0, 1 - d2 / rr2) * 0.22;
        }

        ctx.globalAlpha = Math.min(0.26, glow);
        ctx.fillStyle = brand;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.min(0.14, glow * 0.75);
        ctx.fillStyle = ink;
        ctx.beginPath();
        ctx.arc(p.x + 0.2, p.y + 0.2, 0.95, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Occasional scanning sweep.
      const sx = (t * 42) % (w + 220) - 220;
      ctx.globalCompositeOperation = "lighter";
      const sweep = ctx.createLinearGradient(sx, 0, sx + 220, 0);
      sweep.addColorStop(0, "rgba(0,0,0,0)");
      sweep.addColorStop(0.5, sweepStop);
      sweep.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    }

    function onMove(e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.has = true;
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    resize();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = -1;
        raf = window.requestAnimationFrame(draw);
      }
    });

    raf = window.requestAnimationFrame(draw);
  }

  function initHeroFx(canvas) {
    const hero = canvas.closest(".hero") || canvas.parentElement;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!hero || !ctx) return;

    const brand = theme.brand;
    const ink = theme.ink;
    const fadeFill = theme.rgba(theme.canvasRgb, 0.085);

    let w = 1;
    let h = 1;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    let t = 0;
    let last = -1;
    let running = true;

    const targetFps = perf.tier === "high" ? 36 : perf.tier === "med" ? 30 : 22;
    const frameMs = 1000 / targetFps;
    const dprCap = perf.tier === "high" ? 1.75 : perf.tier === "med" ? 1.5 : 1.25;
    const influence = perf.tier === "high" ? 180 : perf.tier === "med" ? 170 : 150;
    const drawWhite = perf.tier === "high";
    const showNodes = perf.tier !== "low";
    const nodeEvery = perf.tier === "high" ? 4 : perf.tier === "med" ? 6 : 9;
    const nodeSize = perf.tier === "high" ? 1.35 : perf.tier === "med" ? 1.15 : 0.95;

    const pointer = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      down: false,
      has: false,
    };

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    function noise(x, y, tt) {
      // Cheap "flowy" scalar field; good enough for curl-like motion.
      const a = 0.0021;
      const b = 0.0019;
      const c = 0.0012;
      return (
        Math.sin(x * a + tt * 0.0011) +
        Math.cos(y * b - tt * 0.0013) +
        Math.sin((x + y) * c + tt * 0.0007)
      );
    }

    function curl(x, y, tt) {
      const e = 1.35;
      const n1 = noise(x, y + e, tt);
      const n2 = noise(x, y - e, tt);
      const a = (n1 - n2) / (2 * e);
      const n3 = noise(x + e, y, tt);
      const n4 = noise(x - e, y, tt);
      const b = (n3 - n4) / (2 * e);
      // Rotated gradient => swirling vector field.
      return { x: a, y: -b };
    }

    function reseed() {
      const div = perf.tier === "high" ? 4200 : perf.tier === "med" ? 5600 : 7600;
      const minN = perf.tier === "high" ? 220 : perf.tier === "med" ? 170 : 120;
      const maxN = perf.tier === "high" ? 720 : perf.tier === "med" ? 520 : 420;
      const target = clamp(Math.floor((w * h) / div), minN, maxN);
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        s: 0.35 + Math.random() * 0.9,
      }));

      pointer.x = w * 0.32;
      pointer.y = h * 0.46;
    }

    function resize() {
      const r = hero.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      reseed();
    }

    function burst(px, py) {
      for (let i = 0; i < 18; i++) {
        const ang = (i / 18) * Math.PI * 2;
        const sp = 2.4 + Math.random() * 2.0;
        particles.push({
          x: px + (Math.random() - 0.5) * 18,
          y: py + (Math.random() - 0.5) * 18,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          s: 0.8 + Math.random() * 1.2,
        });
      }
      if (particles.length > 1100) particles.splice(0, particles.length - 1100);
    }

    function draw(now) {
      if (!running) return;
      raf = window.requestAnimationFrame(draw);
      if (last < 0) last = now;
      const dt = now - last;
      if (dt < frameMs) return;
      last = now;

      t += dt;

      // Fade previous frame (trail effect).
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fadeFill;
      ctx.fillRect(0, 0, w, h);

      // Draw new strokes (keep it subtle on the light theme).
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Slowly drift the pointer if the user isn't interacting.
      if (!pointer.has) {
        pointer.x = w * (0.38 + 0.08 * Math.sin(t * 0.00035));
        pointer.y = h * (0.46 + 0.12 * Math.cos(t * 0.00028));
      }

      // Avoid per-particle string allocations; use globalAlpha + fixed colors.
      ctx.strokeStyle = brand;
      ctx.lineWidth = 1.2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const ox = p.x;
        const oy = p.y;

        const v = curl(p.x, p.y, t);
        p.vx += v.x * 0.55 * p.s;
        p.vy += v.y * 0.55 * p.s;

        // Pointer interaction (swirl/pull).
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < influence * influence) {
          const d = Math.sqrt(d2) || 1;
          const pull = (1 - d / influence) * (pointer.down ? 1.8 : 1.0);
          // Add a tangential component for "fluid" rotation.
          p.vx += (-dy / d) * pull * 0.65 + (dx / d) * pull * 0.12;
          p.vy += (dx / d) * pull * 0.65 + (dy / d) * pull * 0.12;
        }

        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap.
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Two-tone strokes: brand + ink.
        const a = 0.10 + Math.min(0.22, Math.abs(p.vx) + Math.abs(p.vy)) * 0.08;

        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (drawWhite) {
          ctx.globalAlpha = a * 0.55;
          ctx.strokeStyle = ink;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(ox + 0.4, oy + 0.2);
          ctx.lineTo(p.x + 0.4, p.y + 0.2);
          ctx.stroke();
          ctx.strokeStyle = brand;
        }

        // Glowing nodes (sampled for performance).
        if (showNodes && i % nodeEvery === 0) {
          const spd = Math.abs(p.vx) + Math.abs(p.vy);
          const g = Math.min(0.42, 0.12 + spd * 0.08);
          ctx.globalAlpha = g;
          ctx.fillStyle = brand;
          ctx.beginPath();
          ctx.arc(p.x, p.y, nodeSize + p.s * 0.28, 0, Math.PI * 2);
          ctx.fill();

          if (drawWhite) {
            ctx.globalAlpha = g * 0.5;
            ctx.fillStyle = ink;
            ctx.beginPath();
            ctx.arc(p.x + 0.4, p.y + 0.2, nodeSize * 0.78, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function setPointerFromEvent(e) {
      const r = hero.getBoundingClientRect();
      const x = clamp(e.clientX - r.left, 0, r.width);
      const y = clamp(e.clientY - r.top, 0, r.height);
      pointer.dx = x - pointer.x;
      pointer.dy = y - pointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.has = true;

      // Feed a subtle "spotlight" position into CSS for the hero + portrait gloss.
      hero.style.setProperty("--hx", `${((x / Math.max(1, r.width)) * 100).toFixed(2)}%`);
      hero.style.setProperty("--hy", `${((y / Math.max(1, r.height)) * 100).toFixed(2)}%`);
    }

    hero.addEventListener(
      "pointermove",
      (e) => {
        setPointerFromEvent(e);
      },
      { passive: true }
    );

    hero.addEventListener("pointerleave", () => {
      pointer.has = false;
      pointer.down = false;
    });

    hero.addEventListener("pointerdown", (e) => {
      pointer.down = true;
      setPointerFromEvent(e);
      burst(pointer.x, pointer.y);
    });

    window.addEventListener("pointerup", () => {
      pointer.down = false;
    });

    // Keep the canvas aligned to the hero section.
    const ro = new ResizeObserver(() => resize());
    ro.observe(hero);
    window.addEventListener("resize", resize);
    resize();

    // Pause animation in background tabs.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        running = true;
        raf = window.requestAnimationFrame(draw);
      }
    });

    // Pause when the hero isn't visible (big CPU saver on scroll).
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const e = entries && entries[0];
          const vis = !!(e && e.isIntersecting);
          if (!vis) {
            running = false;
            window.cancelAnimationFrame(raf);
            raf = 0;
          } else if (!running) {
            running = true;
            last = -1;
            raf = window.requestAnimationFrame(draw);
          }
        },
        { threshold: 0.06 }
      );
      io.observe(hero);
    }

    raf = window.requestAnimationFrame(draw);
  }
})();
