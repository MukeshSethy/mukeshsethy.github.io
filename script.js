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

  // Futuristic hero FX: interactive flow-field trails (canvas).
  const heroFxCanvas = $("#hero-fx");
  if (heroFxCanvas && !prefersReducedMotion) {
    initHeroFx(heroFxCanvas);
  }

  // Pointer-reactive 3D tilt + glare for cards.
  if (!prefersReducedMotion) {
    initTiltCards();
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

  function initHeroFx(canvas) {
    const hero = canvas.closest(".hero") || canvas.parentElement;
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!hero || !ctx) return;

    let w = 1;
    let h = 1;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    let t = 0;

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
      const target = clamp(Math.floor((w * h) / 3200), 260, 860);
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
      dpr = Math.min(2, window.devicePixelRatio || 1);
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

    function draw() {
      raf = window.requestAnimationFrame(draw);
      t += 16;

      // Fade previous frame (trail effect).
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.065)";
      ctx.fillRect(0, 0, w, h);

      // Draw new strokes additively.
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Slowly drift the pointer if the user isn't interacting.
      if (!pointer.has) {
        pointer.x = w * (0.38 + 0.08 * Math.sin(t * 0.00035));
        pointer.y = h * (0.46 + 0.12 * Math.cos(t * 0.00028));
      }

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
        if (d2 < 180 * 180) {
          const d = Math.sqrt(d2) || 1;
          const pull = (1 - d / 180) * (pointer.down ? 1.8 : 1.0);
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

        // Two-tone strokes: red + cool white.
        const a = 0.10 + Math.min(0.22, Math.abs(p.vx) + Math.abs(p.vy)) * 0.08;

        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(225,26,39,${a})`;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.lineWidth = 0.9;
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.55})`;
        ctx.beginPath();
        ctx.moveTo(ox + 0.4, oy + 0.2);
        ctx.lineTo(p.x + 0.4, p.y + 0.2);
        ctx.stroke();
      }
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
        draw();
      }
    });

    draw();
  }
})();
