/* CvSU-CCAT GAD Corner - dynamic front-end
   Renders the entire site from /api/content following the PCW MC 2025-05
   Annex B suggested wireframe. */

const app = document.getElementById("app");

/* ---------- tiny hyperscript helper ---------- */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") {
      Object.assign(node.dataset, value);
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/* ---------- helpers ---------- */
const enc = (p) => (p ? encodeURI(p) : p);

function fileExt(p) {
  const m = /\.([a-z0-9]+)(?:\?|$)/i.exec(p || "");
  return m ? m[1].toUpperCase() : "FILE";
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

function fmtSize(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/* download-chip used across sections */
function downloadChip(item) {
  if (!item || !item.file) return null;
  return el("a", { class: "dl-chip", href: enc(item.file), target: "_blank", rel: "noopener", download: "" }, [
    el("span", { class: "dl-ext" }, fileExt(item.file)),
    el("span", { class: "dl-chip-text" }, [
      el("strong", {}, item.title || "Download"),
      item.description ? el("small", {}, item.description) : null,
    ]),
    el("span", { class: "dl-arrow", "aria-hidden": "true" }, "\u2193"),
  ]);
}

/* ---------- state ---------- */
let content = null;

/* ================= TOPBAR ================= */
function renderTopbar(site) {
  return el("div", { class: "topbar" }, [
    el("div", { class: "container topbar-inner" }, [
      el("div", { class: "topbar-left" }, [
        el("span", { class: "gov-seal", "aria-hidden": "true" }, "\uD83C\uDF10"),
        el("span", {}, site.republic || "Republic of the Philippines"),
      ]),
      el("div", { class: "topbar-right" }, [
        el("form", {
          class: "search",
          role: "search",
          onsubmit: (e) => {
            e.preventDefault();
            runSearch(e.target.q.value);
          },
        }, [
          el("input", { type: "search", name: "q", placeholder: "Search the GAD Corner\u2026", "aria-label": "Search" }),
          el("button", { type: "submit", "aria-label": "Search" }, "\uD83D\uDD0D"),
        ]),
        el("div", { class: "a11y", role: "group", "aria-label": "Accessibility options" }, [
          el("button", { type: "button", class: "a11y-btn", title: "Decrease text size", onclick: () => setFontScale(-1) }, "A-"),
          el("button", { type: "button", class: "a11y-btn", title: "Increase text size", onclick: () => setFontScale(1) }, "A+"),
          el("button", { type: "button", class: "a11y-btn contrast", title: "Toggle high contrast", onclick: toggleContrast }, "\u25D1"),
        ]),
      ]),
    ]),
  ]);
}

/* ================= HEADER + NAV ================= */
function renderHeader(data) {
  const site = data.site;
  const years = [...new Set([
    ...(data.paps || []).map((p) => p.year),
    ...(data.accomplishments || []).map((a) => a.year),
  ].filter(Boolean))].sort((a, b) => b.localeCompare(a));

  const nav = el("nav", { class: "primary-nav", id: "primary-nav", "aria-label": "Primary" }, [
    el("a", { href: "#home", class: "nav-link" }, "Home"),
    dropdown("About Us", [
      ["Vision and Mission", "#about"],
      ["Services Offered", "#services"],
      ["Organizational Structure", "#gfps"],
      ["GAD Committee", "#gfps"],
      ["Contact Us", "#contact"],
    ]),
    dropdown("Policies and Reports", [
      ["Policies & Issuances", "#policies"],
      ["GAD Plan and Budget", "#plans"],
      ["Accomplishment Reports", "#reports"],
      ["Knowledge Base", "#knowledge"],
    ]),
    dropdown("Projects", (years.length ? years : ["2025"]).map((y) => [y, "#paps"])),
    el("a", { href: "#downloads", class: "nav-link" }, "Downloads"),
    el("a", { href: "#feedback", class: "nav-link nav-cta" }, "Feedback"),
  ]);

  return el("header", { class: "site-header", id: "top" }, [
    renderTopbar(site),
    el("div", { class: "masthead" }, [
      el("div", { class: "container masthead-inner" }, [
        el("a", { class: "brand", href: "#home", "aria-label": "GAD Corner home" }, [
          el("span", { class: "brand-mark", "aria-hidden": "true" }, "GAD"),
          el("span", { class: "brand-text" }, [
            el("small", {}, site.republic || "Republic of the Philippines"),
            el("strong", {}, `${site.agencyName || "Cavite State University"}${site.campus ? " \u2013 " + site.campus : ""}`),
            el("span", { class: "brand-corner" }, site.cornerName || "Gender and Development (GAD) Corner"),
          ]),
        ]),
        el("button", {
          class: "menu-toggle",
          type: "button",
          "aria-expanded": "false",
          "aria-controls": "primary-nav",
          "aria-label": "Open navigation",
          onclick: toggleMenu,
        }, [el("span"), el("span"), el("span")]),
      ]),
    ]),
    el("div", { class: "nav-bar" }, [el("div", { class: "container" }, [nav])]),
  ]);
}

function dropdown(label, items) {
  const id = "dd-" + label.toLowerCase().replace(/[^a-z]+/g, "-");
  return el("div", { class: "nav-item has-dd" }, [
    el("button", {
      class: "nav-link dd-toggle",
      type: "button",
      "aria-expanded": "false",
      "aria-controls": id,
      onclick: (e) => {
        const open = e.currentTarget.getAttribute("aria-expanded") === "true";
        document.querySelectorAll(".dd-toggle[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
        e.currentTarget.setAttribute("aria-expanded", String(!open));
      },
    }, [label, el("span", { class: "caret", "aria-hidden": "true" }, "\u25BE")]),
    el("div", { class: "dd-menu", id }, items.map(([text, href]) =>
      el("a", { href, class: "dd-link", onclick: closeMenu }, text)
    )),
  ]);
}

/* ================= HERO CAROUSEL ================= */
let carouselTimer = null;
function renderHero(slides) {
  if (!slides || !slides.length) return null;
  const track = el("div", { class: "carousel-track" },
    slides.map((s, i) =>
      el("div", { class: "slide" + (i === 0 ? " active" : ""), dataset: { index: i } }, [
        s.image ? el("img", { src: enc(s.image), alt: s.title || "GAD activity", loading: i === 0 ? "eager" : "lazy" }) : null,
        el("div", { class: "slide-overlay" }, [
          el("div", { class: "container slide-caption" }, [
            el("span", { class: "slide-badge" }, "GAD Activities & Announcements"),
            el("h2", {}, s.title || ""),
            s.caption ? el("p", {}, s.caption) : null,
            s.link ? el("a", { class: "button button-primary", href: s.link }, "Learn more") : null,
          ]),
        ]),
      ])
    )
  );

  const dots = el("div", { class: "carousel-dots", role: "tablist", "aria-label": "Slides" },
    slides.map((_, i) =>
      el("button", {
        class: "dot" + (i === 0 ? " active" : ""),
        type: "button",
        "aria-label": `Go to slide ${i + 1}`,
        onclick: () => goToSlide(i),
      })
    )
  );

  const hero = el("section", { class: "hero-carousel", id: "home", "aria-label": "GAD activities and announcements" }, [
    track,
    el("button", { class: "carousel-nav prev", type: "button", "aria-label": "Previous slide", onclick: () => shiftSlide(-1) }, "\u2039"),
    el("button", { class: "carousel-nav next", type: "button", "aria-label": "Next slide", onclick: () => shiftSlide(1) }, "\u203A"),
    dots,
  ]);
  return hero;
}

let currentSlide = 0;
function goToSlide(i) {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = [...document.querySelectorAll(".carousel-dots .dot")];
  if (!slides.length) return;
  currentSlide = (i + slides.length) % slides.length;
  slides.forEach((s, idx) => s.classList.toggle("active", idx === currentSlide));
  dots.forEach((d, idx) => d.classList.toggle("active", idx === currentSlide));
  resetCarouselTimer();
}
function shiftSlide(dir) { goToSlide(currentSlide + dir); }
function resetCarouselTimer() {
  if (carouselTimer) clearInterval(carouselTimer);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    carouselTimer = setInterval(() => shiftSlide(1), 6000);
  }
}

/* ================= HOME GRID (quick links + latest news) ================= */
function renderHomeGrid(data) {
  const quick = el("div", { class: "quick-links" }, [
    quickCard("GAD Plan and Budget / Accomplishment Report", "Plans, budgets, and accomplishment reports.", "#plans", "\uD83D\uDCC8"),
    quickCard("GAD Projects", "Programs, activities, and projects (PAPs).", "#paps", "\uD83E\uDD1D"),
    quickCard("GAD Knowledgebase", "Laws, policies, IEC, and knowledge products.", "#knowledge", "\uD83D\uDCDA"),
  ]);

  const news = (data.news || []).slice(0, 3);
  const newsCol = el("div", { class: "latest-news" }, [
    el("div", { class: "latest-head" }, [
      el("h2", {}, "Latest News"),
      el("a", { href: "#news", class: "text-link" }, ["View all ", el("span", { "aria-hidden": "true" }, "\u2192")]),
    ]),
    ...news.map((n) => {
      const imgs = newsImages(n);
      const item = el("article", { class: "news-item", role: "button", tabindex: "0", "aria-label": "Read: " + (n.title || "news item") }, [
        el("div", { class: "news-thumb" }, [
          imgs[0]
            ? el("img", { src: enc(imgs[0]), alt: n.title, loading: "lazy" })
            : el("span", { class: "thumb-fallback", "aria-hidden": "true" }, "IMG"),
          imgs.length > 1 ? el("span", { class: "photo-badge sm" }, [el("span", { "aria-hidden": "true" }, "\uD83D\uDCF7"), " " + imgs.length]) : null,
        ]),
        el("div", { class: "news-body" }, [
          el("h3", {}, n.title),
          el("p", { class: "news-date" }, fmtDate(n.date)),
          el("p", { class: "news-excerpt" }, n.excerpt || ""),
          el("span", { class: "view-more" }, "View more"),
        ]),
      ]);
      const open = () => openNewsModal(n);
      item.addEventListener("click", open);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
      return item;
    }),
  ]);

  return el("section", { class: "home-grid", "aria-label": "Highlights" }, [
    el("div", { class: "container home-grid-inner" }, [quick, newsCol]),
  ]);
}

function quickCard(title, desc, href, icon) {
  return el("a", { class: "quick-card", href }, [
    el("span", { class: "quick-icon", "aria-hidden": "true" }, icon),
    el("span", { class: "quick-text" }, [el("strong", {}, title), el("small", {}, desc)]),
    el("span", { class: "quick-arrow", "aria-hidden": "true" }, "\u2192"),
  ]);
}

/* ================= SECTION SCAFFOLD ================= */
function section(id, eyebrow, title, intro, body, opts = {}) {
  return el("section", { class: "section" + (opts.alt ? " section-alt" : ""), id }, [
    el("div", { class: "container" }, [
      el("div", { class: "section-head" }, [
        el("p", { class: "eyebrow" }, [el("span"), eyebrow]),
        el("h2", {}, title),
        intro ? el("p", { class: "section-intro" }, intro) : null,
      ]),
      body,
    ]),
  ]);
}

/* ---- About ---- */
function renderAbout(data) {
  const a = data.about || {};
  const body = el("div", { class: "about-grid" }, [
    aboutCard("Vision", a.vision),
    aboutCard("Mission", a.mission),
    aboutCard("GAD Committee", a.committee),
  ]);
  return section("about", "About Us", "Vision, Mission & Mandate",
    data.site.tagline, body);
}
function aboutCard(label, text) {
  return el("div", { class: "about-card" }, [
    el("span", { class: "about-label" }, label),
    el("p", {}, text || ""),
  ]);
}

/* ---- Services Offered ---- */
function renderServices(data) {
  const svc = data.services || {};
  const items = svc.items || [];
  if (!items.length) return null;
  const body = el("div", { class: "services-grid" }, items.map((s, i) => {
    const blocks = [];
    if (s.trainingOn && s.trainingOn.length) {
      blocks.push(el("div", { class: "svc-block" }, [
        el("span", { class: "svc-block-label" }, "Seminar / Workshop / Training on:"),
        el("ul", { class: "svc-list" }, s.trainingOn.map((t) => el("li", {}, t))),
      ]));
    }
    if (s.orientationOn && s.orientationOn.length) {
      blocks.push(el("div", { class: "svc-block" }, [
        el("span", { class: "svc-block-label" }, "Orientation on:"),
        el("ul", { class: "svc-list" }, s.orientationOn.map((t) => el("li", {}, t))),
      ]));
    }
    return el("article", { class: "service-card" + (blocks.length ? " service-card-wide" : "") }, [
      el("div", { class: "service-head" }, [
        el("span", { class: "service-num" }, String(i + 1).padStart(2, "0")),
        el("h3", {}, s.title || ""),
      ]),
      s.note ? el("p", { class: "service-note" }, s.note) : null,
      ...blocks,
    ]);
  }));
  return section("services", "Services Offered", "What the GAD Office Offers",
    svc.intro || null, body, { alt: true });
}

/* ---- News ---- */
/* Collect every image tied to a news item: cover image + gallery (array of
   URL strings or {image} objects), de-duplicated and in order. */
function newsImages(n) {
  const imgs = [];
  if (n.image) imgs.push(n.image);
  (n.gallery || []).forEach((g) => {
    const url = typeof g === "string" ? g : g && g.image;
    if (url && !imgs.includes(url)) imgs.push(url);
  });
  return imgs;
}

function newsCard(n) {
  const imgs = newsImages(n);
  const card = el(
    "article",
    {
      class: "card news-card",
      role: "button",
      tabindex: "0",
      "aria-label": "Read: " + (n.title || "news item"),
      dataset: { search: (n.title + " " + (n.excerpt || "") + " " + (n.body || "")).toLowerCase() },
    },
    [
      el("div", { class: "card-media" }, [
        imgs[0]
          ? el("img", { src: enc(imgs[0]), alt: n.title || "", loading: "lazy" })
          : el("span", { class: "thumb-fallback" }, "IMG"),
        imgs.length > 1
          ? el("span", { class: "photo-badge" }, [
              el("span", { class: "photo-badge-icon", "aria-hidden": "true" }, "\uD83D\uDCF7"),
              imgs.length + " photos",
            ])
          : null,
      ]),
      el("div", { class: "card-content" }, [
        el("p", { class: "news-date" }, fmtDate(n.date)),
        el("h3", {}, n.title),
        el("p", { class: "news-excerpt" }, n.excerpt || n.body || ""),
        el("span", { class: "view-more" }, ["Read more ", el("span", { "aria-hidden": "true" }, "\u2192")]),
      ]),
    ]
  );
  const open = () => openNewsModal(n);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return card;
}

function renderNews(data) {
  const body = el("div", { class: "cards-grid news-grid", id: "news-grid" },
    (data.news || []).map((n) => newsCard(n))
  );
  return section("news", "News & Announcements", "Latest GAD News and Announcements",
    "Upcoming activities, recently conducted programs, and other relevant updates. Click any item to read the full story and view photos.", body);
}

/* ---- News detail modal (full text + photo gallery) ---- */
let galleryImgs = [];
let galleryIndex = 0;

function ensureNewsModal() {
  let modal = document.getElementById("news-modal");
  if (modal) return modal;
  modal = el(
    "div",
    { class: "news-modal", id: "news-modal", role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "news-modal-title" },
    [
      el("div", { class: "news-modal-backdrop", "data-close": "1" }),
      el("div", { class: "news-modal-panel", role: "document" }, [
        el("button", { class: "news-modal-close", type: "button", "aria-label": "Close", "data-close": "1" }, "\u2715"),
        el("div", { class: "news-modal-gallery", id: "news-modal-gallery" }),
        el("div", { class: "news-modal-body" }, [
          el("p", { class: "news-date", id: "news-modal-date" }),
          el("h2", { id: "news-modal-title" }),
          el("div", { class: "news-modal-text", id: "news-modal-text" }),
          el("div", { class: "news-modal-link", id: "news-modal-link" }),
        ]),
      ]),
    ]
  );
  modal.addEventListener("click", (e) => {
    if (e.target.dataset && e.target.dataset.close) closeNewsModal();
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeNewsModal();
    else if (e.key === "ArrowLeft") shiftGallery(-1);
    else if (e.key === "ArrowRight") shiftGallery(1);
  });
  document.body.appendChild(modal);
  return modal;
}

function renderGallery(imgs, title) {
  const gallery = document.getElementById("news-modal-gallery");
  gallery.innerHTML = "";
  galleryImgs = imgs;
  galleryIndex = 0;
  if (!imgs.length) {
    gallery.style.display = "none";
    return;
  }
  gallery.style.display = "";
  const main = el("div", { class: "gallery-main" }, [
    el("img", { id: "gallery-main-img", src: enc(imgs[0]), alt: title || "" }),
    imgs.length > 1 ? el("button", { class: "gallery-nav prev", type: "button", "aria-label": "Previous photo", onclick: () => shiftGallery(-1) }, "\u2039") : null,
    imgs.length > 1 ? el("button", { class: "gallery-nav next", type: "button", "aria-label": "Next photo", onclick: () => shiftGallery(1) }, "\u203A") : null,
    imgs.length > 1 ? el("span", { class: "gallery-count", id: "gallery-count" }, "1 / " + imgs.length) : null,
  ]);
  gallery.appendChild(main);
  if (imgs.length > 1) {
    const thumbs = el("div", { class: "gallery-thumbs", id: "gallery-thumbs" },
      imgs.map((src, i) =>
        el("button", { class: "gallery-thumb" + (i === 0 ? " active" : ""), type: "button", "aria-label": "Photo " + (i + 1), onclick: () => setGallery(i) },
          el("img", { src: enc(src), alt: "", loading: "lazy" })
        )
      )
    );
    gallery.appendChild(thumbs);
  }
}

function setGallery(i) {
  if (!galleryImgs.length) return;
  galleryIndex = (i + galleryImgs.length) % galleryImgs.length;
  const img = document.getElementById("gallery-main-img");
  if (img) img.src = enc(galleryImgs[galleryIndex]);
  const count = document.getElementById("gallery-count");
  if (count) count.textContent = galleryIndex + 1 + " / " + galleryImgs.length;
  document.querySelectorAll("#gallery-thumbs .gallery-thumb").forEach((t, idx) => t.classList.toggle("active", idx === galleryIndex));
}

function shiftGallery(d) {
  setGallery(galleryIndex + d);
}

function openNewsModal(n) {
  const modal = ensureNewsModal();
  renderGallery(newsImages(n), n.title);
  document.getElementById("news-modal-date").textContent = fmtDate(n.date);
  document.getElementById("news-modal-title").textContent = n.title || "";
  const textWrap = document.getElementById("news-modal-text");
  textWrap.innerHTML = "";
  const bodyText = n.body || n.excerpt || "";
  const paras = bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  (paras.length ? paras : [""]).forEach((p) => textWrap.appendChild(el("p", {}, p)));
  const linkWrap = document.getElementById("news-modal-link");
  linkWrap.innerHTML = "";
  if (n.link) linkWrap.appendChild(el("a", { class: "button button-outline", href: n.link, target: "_blank", rel: "noopener" }, ["Visit link ", el("span", { "aria-hidden": "true" }, "\u2197")]));
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const closeBtn = modal.querySelector(".news-modal-close");
  if (closeBtn) closeBtn.focus();
}

function closeNewsModal() {
  const modal = document.getElementById("news-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

/* ---- Agenda ---- */
function renderAgenda(data) {
  const ag = data.agenda || {};
  const body = el("div", { class: "agenda-box" }, [
    el("p", { class: "agenda-lead" }, ag.body || ""),
    el("ul", { class: "agenda-list" }, (ag.points || []).map((p) => el("li", {}, p))),
    downloadChip(ag),
  ]);
  return section("agenda", "GAD Agenda", ag.title || "GAD Agenda", null, body, { alt: true });
}

/* ---- PAPs (Projects) ---- */
function renderPaps(data) {
  const body = el("div", { class: "cards-grid" },
    (data.paps || []).map((p) =>
      el("article", { class: "card pap-card" }, [
        el("div", { class: "card-media" }, p.image
          ? el("img", { src: enc(p.image), alt: p.title, loading: "lazy" })
          : el("span", { class: "thumb-fallback" }, "IMG")),
        el("div", { class: "card-content" }, [
          el("div", { class: "tag-row" }, [
            p.category ? el("span", { class: "pill" }, p.category) : null,
            p.year ? el("span", { class: "pill pill-year" }, p.year) : null,
          ]),
          el("h3", {}, p.title),
          el("p", {}, p.description || ""),
          downloadChip(p),
        ]),
      ])
    )
  );
  return section("paps", "GAD PAPs", "Programs, Activities & Projects",
    "GAD programs, activities, and projects implemented by the campus.", body);
}

/* ---- Plans & Budget + Strategic plan ---- */
function renderPlans(data) {
  const sp = data.strategicPlan || {};
  const items = [];
  if (sp.file || sp.image) {
    items.push(featureDoc(sp.title, sp.description, sp.image, sp.file));
  }
  (data.gpb || []).forEach((g) => items.push(featureDoc(g.title, g.description, g.image, g.file, g.year)));
  const body = el("div", { class: "doc-grid" }, items);
  return section("plans", "GAD Plan & Budget", "GAD Plans and Budget",
    "Approved GAD Plans and Budget (GPB) and strategic plans.", body, { alt: true });
}

/* ---- Reports: AR + Estado ni Juana ---- */
function renderReports(data) {
  const arCards = (data.accomplishments || []).map((a) =>
    featureDoc(a.title, a.description, a.image, a.file, a.year));
  const esj = data.estadoNiJuana || {};
  const body = el("div", {}, [
    el("div", { class: "doc-grid" }, arCards),
    (esj.body || esj.file) ? el("div", { class: "esj-box" }, [
      el("h3", {}, esj.title || "Estado ni Juana Report"),
      el("p", {}, esj.body || ""),
      downloadChip(esj),
    ]) : null,
  ]);
  return section("reports", "GAD Accomplishments", "Accomplishment Reports",
    "Signed GAD Accomplishment Reports and the Estado ni Juana Report.", body);
}

function featureDoc(title, desc, image, file, badge) {
  return el("article", { class: "doc-card" }, [
    el("div", { class: "doc-media" }, image
      ? el("img", { src: enc(image), alt: title, loading: "lazy" })
      : el("span", { class: "doc-ext-big" }, file ? fileExt(file) : "DOC")),
    el("div", { class: "doc-content" }, [
      badge ? el("span", { class: "pill pill-year" }, badge) : null,
      el("h3", {}, title || ""),
      desc ? el("p", {}, desc) : null,
      file ? el("a", { class: "button button-outline", href: enc(file), target: "_blank", rel: "noopener", download: "" },
        ["Download ", el("span", { "aria-hidden": "true" }, "\u2193")]) : null,
    ]),
  ]);
}

/* ---- Knowledge base ---- */
function renderKnowledge(data) {
  const k = data.knowledge || {};
  const group = (label, items) => (items && items.length)
    ? el("div", { class: "kb-group" }, [
        el("h3", { class: "kb-title" }, label),
        el("div", { class: "cards-grid" }, items.map((it) =>
          el("article", { class: "card kb-card" }, [
            it.image ? el("div", { class: "card-media" }, el("img", { src: enc(it.image), alt: it.title, loading: "lazy" })) : null,
            el("div", { class: "card-content" }, [
              el("h4", {}, it.title),
              it.description ? el("p", {}, it.description) : null,
              downloadChip(it),
            ]),
          ])
        )),
      ])
    : null;

  const stats = (k.genderStats && k.genderStats.length)
    ? el("div", { class: "kb-group" }, [
        el("h3", { class: "kb-title" }, "Gender Statistics"),
        el("div", { class: "stat-grid" }, k.genderStats.map((s) =>
          el("div", { class: "stat-card" }, [
            el("strong", {}, s.value || ""),
            el("span", { class: "stat-label" }, s.label || ""),
            s.note ? el("small", {}, s.note) : null,
          ])
        )),
      ])
    : null;

  const body = el("div", { class: "kb-wrap" }, [
    group("GAD-related Laws", k.laws),
    group("Policies & Issuances", k.policies),
    stats,
    group("Modules & Tools", k.modules),
  ]);
  return section("knowledge", "Knowledge Products & IEC", "GAD Knowledge Base",
    "GAD-related laws, policies, gender statistics, and IEC materials.", body);
}

/* ---- Policies & Issuances ---- */
function renderPolicies(data) {
  const p = data.policies || {};
  const table = (label, rows) => (rows && rows.length)
    ? el("div", { class: "policy-block" }, [
        el("h3", {}, label),
        el("ul", { class: "policy-list" }, rows.map((r) =>
          el("li", {}, [
            el("div", {}, [
              el("strong", {}, r.title),
              r.date ? el("small", {}, fmtDate(r.date)) : null,
              r.description ? el("p", {}, r.description) : null,
            ]),
            r.file ? el("a", { class: "dl-mini", href: enc(r.file), target: "_blank", rel: "noopener", download: "" },
              [fileExt(r.file), " \u2193"]) : null,
          ])
        )),
      ])
    : null;

  const body = el("div", { class: "policy-grid" }, [
    table("Circulars", p.circulars),
    table("Resolutions", p.resolutions),
    table("Memoranda", p.memoranda),
    table("Office Orders", p.officeOrders),
  ]);
  return section("policies", "Policies and Reports", "Policies & Issuances",
    "Circulars, resolutions, memoranda, and office orders on Gender and Development.", body, { alt: true });
}

/* ---- GFPS org structure ---- */
function renderGfps(data) {
  const g = data.gfps || {};
  const body = el("div", { class: "gfps-wrap" }, [
    (g.chartImage || g.chartFile) ? el("div", { class: "gfps-chart" }, [
      g.chartImage ? el("img", { src: enc(g.chartImage), alt: "GFPS organizational chart", loading: "lazy" }) : null,
      g.chartFile ? el("a", { class: "button button-outline", href: enc(g.chartFile), target: "_blank", rel: "noopener", download: "" }, "Download org chart") : null,
    ]) : null,
    el("div", { class: "member-grid" }, (g.members || []).map((m) =>
      el("div", { class: "member-card" }, [
        el("div", { class: "member-avatar", "aria-hidden": "true" }, (m.name || "?").trim().charAt(0)),
        el("div", {}, [
          el("strong", {}, m.name || ""),
          el("span", { class: "member-role" }, m.role || ""),
          m.unit ? el("small", {}, m.unit) : null,
          m.email ? el("a", { class: "member-email", href: "mailto:" + m.email }, m.email) : null,
        ]),
      ])
    )),
  ]);
  return section("gfps", "Organizational Structure", "GAD Focal Point System (GFPS)",
    "The GFPS manages and updates the GAD Corner and leads gender mainstreaming efforts.", body);
}

/* ---- Awards & Partnerships ---- */
function renderAwards(data) {
  if (!(data.awards && data.awards.length)) return null;
  const body = el("div", { class: "cards-grid" }, data.awards.map((a) =>
    el("article", { class: "card" }, [
      a.image ? el("div", { class: "card-media" }, el("img", { src: enc(a.image), alt: a.title, loading: "lazy" })) : null,
      el("div", { class: "card-content" }, [
        el("h3", {}, a.title),
        a.year ? el("span", { class: "pill pill-year" }, a.year) : null,
        a.description ? el("p", {}, a.description) : null,
      ]),
    ])
  ));
  return section("awards", "Recognition", "Awards & Recognitions", null, body, { alt: true });
}

function renderPartnerships(data) {
  if (!(data.partnerships && data.partnerships.length)) return null;
  const body = el("div", { class: "cards-grid" }, data.partnerships.map((p) =>
    el("article", { class: "card" }, [
      p.image ? el("div", { class: "card-media" }, el("img", { src: enc(p.image), alt: p.title, loading: "lazy" })) : null,
      el("div", { class: "card-content" }, [
        el("h3", {}, p.title),
        p.description ? el("p", {}, p.description) : null,
        downloadChip(p),
      ]),
    ])
  ));
  return section("partnerships", "Partnerships", "GAD Partnerships & Joint Programs", null, body);
}

/* ---- Downloads (all files visible) ---- */
function renderDownloads(data) {
  const items = collectDownloads(data);
  const body = el("div", {}, [
    el("div", { class: "downloads-toolbar" }, [
      el("input", {
        type: "search",
        id: "dl-filter",
        placeholder: "Filter downloadable files\u2026",
        "aria-label": "Filter downloads",
        oninput: (e) => filterDownloads(e.target.value),
      }),
      el("span", { class: "downloads-count", id: "dl-count" }, `${items.length} files`),
    ]),
    el("div", { class: "downloads-list", id: "downloads-list" }, items.map((it) =>
      el("a", {
        class: "download-row",
        href: enc(it.file),
        target: "_blank",
        rel: "noopener",
        download: "",
        dataset: { search: (it.title + " " + (it.category || "")).toLowerCase() },
      }, [
        el("span", { class: "dl-ext" }, fileExt(it.file)),
        el("span", { class: "download-meta" }, [
          el("strong", {}, it.title),
          el("small", {}, it.category || ""),
        ]),
        el("span", { class: "download-cta" }, ["Download ", el("span", { "aria-hidden": "true" }, "\u2193")]),
      ])
    )),
  ]);
  return section("downloads", "Downloadable Files", "Downloads & Resources",
    "All GAD documents, plans, reports, and IEC materials in one place.", body, { alt: true });
}

function collectDownloads(data) {
  const list = [];
  const push = (title, file, category) => { if (file) list.push({ title, file, category }); };
  (data.gpb || []).forEach((g) => push(g.title, g.file, "GAD Plan and Budget"));
  if (data.strategicPlan) push(data.strategicPlan.title, data.strategicPlan.file, "Strategic Plan");
  (data.accomplishments || []).forEach((a) => push(a.title, a.file, "Accomplishment Report"));
  if (data.estadoNiJuana) push(data.estadoNiJuana.title, data.estadoNiJuana.file, "Estado ni Juana");
  (data.paps || []).forEach((p) => push(p.title, p.file, "Programs, Activities & Projects"));
  ((data.knowledge || {}).laws || []).forEach((l) => push(l.title, l.file, "GAD-related Law"));
  ((data.knowledge || {}).policies || []).forEach((l) => push(l.title, l.file, "Policy / Issuance"));
  ((data.knowledge || {}).modules || []).forEach((l) => push(l.title, l.file, "Module / Tool"));
  Object.entries(data.policies || {}).forEach(([, rows]) =>
    (rows || []).forEach((r) => push(r.title, r.file, "Policy / Issuance")));
  if (data.agenda) push(data.agenda.title, data.agenda.file, "GAD Agenda");
  (data.extraDownloads || []).forEach((d) => push(d.title, d.file, d.category || "Resource"));
  // de-duplicate by file
  const seen = new Set();
  return list.filter((it) => (seen.has(it.file) ? false : seen.add(it.file)));
}

function filterDownloads(q) {
  const term = q.trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll("#downloads-list .download-row").forEach((row) => {
    const match = row.dataset.search.includes(term);
    row.style.display = match ? "" : "none";
    if (match) visible++;
  });
  const count = document.getElementById("dl-count");
  if (count) count.textContent = `${visible} files`;
}

/* ---- Feedback + Contact ---- */
function renderFeedback(data) {
  const f = data.feedback || {};
  const body = el("div", { class: "feedback-box" }, [
    el("p", {}, f.description || ""),
    el("div", { class: "feedback-actions" }, [
      f.formUrl ? el("a", { class: "button button-primary", href: f.formUrl, target: "_blank", rel: "noopener" }, "Open feedback form")
        : null,
      el("a", { class: "button button-outline", href: "mailto:" + (f.email || data.site.email) }, "Email the GAD office"),
    ]),
  ]);
  return section("feedback", "Feedback Mechanism", "Share Your Feedback",
    "Your feedback helps us improve GAD programs and services.", body);
}

function renderContact(data) {
  const s = data.site;
  const body = el("div", { class: "contact-grid" }, [
    el("div", { class: "contact-card" }, [
      el("span", { class: "contact-ico", "aria-hidden": "true" }, "\u2709"),
      el("div", {}, [el("small", {}, "Email"), el("a", { href: "mailto:" + s.email }, s.email)]),
    ]),
    s.phone ? el("div", { class: "contact-card" }, [
      el("span", { class: "contact-ico", "aria-hidden": "true" }, "\u260E"),
      el("div", {}, [el("small", {}, "Phone"), el("span", {}, s.phone)]),
    ]) : null,
    s.address ? el("div", { class: "contact-card" }, [
      el("span", { class: "contact-ico", "aria-hidden": "true" }, "\uD83D\uDCCD"),
      el("div", {}, [el("small", {}, "Address"), el("span", {}, s.address)]),
    ]) : null,
  ]);
  return section("contact", "Contact Us", "GAD Focal Point System Contact Details",
    null, body, { alt: true });
}

/* ================= FOOTER ================= */
function renderFooter(data) {
  const s = data.site;
  const links = [];
  (s.socials || []).forEach((so) => so.url && links.push(el("a", { href: so.url, target: "_blank", rel: "noopener" }, so.label)));
  if (s.kmsUrl) links.push(el("a", { href: s.kmsUrl, target: "_blank", rel: "noopener" }, "Knowledge Management System"));
  if (s.digitalCornerUrl) links.push(el("a", { href: s.digitalCornerUrl, target: "_blank", rel: "noopener" }, "Digital GAD Corner"));

  return el("footer", { class: "site-footer" }, [
    el("div", { class: "container footer-top" }, [
      el("div", { class: "footer-brand" }, [
        el("span", { class: "brand-mark", "aria-hidden": "true" }, "GAD"),
        el("div", {}, [
          el("strong", {}, `${s.agencyName || ""}${s.campus ? " \u2013 " + s.campus : ""}`),
          el("small", {}, s.cornerName || "Gender and Development (GAD) Corner"),
        ]),
      ]),
      el("nav", { class: "footer-links", "aria-label": "Footer" }, [
        el("a", { href: "#news" }, "News"),
        el("a", { href: "#plans" }, "Plans & Budget"),
        el("a", { href: "#reports" }, "Reports"),
        el("a", { href: "#knowledge" }, "Knowledge Base"),
        el("a", { href: "#downloads" }, "Downloads"),
        el("a", { href: "#feedback" }, "Feedback"),
        ...links,
      ]),
    ]),
    el("div", { class: "container footer-bottom" }, [
      el("p", {}, "Compliant with PCW Memorandum Circular No. 2025-05 (Guidelines on the Establishment of GAD Corner)."),
      el("p", {}, `\u00A9 ${new Date().getFullYear()} ${s.agencyName || "Cavite State University"}${s.campus ? " \u2013 " + s.campus : ""}. All rights reserved.`),
      el("span", { class: "viewer-count", id: "viewer-count", title: "Site visitor statistics" }, [
        el("span", { class: "viewer-count-icon", "aria-hidden": "true" }, "\uD83D\uDC41"),
        el("span", { id: "viewer-count-text" }, "\u2026"),
      ]),
      el("a", { href: "/admin", class: "admin-link" }, "GAD Staff Login"),
    ]),
  ]);
}

/* ================= VISITOR IDENTITY & ANALYTICS ================= */
const VISITOR_KEY = "gad-visitor-id";
const PROFILE_KEY = "gad-visitor-profile";

function getVisitorId() {
  let id = "";
  try { id = localStorage.getItem(VISITOR_KEY) || ""; } catch {}
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
    try { localStorage.setItem(VISITOR_KEY, id); } catch {}
  }
  return id;
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch { return null; }
}
function saveProfileLocal(p) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

async function trackVisit() {
  try {
    if (sessionStorage.getItem("gad-visit-logged")) return;
    await fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: getVisitorId() }),
    });
    sessionStorage.setItem("gad-visit-logged", "1");
  } catch {}
}

async function loadViewerCount() {
  try {
    const res = await fetch("/api/stats/public");
    const s = await res.json();
    const elText = document.getElementById("viewer-count-text");
    if (elText) elText.textContent = `${(s.visitors || 0).toLocaleString()} visitors \u00B7 ${(s.visits || 0).toLocaleString()} views`;
  } catch {}
}

/* ================= DOWNLOAD GATE (SDD registration) ================= */
const SDD_SEX = ["Female", "Male", "Prefer not to say"];
const SDD_AGE = ["Below 18", "18-24", "25-34", "35-44", "45-54", "55 and above"];
const SDD_AFF = ["Student", "Faculty", "Staff", "Alumni", "Parent/Guardian", "Guest/Other"];

function isGatedLink(a) {
  if (!a || !a.href) return false;
  if (a.hasAttribute("download")) return true;
  const href = a.getAttribute("href") || "";
  return href.startsWith("/uploads/") || /res\.cloudinary\.com/.test(href) ||
    /\.(pdf|docx?|pptx?|xlsx?)(\?|$)/i.test(href);
}

function logDownload(a) {
  const title =
    a.querySelector(".dl-chip-text strong")?.textContent ||
    a.querySelector(".download-meta strong")?.textContent ||
    a.textContent.trim().slice(0, 120) ||
    "";
  fetch("/api/track/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      file: a.getAttribute("href") || "",
      title,
      category: a.dataset.category || "",
    }),
  }).catch(() => {});
}

function showDownloadSnackbar(email) {
  let bar = document.getElementById("dl-snackbar");
  if (!bar) {
    bar = el("div", { class: "dl-snackbar", id: "dl-snackbar" });
    document.body.appendChild(bar);
  }
  bar.innerHTML = "";
  bar.appendChild(el("span", {}, ["Downloading as ", el("strong", {}, email), " "]));
  bar.appendChild(el("button", { type: "button", class: "dl-snackbar-link", onclick: () => { bar.classList.remove("show"); openRegisterModal(); } }, "Not you?"));
  bar.classList.add("show");
  clearTimeout(bar._timer);
  bar._timer = setTimeout(() => bar.classList.remove("show"), 5000);
}

let pendingDownload = null;

function ensureRegisterModal() {
  let modal = document.getElementById("register-modal");
  if (modal) return modal;

  const selectField = (id, label, options) =>
    el("div", { class: "reg-field" }, [
      el("label", { for: id }, label),
      el("select", { id, required: "" }, [
        el("option", { value: "", disabled: "", selected: "" }, "Select\u2026"),
        ...options.map((o) => el("option", { value: o }, o)),
      ]),
    ]);

  const form = el("form", { class: "reg-form", id: "register-form" }, [
    el("div", { class: "reg-field" }, [
      el("label", { for: "reg-name" }, "Full name (optional)"),
      el("input", { id: "reg-name", type: "text", autocomplete: "name", placeholder: "Juana Dela Cruz" }),
    ]),
    el("div", { class: "reg-field" }, [
      el("label", { for: "reg-email" }, "Email address *"),
      el("input", { id: "reg-email", type: "email", required: "", autocomplete: "email", placeholder: "you@cvsu.edu.ph" }),
    ]),
    selectField("reg-sex", "Sex *", SDD_SEX),
    selectField("reg-age", "Age group *", SDD_AGE),
    selectField("reg-aff", "Affiliation *", SDD_AFF),
    el("p", { class: "reg-error", id: "reg-error" }),
    el("button", { class: "button button-primary reg-submit", type: "submit" }, "Continue to download"),
    el("p", { class: "reg-privacy" },
      "Your information is used only for the University's sex-disaggregated GAD reports, in line with PCW guidelines. It is never shared publicly."),
  ]);

  modal = el("div", { class: "reg-modal", id: "register-modal", role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "reg-title" }, [
    el("div", { class: "reg-modal-backdrop", "data-close": "1" }),
    el("div", { class: "reg-modal-panel", role: "document" }, [
      el("button", { class: "reg-modal-close", type: "button", "aria-label": "Close", "data-close": "1" }, "\u2715"),
      el("div", { class: "reg-modal-head" }, [
        el("span", { class: "reg-modal-badge" }, "One-time registration"),
        el("h2", { id: "reg-title" }, "Register to download"),
        el("p", {}, "The GAD office collects basic sex-disaggregated data (SDD) for its PCW reports. You only need to do this once on this device."),
      ]),
      form,
    ]),
  ]);
  modal.addEventListener("click", (e) => {
    if (e.target.dataset && e.target.dataset.close) closeRegisterModal();
  });
  form.addEventListener("submit", onRegisterSubmit);
  document.body.appendChild(modal);
  return modal;
}

function openRegisterModal() {
  const modal = ensureRegisterModal();
  const p = getProfile();
  if (p) {
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.value = v || ""; };
    set("reg-name", p.name);
    set("reg-email", p.email);
    set("reg-sex", p.sex);
    set("reg-age", p.ageGroup);
    set("reg-aff", p.affiliation);
  }
  document.getElementById("reg-error").textContent = "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const email = document.getElementById("reg-email");
  if (email) email.focus();
}

function closeRegisterModal() {
  const modal = document.getElementById("register-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  pendingDownload = null;
}

async function onRegisterSubmit(e) {
  e.preventDefault();
  const err = document.getElementById("reg-error");
  const btn = e.target.querySelector(".reg-submit");
  err.textContent = "";
  const payload = {
    visitorId: getVisitorId(),
    name: document.getElementById("reg-name").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    sex: document.getElementById("reg-sex").value,
    ageGroup: document.getElementById("reg-age").value,
    affiliation: document.getElementById("reg-aff").value,
  };
  if (!payload.sex || !payload.ageGroup || !payload.affiliation) {
    err.textContent = "Please complete all required fields.";
    return;
  }
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed.");
    saveProfileLocal({ name: payload.name, email: payload.email, sex: payload.sex, ageGroup: payload.ageGroup, affiliation: payload.affiliation });
    const dl = pendingDownload;
    closeRegisterModal();
    if (dl) {
      logDownload(dl);
      showDownloadSnackbar(payload.email);
      // Re-trigger the original download now that the user is registered.
      const a = document.createElement("a");
      a.href = dl.getAttribute("href");
      if (dl.hasAttribute("download")) a.setAttribute("download", "");
      a.target = dl.getAttribute("target") || "_blank";
      a.rel = "noopener";
      a.dataset.skipGate = "1"; // already logged above; avoid double-logging
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (e2) {
    err.textContent = e2.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Continue to download";
  }
}

/* Intercept clicks on any downloadable-file link (delegated). */
function setupDownloadGate() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || !isGatedLink(a) || a.dataset.skipGate) return;
    const profile = getProfile();
    if (!profile || !profile.email) {
      e.preventDefault();
      pendingDownload = a;
      openRegisterModal();
      return;
    }
    // Registered: let the browser follow the link; just log it.
    logDownload(a);
    showDownloadSnackbar(profile.email);
  });
}

/* ================= GAD CHATBOT (rule-based, no external API) ================= */
const CHAT_FALLBACK_KB = [
  {
    topic: "Safe Spaces Act (RA 11313)",
    keywords: "safe spaces act ra 11313 bawal bastos catcalling harassment street online gender-based sexual harassment gbsh",
    answer: "RA 11313 (Safe Spaces Act or \"Bawal Bastos\" Law) penalizes gender-based sexual harassment in streets, public spaces, online, workplaces, and schools. In CvSU-CCAT, incidents may be reported to the GAD Office or through the CODI mechanism.",
    link: "#knowledge",
  },
  {
    topic: "Anti-Sexual Harassment Act (RA 7877)",
    keywords: "ra 7877 anti sexual harassment act work education training",
    answer: "RA 7877 (Anti-Sexual Harassment Act of 1995) declares sexual harassment unlawful in employment, education, and training environments. The University enforces this through its Committee on Decorum and Investigation (CODI).",
    link: "#knowledge",
  },
  {
    topic: "Magna Carta of Women (RA 9710)",
    keywords: "magna carta women ra 9710 rights empowerment discrimination",
    answer: "RA 9710 (Magna Carta of Women) is a comprehensive women's human rights law that seeks to eliminate discrimination against women. It mandates agencies like CvSU to implement GAD programs and allocate a GAD budget.",
    link: "#knowledge",
  },
  {
    topic: "Reporting / CODI",
    keywords: "report incident complaint codi harassment saan paano magsumbong file case victim help",
    answer: "To report gender-based harassment or discrimination, contact the GAD Office or the Committee on Decorum and Investigation (CODI). You may also email the GAD office \u2014 see the Contact section. All reports are handled confidentially.",
    link: "#contact",
  },
  {
    topic: "GAD services",
    keywords: "services seminar training workshop counselling counseling livelihood orientation offer",
    answer: "The GAD Office offers capacity building (seminars, trainings, workshops), gender-responsive counselling referrals, livelihood programs, and orientations on GAD-related laws. See the Services section for details.",
    link: "#services",
  },
  {
    topic: "Downloads / resources",
    keywords: "download file resources pdf forms plan budget report copy documents",
    answer: "You can find GAD plans, accomplishment reports, policies, IEC materials, and other downloadable resources in the Downloads section. A quick one-time registration is asked before downloading (for the University's sex-disaggregated reports).",
    link: "#downloads",
  },
  {
    topic: "18-Day Campaign to End VAW",
    keywords: "18 day campaign vaw violence against women orange november 25",
    answer: "The 18-Day Campaign to End Violence Against Women (Nov 25 \u2013 Dec 12) is an annual nationwide advocacy. CvSU-CCAT joins through the Orange Wave campaign \u2014 see the News section for this year's activities.",
    link: "#news",
  },
  {
    topic: "What is GAD?",
    keywords: "what gad ano ang gender and development meaning kahulugan focal point gfps",
    answer: "Gender and Development (GAD) is a development approach that seeks equality between women and men. The University implements GAD through its GAD Focal Point System (GFPS), annual GAD Plan & Budget, and PCW-mandated programs.",
    link: "#about",
  },
];

let chatOpen = false;

function chatKb() {
  const custom = (content && content.chatbot) || [];
  return [...custom, ...CHAT_FALLBACK_KB];
}

function scoreEntry(entry, tokens) {
  const hay = ((entry.keywords || "") + " " + (entry.topic || "") + " " + (entry.question || "")).toLowerCase();
  const hayWords = hay.split(/\s+/).filter((w) => w.length >= 4);
  let score = 0;
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (hay.includes(t)) {
      score += t.length >= 5 ? 2 : 1;
    } else if (t.length >= 6 && hayWords.some((w) => t.includes(w))) {
      // Handles Taglish affixes, e.g. "makakadownload" matches keyword "download".
      score += 2;
    }
  }
  return score;
}

function answerFor(text) {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\u00f1\s-]/gi, " ").split(/\s+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const entry of chatKb()) {
    const s = scoreEntry(entry, tokens);
    if (s > bestScore) { best = entry; bestScore = s; }
  }
  if (best && bestScore >= 2) return best;
  return null;
}

function chatMsg(text, who, link) {
  const wrap = el("div", { class: "chat-msg " + who }, [
    el("div", { class: "chat-bubble" }, [
      text,
      link ? el("a", { class: "chat-link", href: link, onclick: () => toggleChat(false) }, "Open section \u2192") : null,
    ]),
  ]);
  const log = document.getElementById("chat-log");
  log.appendChild(wrap);
  log.scrollTop = log.scrollHeight;
}

function botReply(userText) {
  const match = answerFor(userText);
  fetch("/api/track/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId: getVisitorId(), query: userText.slice(0, 300), matched: match ? match.topic : "" }),
  }).catch(() => {});
  setTimeout(() => {
    if (match) {
      chatMsg(match.answer, "bot", match.link || "");
    } else {
      const email = (content && content.site && content.site.email) || "";
      chatMsg(
        "Sorry, wala akong sagot diyan sa ngayon. You can browse the site sections, or contact the GAD Office directly" + (email ? " at " + email : "") + ". Try asking about: Safe Spaces Act, reporting harassment, GAD services, or downloads.",
        "bot"
      );
    }
  }, 350);
}

function sendChat() {
  const input = document.getElementById("chat-input");
  const text = (input.value || "").trim();
  if (!text) return;
  input.value = "";
  chatMsg(text, "user");
  botReply(text);
}

function toggleChat(open) {
  const panel = document.getElementById("chat-panel");
  const fab = document.getElementById("chat-fab");
  chatOpen = open !== undefined ? open : !chatOpen;
  panel.classList.toggle("open", chatOpen);
  fab.setAttribute("aria-expanded", String(chatOpen));
  if (chatOpen) {
    const log = document.getElementById("chat-log");
    if (!log.childElementCount) {
      chatMsg("Hi! Ako ang GAD Assistant ng CvSU-CCAT. Magtanong tungkol sa GAD laws, services, reporting, o resources. \uD83D\uDC9C", "bot");
    }
    document.getElementById("chat-input").focus();
  }
}

function setupChatbot() {
  if (document.getElementById("chat-fab")) return;
  const quick = ["What is GAD?", "Safe Spaces Act", "How to report harassment?", "GAD services", "Downloads"];
  const panel = el("div", { class: "chat-panel", id: "chat-panel", role: "dialog", "aria-label": "GAD Assistant chatbot" }, [
    el("div", { class: "chat-head" }, [
      el("span", { class: "chat-avatar", "aria-hidden": "true" }, "\uD83D\uDCAC"),
      el("div", {}, [
        el("strong", {}, "GAD Assistant"),
        el("small", {}, "CvSU-CCAT GAD Corner"),
      ]),
      el("button", { class: "chat-close", type: "button", "aria-label": "Close chat", onclick: () => toggleChat(false) }, "\u2715"),
    ]),
    el("div", { class: "chat-log", id: "chat-log" }),
    el("div", { class: "chat-quick" }, quick.map((q) =>
      el("button", { class: "chat-chip", type: "button", onclick: () => { chatMsg(q, "user"); botReply(q); } }, q)
    )),
    el("form", { class: "chat-form", onsubmit: (e) => { e.preventDefault(); sendChat(); } }, [
      el("input", { id: "chat-input", type: "text", placeholder: "Type your question\u2026", "aria-label": "Chat message", autocomplete: "off" }),
      el("button", { class: "chat-send", type: "submit", "aria-label": "Send" }, "\u27A4"),
    ]),
  ]);
  const fab = el("button", { class: "chat-fab", id: "chat-fab", type: "button", "aria-label": "Open GAD Assistant chatbot", "aria-expanded": "false", onclick: () => toggleChat() }, [
    el("span", { class: "chat-fab-icon", "aria-hidden": "true" }, "\uD83D\uDCAC"),
    el("span", { class: "chat-fab-label" }, "GAD Assistant"),
  ]);
  document.body.appendChild(panel);
  document.body.appendChild(fab);
}

/* ================= SEARCH ================= */
function runSearch(q) {
  const term = (q || "").trim();
  if (!term) return;
  location.hash = "#downloads";
  const filter = document.getElementById("dl-filter");
  if (filter) { filter.value = term; filterDownloads(term); }
  const list = document.getElementById("news-grid");
  if (list) {
    const low = term.toLowerCase();
    list.querySelectorAll(".news-card").forEach((c) => {
      c.style.display = c.dataset.search.includes(low) ? "" : "none";
    });
  }
}

/* ================= NAV BEHAVIOR ================= */
function toggleMenu() {
  const btn = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".primary-nav");
  const open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", String(!open));
  btn.classList.toggle("active", !open);
  nav.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
}
function closeMenu() {
  const btn = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".primary-nav");
  if (!btn) return;
  btn.setAttribute("aria-expanded", "false");
  btn.classList.remove("active");
  nav.classList.remove("open");
  document.body.classList.remove("menu-open");
  document.querySelectorAll(".dd-toggle[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
}

/* ================= ACCESSIBILITY ================= */
function setFontScale(dir) {
  let scale = parseFloat(localStorage.getItem("gad-font-scale") || "1");
  scale = Math.min(1.3, Math.max(0.9, scale + dir * 0.1));
  localStorage.setItem("gad-font-scale", String(scale));
  document.documentElement.style.fontSize = scale * 100 + "%";
}
function toggleContrast() {
  const on = document.body.classList.toggle("high-contrast");
  localStorage.setItem("gad-contrast", on ? "1" : "0");
}
function applyA11yPrefs() {
  const scale = parseFloat(localStorage.getItem("gad-font-scale") || "1");
  document.documentElement.style.fontSize = scale * 100 + "%";
  if (localStorage.getItem("gad-contrast") === "1") document.body.classList.add("high-contrast");
}

/* ================= SCROLL BEHAVIOR ================= */
function setupScroll() {
  const header = document.querySelector(".site-header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 10);
  }, { passive: true });

  const links = [...document.querySelectorAll(".nav-link[href^='#'], .dd-link[href^='#']")];
  const sections = [...document.querySelectorAll("section[id]")];
  const obs = new IntersectionObserver((entries) => {
    const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!vis) return;
    links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + vis.target.id));
  }, { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.15] });
  sections.forEach((s) => obs.observe(s));
}

/* ================= RENDER ================= */
function render(data) {
  content = data;
  app.innerHTML = "";
  const frag = document.createDocumentFragment();
  frag.appendChild(renderHeader(data));
  const main = el("main", { id: "main-content" }, [
    renderHero(data.slides),
    renderHomeGrid(data),
    renderAbout(data),
    renderServices(data),
    renderNews(data),
    renderAgenda(data),
    renderPaps(data),
    renderPlans(data),
    renderReports(data),
    renderKnowledge(data),
    renderPolicies(data),
    renderGfps(data),
    renderAwards(data),
    renderPartnerships(data),
    renderDownloads(data),
    renderFeedback(data),
    renderContact(data),
  ]);
  frag.appendChild(main);
  frag.appendChild(renderFooter(data));
  app.appendChild(frag);

  applyA11yPrefs();
  resetCarouselTimer();
  setupScroll();
  setupChatbot();
  trackVisit();
  loadViewerCount();

  document.addEventListener("click", (e) => {
    const nav = document.querySelector(".primary-nav");
    if (nav && nav.classList.contains("open") && !e.target.closest(".nav-bar") && !e.target.closest(".menu-toggle")) {
      closeMenu();
    }
    if (!e.target.closest(".has-dd")) {
      document.querySelectorAll(".dd-toggle[aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
}

setupDownloadGate();

async function init() {
  try {
    const res = await fetch("/api/content", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load content");
    render(await res.json());
  } catch (err) {
    app.innerHTML = "";
    app.appendChild(el("div", { class: "app-error" }, [
      el("h1", {}, "GAD Corner is starting up"),
      el("p", {}, "Unable to load content. Please make sure the server is running (npm start) and refresh."),
    ]));
  }
}

init();
