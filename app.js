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
    ...news.map((n) =>
      el("article", { class: "news-item" }, [
        el("div", { class: "news-thumb" }, n.image
          ? el("img", { src: enc(n.image), alt: n.title, loading: "lazy" })
          : el("span", { class: "thumb-fallback", "aria-hidden": "true" }, "IMG")),
        el("div", { class: "news-body" }, [
          el("h3", {}, n.title),
          el("p", { class: "news-date" }, fmtDate(n.date)),
          el("p", { class: "news-excerpt" }, n.excerpt || ""),
          el("a", { class: "view-more", href: "#news" }, "View more"),
        ]),
      ])
    ),
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
function renderNews(data) {
  const body = el("div", { class: "cards-grid news-grid", id: "news-grid" },
    (data.news || []).map((n) =>
      el("article", { class: "card news-card", dataset: { search: (n.title + " " + (n.excerpt || "")).toLowerCase() } }, [
        el("div", { class: "card-media" }, n.image
          ? el("img", { src: enc(n.image), alt: n.title, loading: "lazy" })
          : el("span", { class: "thumb-fallback" }, "IMG")),
        el("div", { class: "card-content" }, [
          el("p", { class: "news-date" }, fmtDate(n.date)),
          el("h3", {}, n.title),
          el("p", {}, n.body || n.excerpt || ""),
          n.link ? el("a", { class: "text-link", href: n.link, target: "_blank", rel: "noopener" }, "Read more") : null,
        ]),
      ])
    )
  );
  return section("news", "News & Announcements", "Latest GAD News and Announcements",
    "Upcoming activities, recently conducted programs, and other relevant updates.", body);
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
      el("a", { href: "/admin", class: "admin-link" }, "GAD Staff Login"),
    ]),
  ]);
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
