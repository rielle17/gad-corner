/* GAD Corner CMS - schema-driven content editor */

const TOKEN_KEY = "gad-admin-token";
let draft = null;
let dirty = false;

/* ---------- schema helpers ---------- */
const f = (key, label, kind = "text", opts = {}) => ({ key, label, kind, ...opts });
const arr = (fields, itemLabel) => ({ kind: "array", fields, itemLabel });
const grp = (fields) => ({ kind: "group", fields });

const docFields = [
  f("title", "Title"),
  f("year", "Year"),
  f("description", "Description", "textarea"),
  f("image", "Image", "image"),
  f("file", "File", "file"),
];

const SCHEMA = [
  {
    key: "site", label: "Site Settings", desc: "Agency name, contact details, and social links.",
    node: grp([
      f("republic", "Republic label"),
      f("agencyName", "Agency name"),
      f("campus", "Campus"),
      f("cornerName", "GAD Corner name"),
      f("tagline", "Tagline", "textarea"),
      f("email", "Email", "email"),
      f("phone", "Phone"),
      f("address", "Address"),
      f("digitalCornerUrl", "Digital GAD Corner URL", "url"),
      f("kmsUrl", "Knowledge Management System URL", "url"),
      { key: "socials", label: "Social / external links", ...arr([f("label", "Label"), f("url", "URL", "url")], "Link") },
    ]),
  },
  {
    key: "about", label: "About (Vision & Mission)", desc: "Vision, mission, and GAD committee statement.",
    node: grp([
      f("vision", "Vision", "textarea"),
      f("mission", "Mission", "textarea"),
      f("committee", "GAD Committee", "textarea"),
    ]),
  },
  {
    key: "services", label: "Services Offered", desc: "GAD office services (capacity building, livelihood, counselling).",
    node: grp([
      f("intro", "Intro", "textarea"),
      { key: "items", label: "Services", ...arr([
        f("title", "Title"),
        f("note", "Note / description", "textarea"),
        f("trainingOn", "Seminar / Workshop / Training on (one per line)", "list"),
        f("orientationOn", "Orientation on (one per line)", "list"),
      ], "Service") },
    ]),
  },
  {
    key: "slides", label: "Hero Carousel", desc: "Slides for GAD activities and announcements.",
    node: arr([f("title", "Title"), f("caption", "Caption", "textarea"), f("image", "Image", "image"), f("link", "Link")], "Slide"),
  },
  {
    key: "news", label: "News & Announcements", desc: "Latest GAD news and announcements.",
    node: arr([
      f("title", "Title"),
      f("date", "Date", "date"),
      f("excerpt", "Excerpt (short summary shown on the card)", "textarea"),
      f("body", "Full text (shown when the item is opened)", "textarea"),
      f("image", "Cover image", "image"),
      f("gallery", "Photo gallery (upload multiple images)", "images"),
      f("link", "External link", "url"),
    ], "News"),
  },
  {
    key: "agenda", label: "GAD Agenda", desc: "Strategic GAD agenda and priorities.",
    node: grp([f("title", "Title"), f("body", "Description", "textarea"), f("points", "Key points (one per line)", "list"), f("file", "Attachment", "file")]),
  },
  {
    key: "paps", label: "Programs, Activities & Projects", desc: "GAD PAPs.",
    node: arr([f("title", "Title"), f("category", "Category"), f("year", "Year"), f("description", "Description", "textarea"), f("image", "Image", "image"), f("file", "File", "file")], "Project"),
  },
  {
    key: "gpb", label: "GAD Plan and Budget", desc: "Approved GAD Plans and Budget.",
    node: arr(docFields, "GPB"),
  },
  {
    key: "accomplishments", label: "Accomplishment Reports", desc: "Signed GAD Accomplishment Reports.",
    node: arr(docFields, "Report"),
  },
  {
    key: "estadoNiJuana", label: "Estado ni Juana Report", desc: "Impact of GAD PAPs on women and girls.",
    node: grp([f("title", "Title"), f("body", "Description", "textarea"), f("file", "File", "file")]),
  },
  {
    key: "strategicPlan", label: "GAD Strategic Plan", desc: "Multi-year GAD strategic plan.",
    node: grp([f("title", "Title"), f("description", "Description", "textarea"), f("image", "Image", "image"), f("file", "File", "file")]),
  },
  {
    key: "knowledge", label: "Knowledge Base & IEC", desc: "Laws, policies, gender statistics, and modules.",
    node: grp([
      { key: "laws", label: "GAD-related Laws", ...arr([f("title", "Title"), f("description", "Description", "textarea"), f("image", "Image", "image"), f("file", "File", "file")], "Law") },
      { key: "policies", label: "Policies & Issuances", ...arr([f("title", "Title"), f("description", "Description", "textarea"), f("image", "Image", "image"), f("file", "File", "file")], "Policy") },
      { key: "genderStats", label: "Gender Statistics", ...arr([f("label", "Label"), f("value", "Value"), f("note", "Note", "textarea")], "Statistic") },
      { key: "modules", label: "Modules & Tools", ...arr([f("title", "Title"), f("description", "Description", "textarea"), f("image", "Image", "image"), f("file", "File", "file")], "Module") },
    ]),
  },
  {
    key: "policies", label: "Policies & Issuances", desc: "Circulars, resolutions, memoranda, office orders.",
    node: grp([
      { key: "circulars", label: "Circulars", ...arr([f("title", "Title"), f("date", "Date", "date"), f("description", "Description", "textarea"), f("file", "File", "file")], "Circular") },
      { key: "resolutions", label: "Resolutions", ...arr([f("title", "Title"), f("date", "Date", "date"), f("description", "Description", "textarea"), f("file", "File", "file")], "Resolution") },
      { key: "memoranda", label: "Memoranda", ...arr([f("title", "Title"), f("date", "Date", "date"), f("description", "Description", "textarea"), f("file", "File", "file")], "Memorandum") },
      { key: "officeOrders", label: "Office Orders", ...arr([f("title", "Title"), f("date", "Date", "date"), f("description", "Description", "textarea"), f("file", "File", "file")], "Office Order") },
    ]),
  },
  {
    key: "gfps", label: "GFPS (Org Structure)", desc: "GAD Focal Point System chart and members.",
    node: grp([
      f("chartImage", "Org chart image", "image"),
      f("chartFile", "Org chart file", "file"),
      { key: "members", label: "GFPS Members", ...arr([f("name", "Name"), f("role", "Role"), f("unit", "Unit / Office"), f("email", "Email", "email")], "Member") },
    ]),
  },
  {
    key: "awards", label: "Awards & Recognitions", desc: "GAD-related awards.",
    node: arr([f("title", "Title"), f("year", "Year"), f("description", "Description", "textarea"), f("image", "Image", "image")], "Award"),
  },
  {
    key: "partnerships", label: "Partnerships", desc: "GAD partnerships and joint programs.",
    node: arr([f("title", "Title"), f("description", "Description", "textarea"), f("image", "Image", "image"), f("file", "File", "file")], "Partnership"),
  },
  {
    key: "extraDownloads", label: "Additional Downloads", desc: "Any other downloadable files to publish.",
    node: arr([f("title", "Title"), f("category", "Category"), f("file", "File", "file")], "File"),
  },
  {
    key: "feedback", label: "Feedback Mechanism", desc: "Feedback form and contact.",
    node: grp([f("description", "Description", "textarea"), f("formUrl", "Feedback form URL", "url"), f("email", "Email", "email")]),
  },
  {
    key: "trackingMatrix", label: "Tracking Matrix (Annex A)", desc: "Log of updates made to the GAD Corner.",
    node: arr([f("date", "Date", "date"), f("description", "Update / material displayed", "textarea"), f("person", "Responsible person")], "Entry"),
  },
  {
    key: "chatbot", label: "Chatbot Knowledge Base", desc: "Questions and answers used by the GAD Assistant chatbot on the website.",
    node: arr([
      f("topic", "Topic / short title"),
      f("keywords", "Keywords (words that trigger this answer, separated by spaces)", "textarea"),
      f("answer", "Answer", "textarea"),
      f("link", "Section link (optional, e.g. #services or #downloads)"),
    ], "Q&A Entry"),
  },
];

/* ---------- DOM helper ---------- */
function el(tag, props = {}, children = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return n;
}

/* ---------- icons (feather-style) ---------- */
const ICONS = {
  site: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  services: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  slides: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3M8 11l2 2 3-4 3 5"/></svg>',
  news: '<svg viewBox="0 0 24 24"><path d="M4 4h13a2 2 0 0 1 2 2v13M4 4v14a2 2 0 0 0 2 2h13M8 8h7M8 12h7M8 16h4"/></svg>',
  agenda: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>',
  paps: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  gpb: '<svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  accomplishments: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/></svg>',
  estadoNiJuana: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  strategicPlan: '<svg viewBox="0 0 24 24"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16"/></svg>',
  knowledge: '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  policies: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></svg>',
  gfps: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  awards: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/></svg>',
  partnerships: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  extraDownloads: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  feedback: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  trackingMatrix: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  account: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  chatbot: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M9 10h.01M12 10h.01M15 10h.01"/></svg>',
  analytics: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/></svg>',
  kms: '<svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
};
function icon(name) {
  return el("span", { class: "nav-ico", html: ICONS[name] || ICONS.about });
}

/* sidebar grouping */
const NAV_GROUPS = [
  { label: "Reports & Insights", keys: ["analytics", "kms"] },
  { label: "General", keys: ["site", "about", "services", "gfps"] },
  { label: "Homepage & Content", keys: ["slides", "news", "agenda", "paps"] },
  { label: "Plans & Reports", keys: ["gpb", "accomplishments", "estadoNiJuana", "strategicPlan"] },
  { label: "Knowledge & Policies", keys: ["knowledge", "policies"] },
  { label: "Engagement", keys: ["awards", "partnerships", "extraDownloads", "feedback", "trackingMatrix", "chatbot"] },
  { label: "Settings", keys: ["account"] },
];
const ACCOUNT_META = { key: "account", label: "Account & Password", desc: "Change the CMS admin password." };
const ANALYTICS_META = { key: "analytics", label: "Analytics & SDD Reports", desc: "Visitor statistics with sex-disaggregated data (SDD) for GAD reporting." };
const KMS_META = { key: "kms", label: "KMS Deliverables Tracker", desc: "Status of GAD Corner deliverables required under PCW MC 2025-05." };
const CUSTOM_META = { account: ACCOUNT_META, analytics: ANALYTICS_META, kms: KMS_META };
function schemaByKey(key) {
  return SCHEMA.find((s) => s.key === key) || CUSTOM_META[key] || null;
}
let activeSection = null;

/* ---------- auth ---------- */
/* localStorage can throw in sandboxed/embedded browsers; fall back to memory. */
let memoryToken = "";
function saveToken(t) {
  memoryToken = t || "";
  try { localStorage.setItem(TOKEN_KEY, memoryToken); } catch (e) {}
}
function clearToken() {
  memoryToken = "";
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
}
function token() {
  if (memoryToken) return memoryToken;
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
}
function authHeaders(extra = {}) { return { Authorization: "Bearer " + token(), ...extra }; }

async function api(path, options = {}) {
  const res = await fetch(path, options);
  if (res.status === 401) { logout(); throw new Error("Session expired. Please log in again."); }
  return res;
}

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast" + (type ? " " + type : "");
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.hidden = true), 3000);
}

/* ---------- login ---------- */
const loginForm = document.getElementById("login-form");

function friendlyError(e) {
  if (location.protocol === "file:") {
    return "This page was opened as a file. Start the server with \"npm start\" and open http://localhost:3000/admin instead.";
  }
  if (e instanceof TypeError || /fetch|network|load failed/i.test(e.message)) {
    return "Cannot reach the server. Make sure it is running (npm start) and that you opened http://localhost:3000/admin.";
  }
  return e.message;
}

// Guard: if opened via file:// the API is unreachable.
if (location.protocol === "file:") {
  const err = document.getElementById("login-error");
  if (err) err.textContent = "Open this CMS through the server: run \"npm start\", then go to http://localhost:3000/admin";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("login-error");
  const btn = loginForm.querySelector("button[type=submit]");
  err.textContent = "";
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Logging in\u2026";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("password").value }),
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || "Login failed.");
    saveToken(data.token);
    await startCms();
  } catch (e2) {
    err.textContent = friendlyError(e2);
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

function logout() {
  clearToken();
  document.getElementById("cms-view").hidden = true;
  document.getElementById("login-view").hidden = false;
  document.getElementById("password").value = "";
}

document.getElementById("logout-btn").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST", headers: authHeaders() }); } catch {}
  logout();
});

/* ---------- path binding ---------- */
function getPath(obj, path) {
  return path.reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, val) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (o[path[i]] == null) o[path[i]] = typeof path[i + 1] === "number" ? [] : {};
    o = o[path[i]];
  }
  o[path[path.length - 1]] = val;
  markDirty();
}

function markDirty() {
  dirty = true;
  const s = document.getElementById("save-status");
  s.textContent = "Unsaved changes";
  s.className = "save-status dirty";
}

/* ---------- field renderers ---------- */
function blankFromFields(fields) {
  const o = {};
  for (const fl of fields) o[fl.key] = fl.kind === "list" || fl.kind === "images" ? [] : "";
  return o;
}

function renderField(fld, path) {
  const value = getPath(draft, path);
  if (fld.kind === "file" || fld.kind === "image") return renderFileField(fld, path, value);
  if (fld.kind === "images") return renderImagesField(fld, path, value);
  if (fld.kind === "list") return renderListField(fld, path, value);
  if (fld.kind === "textarea") {
    const ta = el("textarea", { value: value || "" });
    ta.value = value || "";
    ta.addEventListener("input", () => setPath(draft, path, ta.value));
    return fieldWrap(fld.label, ta, true);
  }
  const type = fld.kind === "date" ? "date" : fld.kind === "url" ? "url" : fld.kind === "email" ? "email" : "text";
  const input = el("input", { type });
  input.value = value || "";
  input.addEventListener("input", () => setPath(draft, path, input.value));
  return fieldWrap(fld.label, input);
}

function fieldWrap(label, control, full, hint) {
  return el("div", { class: "field" + (full ? " field-full" : "") }, [
    el("label", {}, label),
    control,
    hint ? el("span", { class: "field-hint" }, hint) : null,
  ]);
}

function renderListField(fld, path, value) {
  const ta = el("textarea");
  ta.value = (value || []).join("\n");
  ta.addEventListener("input", () => {
    const lines = ta.value.split("\n").map((s) => s.trim()).filter(Boolean);
    setPath(draft, path, lines);
  });
  return fieldWrap(fld.label, ta, true, "One item per line.");
}

/* multiple-images field: upload/reorder/remove a list of image URLs */
function renderImagesField(fld, path, value) {
  const wrap = el("div", { class: "field field-full" });
  wrap.appendChild(el("label", {}, fld.label));
  const grid = el("div", { class: "images-grid" });
  wrap.appendChild(grid);

  const getList = () =>
    (getPath(draft, path) || []).map((v) => (typeof v === "string" ? v : (v && v.image) || "")).filter((v) => v !== undefined);
  const setList = (list) => setPath(draft, path, list);

  const rebuild = () => {
    grid.innerHTML = "";
    const list = getList();
    if (!list.length) {
      grid.appendChild(el("p", { class: "empty-note" }, "No photos yet. Upload one or more images below."));
      return;
    }
    list.forEach((src, i) => {
      const move = (dir) => {
        const l = getList();
        const ni = i + dir;
        if (ni < 0 || ni >= l.length) return;
        [l[i], l[ni]] = [l[ni], l[i]];
        setList(l);
        rebuild();
      };
      const remove = () => {
        const l = getList();
        l.splice(i, 1);
        setList(l);
        rebuild();
      };
      grid.appendChild(
        el("div", { class: "image-thumb" }, [
          src ? el("img", { src: encodeURI(src), alt: "" }) : el("span", { class: "thumb-fallback" }, "IMG"),
          el("div", { class: "image-thumb-actions" }, [
            el("button", { class: "icon-btn", type: "button", title: "Move left", onclick: () => move(-1) }, "\u2190"),
            el("button", { class: "icon-btn", type: "button", title: "Move right", onclick: () => move(1) }, "\u2192"),
            el("button", { class: "icon-btn danger", type: "button", title: "Remove", onclick: remove }, "\u2715"),
          ]),
        ])
      );
    });
  };

  const fileInput = el("input", { type: "file", accept: "image/*", multiple: "", hidden: "" });
  const uploadBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => fileInput.click() }, "Upload photo(s)");
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files.length) return;
    const files = [...fileInput.files];
    uploadBtn.textContent = "Uploading\u2026";
    uploadBtn.disabled = true;
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api("/api/upload", { method: "POST", headers: authHeaders(), body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed.");
        const l = getList();
        l.push(data.path);
        setList(l);
      }
      rebuild();
      showToast(files.length > 1 ? "Photos uploaded" : "Photo uploaded", "success");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      uploadBtn.textContent = "Upload photo(s)";
      uploadBtn.disabled = false;
      fileInput.value = "";
    }
  });

  const urlInput = el("input", { type: "text", placeholder: "or paste an image URL" });
  const addUrlBtn = el("button", {
    type: "button", class: "btn btn-ghost btn-sm",
    onclick: () => {
      const v = urlInput.value.trim();
      if (!v) return;
      const l = getList();
      l.push(v);
      setList(l);
      urlInput.value = "";
      rebuild();
    },
  }, "Add URL");

  rebuild();
  wrap.appendChild(el("div", { class: "images-toolbar" }, [uploadBtn, urlInput, addUrlBtn, fileInput]));
  wrap.appendChild(el("span", { class: "field-hint" }, "These photos appear in the news gallery. Drag order with the arrows; the cover image above shows first."));
  return wrap;
}

function renderFileField(fld, path, value) {
  const input = el("input", { type: "text", placeholder: "/path/to/file or upload" });
  input.value = value || "";
  const preview = el("div", { class: "file-preview" });
  const renderPreview = () => {
    preview.innerHTML = "";
    const v = input.value;
    if (!v) return;
    if (fld.kind === "image" || /\.(png|jpe?g|gif|webp|svg)$/i.test(v)) {
      preview.appendChild(el("img", { src: encodeURI(v), alt: "" }));
    }
    preview.appendChild(el("a", { href: encodeURI(v), target: "_blank", rel: "noopener" }, v));
  };
  input.addEventListener("input", () => { setPath(draft, path, input.value); renderPreview(); });

  const fileInput = el("input", { type: "file", hidden: "" });
  const uploadBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => fileInput.click() }, "Upload");
  fileInput.addEventListener("change", async () => {
    if (!fileInput.files.length) return;
    uploadBtn.textContent = "Uploading\u2026";
    uploadBtn.disabled = true;
    try {
      const fd = new FormData();
      fd.append("file", fileInput.files[0]);
      const res = await api("/api/upload", { method: "POST", headers: authHeaders(), body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      input.value = data.path;
      setPath(draft, path, data.path);
      renderPreview();
      showToast("File uploaded", "success");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      uploadBtn.textContent = "Upload";
      uploadBtn.disabled = false;
      fileInput.value = "";
    }
  });

  renderPreview();
  const wrap = el("div", { class: "field field-full" }, [
    el("label", {}, fld.label),
    el("div", { class: "file-field" }, [input, uploadBtn, fileInput]),
    preview,
  ]);
  return wrap;
}

/* group of fields -> scalar fields in a card grid, arrays as subgroups */
function renderGroup(fields, basePath) {
  const wrap = el("div", {});
  const scalars = fields.filter((fl) => fl.kind !== "array");
  const arrays = fields.filter((fl) => fl.kind === "array");
  if (scalars.length) {
    const card = el("div", { class: "form-card" }, [
      el("div", { class: "field-grid" }, scalars.map((fl) => renderField(fl, basePath.concat(fl.key)))),
    ]);
    wrap.appendChild(card);
  }
  arrays.forEach((fl) => wrap.appendChild(el("div", { class: "form-card" }, [renderArraySection(fl, basePath.concat(fl.key))])));
  return wrap;
}

function renderArraySection(node, path) {
  const section = el("div", { class: "subgroup" });
  if (node.label) section.appendChild(el("div", { class: "subgroup-title" }, node.label));
  const container = el("div", { class: "array-wrap" });
  section.appendChild(container);

  const rebuild = () => {
    container.innerHTML = "";
    const list = getPath(draft, path) || [];
    if (!list.length) container.appendChild(el("p", { class: "empty-note" }, "No entries yet. Click the button below to add one."));
    list.forEach((_, idx) => container.appendChild(renderArrayItem(node, path.concat(idx), idx, rebuild)));
    if (path.length === 1 && typeof updateNavCount === "function") updateNavCount(path[0]);
  };

  const addBtn = el("button", {
    class: "btn btn-ghost btn-sm array-add", type: "button",
    onclick: () => {
      const list = getPath(draft, path) || [];
      list.push(blankFromFields(node.fields));
      setPath(draft, path, list);
      rebuild();
    },
  }, "+ Add " + (node.itemLabel || "item"));

  rebuild();
  section.appendChild(addBtn);
  return section;
}

function renderArrayItem(node, path, idx, rebuild) {
  const item = getPath(draft, path);
  const labelField = node.fields.find((x) => ["title", "label", "name"].includes(x.key));
  const heading = (labelField && item[labelField.key]) || `${node.itemLabel || "Item"} ${idx + 1}`;

  const list = () => getPath(draft, path.slice(0, -1)) || [];
  const move = (dir) => {
    const l = list();
    const ni = idx + dir;
    if (ni < 0 || ni >= l.length) return;
    [l[idx], l[ni]] = [l[ni], l[idx]];
    setPath(draft, path.slice(0, -1), l);
    rebuild();
  };
  const remove = () => {
    if (!confirm("Remove this entry?")) return;
    const l = list();
    l.splice(idx, 1);
    setPath(draft, path.slice(0, -1), l);
    rebuild();
  };

  const body = el("div", { class: "field-grid" });
  for (const fld of node.fields) body.appendChild(renderField(fld, path.concat(fld.key)));

  return el("div", { class: "array-item" }, [
    el("div", { class: "array-item-head" }, [
      el("strong", {}, heading),
      el("div", { class: "array-item-actions" }, [
        el("button", { class: "icon-btn", type: "button", title: "Move up", onclick: () => move(-1) }, "\u2191"),
        el("button", { class: "icon-btn", type: "button", title: "Move down", onclick: () => move(1) }, "\u2193"),
        el("button", { class: "icon-btn danger", type: "button", title: "Remove", onclick: remove }, "\u2715"),
      ]),
    ]),
    body,
  ]);
}

/* ---------- panels ---------- */
function renderCms() {
  const nav = document.getElementById("cms-nav");
  nav.innerHTML = "";

  // ensure keys exist
  for (const sec of SCHEMA) {
    if (draft[sec.key] === undefined) draft[sec.key] = sec.node.kind === "array" ? [] : {};
  }

  for (const group of NAV_GROUPS) {
    nav.appendChild(el("div", { class: "nav-group-label" }, group.label));
    for (const key of group.keys) {
      const meta = schemaByKey(key);
      if (!meta) continue;
      const schemaSec = SCHEMA.find((s) => s.key === key);
      const isArray = schemaSec && schemaSec.node.kind === "array";
      const count = isArray ? (draft[key] || []).length : null;
      const btn = el("button", {
        class: "nav-item", type: "button", dataset: { section: key },
        onclick: () => showSection(key),
      }, [
        icon(key),
        el("span", { class: "nav-label" }, meta.label),
        count !== null ? el("span", { class: "nav-count" }, String(count)) : null,
      ]);
      nav.appendChild(btn);
    }
  }

  showSection(activeSection && schemaByKey(activeSection) ? activeSection : "site");
}

function showSection(key) {
  activeSection = key;
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.section === key));

  const meta = schemaByKey(key);
  const main = document.getElementById("cms-main");
  main.innerHTML = "";

  const topbar = el("div", { class: "section-topbar" }, [
    el("p", { class: "crumb" }, meta.label),
    el("h1", {}, meta.label),
    meta.desc ? el("p", {}, meta.desc) : null,
  ]);

  let bodyContent;
  if (key === "account") {
    bodyContent = renderAccountSection();
  } else if (key === "analytics") {
    bodyContent = renderAnalyticsSection();
  } else if (key === "kms") {
    bodyContent = renderKmsSection();
  } else {
    const sec = SCHEMA.find((s) => s.key === key);
    if (sec.node.kind === "array") {
      bodyContent = el("div", { class: "form-card" }, [renderArraySection({ ...sec.node, label: "" }, [sec.key])]);
    } else {
      bodyContent = renderGroup(sec.node.fields, [sec.key]);
    }
  }

  const section = el("div", { class: "cms-section" }, [topbar, bodyContent]);
  main.appendChild(section);
  document.getElementById("cms-main-scroll").scrollTop = 0;
  closeSidebar();
}

/* refresh the count badge for an array section in the sidebar */
function updateNavCount(key) {
  const btn = document.querySelector(`.nav-item[data-section="${key}"] .nav-count`);
  if (btn) btn.textContent = String((draft[key] || []).length);
}

function renderAccountSection() {
  const cur = el("input", { type: "password", autocomplete: "current-password" });
  const nw = el("input", { type: "password", autocomplete: "new-password" });
  const btn = el("button", { class: "btn btn-primary", type: "button", onclick: async () => {
    try {
      const res = await api("/api/change-password", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ currentPassword: cur.value, newPassword: nw.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      cur.value = ""; nw.value = "";
      showToast("Password updated", "success");
    } catch (e) { showToast(e.message, "error"); }
  }}, "Update password");

  return el("div", { class: "form-card" }, [
    el("p", { class: "account-hint" }, "Choose a strong password. You will stay logged in on this device."),
    el("div", { class: "field-grid" }, [
      fieldWrap("Current password", cur),
      fieldWrap("New password (min 6 characters)", nw),
    ]),
    el("div", { style: "margin-top:18px;" }, [btn]),
  ]);
}

/* ---------- analytics dashboard ---------- */
function csvEscape(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function csvBtn(label, onclick) {
  return el("button", { class: "btn btn-ghost btn-sm csv-btn", type: "button", onclick }, "\u2913 " + label);
}

function statCard(label, value, accent) {
  return el("div", { class: "stat-card" + (accent ? " accent" : "") }, [
    el("span", { class: "stat-value" }, String(value)),
    el("span", { class: "stat-label" }, label),
  ]);
}

/* horizontal bar chart from a tally object {label: count} */
function barChart(tally) {
  const entries = Object.entries(tally).filter(([, v]) => v > 0 || true);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return el("div", { class: "bar-chart" }, entries.map(([label, v]) =>
    el("div", { class: "bar-row" }, [
      el("span", { class: "bar-label" }, label),
      el("div", { class: "bar-track" }, [
        el("div", { class: "bar-fill", style: `width:${Math.round((v / max) * 100)}%` }),
      ]),
      el("span", { class: "bar-value" }, `${v}${total ? ` (${Math.round((v / total) * 100)}%)` : ""}`),
    ])
  ));
}

function analyticsTable(headers, rows) {
  return el("div", { class: "table-wrap" }, [
    el("table", { class: "data-table" }, [
      el("thead", {}, el("tr", {}, headers.map((h) => el("th", {}, h)))),
      el("tbody", {}, rows.length
        ? rows.map((r) => el("tr", {}, r.map((c) => el("td", {}, String(c)))))
        : [el("tr", {}, [el("td", { colspan: String(headers.length), class: "table-empty" }, "No data yet.")])]),
    ]),
  ]);
}

function dashCard(title, children, exportBtn) {
  return el("div", { class: "form-card dash-card" }, [
    el("div", { class: "dash-card-head" }, [
      el("h3", {}, title),
      exportBtn || null,
    ]),
    ...[].concat(children),
  ]);
}

function renderAnalyticsSection() {
  const wrap = el("div", {});
  const loading = el("div", { class: "form-card" }, [el("p", { class: "empty-note" }, "Loading analytics\u2026")]);
  wrap.appendChild(loading);

  (async () => {
    let data;
    try {
      const res = await api("/api/admin/analytics", { headers: authHeaders(), cache: "no-store" });
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytics.");
    } catch (e) {
      loading.innerHTML = "";
      loading.appendChild(el("p", { class: "empty-note" }, "Unable to load analytics: " + e.message));
      return;
    }

    loading.remove();
    const t = data.totals || {};

    // Overview stat cards
    wrap.appendChild(el("div", { class: "stat-grid" }, [
      statCard("Page visits", t.visits || 0, true),
      statCard("Unique visitors", t.uniqueVisitors || 0),
      statCard("Registered users", t.registeredUsers || 0),
      statCard("File downloads", t.downloads || 0),
      statCard("Chatbot questions", t.chatQuestions || 0),
    ]));

    // Visits per day (last 30 days) as a column chart
    const perDay = data.visitsPerDay || {};
    const days = Object.keys(perDay);
    const maxDay = Math.max(1, ...days.map((d) => perDay[d]));
    wrap.appendChild(dashCard("Visits — last 30 days",
      el("div", { class: "col-chart", role: "img", "aria-label": "Visits per day chart" }, days.map((d) =>
        el("div", { class: "col-item", title: `${d}: ${perDay[d]} visit(s)` }, [
          el("div", { class: "col-bar", style: `height:${Math.max(3, Math.round((perDay[d] / maxDay) * 100))}%` }),
        ])
      )),
      csvBtn("CSV", () => downloadCsv("visits-per-day.csv", ["Date", "Visits"], days.map((d) => [d, perDay[d]])))
    ));

    // SDD breakdowns
    const sddCsv = (name, tallyObj) =>
      csvBtn("CSV", () => downloadCsv(name, ["Category", "Count"], Object.entries(tallyObj)));
    wrap.appendChild(el("div", { class: "dash-2col" }, [
      dashCard("Registered users by sex (SDD)", barChart(data.visitorsBySex || {}), sddCsv("users-by-sex.csv", data.visitorsBySex || {})),
      dashCard("Downloads by sex (SDD)", barChart(data.downloadsBySex || {}), sddCsv("downloads-by-sex.csv", data.downloadsBySex || {})),
      dashCard("Registered users by age group", barChart(data.visitorsByAge || {}), sddCsv("users-by-age.csv", data.visitorsByAge || {})),
      dashCard("Registered users by affiliation", barChart(data.visitorsByAffiliation || {}), sddCsv("users-by-affiliation.csv", data.visitorsByAffiliation || {})),
    ]));

    // Downloads per file with SDD split
    const sexCols = (data.meta && data.meta.sexValues) || ["Female", "Male", "Prefer not to say"];
    const dlHeaders = ["File / Document", "Total", ...sexCols, "Not specified"];
    const dlRows = (data.downloadRows || []).map((r) => [
      r.title || r.file,
      r.total,
      ...sexCols.map((s) => (r.sex && r.sex[s]) || 0),
      (r.sex && r.sex["Not specified"]) || 0,
    ]);
    wrap.appendChild(dashCard("Downloads per file (sex-disaggregated)",
      analyticsTable(dlHeaders, dlRows),
      csvBtn("CSV", () => downloadCsv("downloads-per-file-sdd.csv", dlHeaders, dlRows))
    ));

    // Chatbot most-asked questions
    const qHeaders = ["Question", "Times asked", "Matched topic"];
    const qRows = (data.topQuestions || []).map((q) => [q.query, q.count, q.matched || "(no match)"]);
    wrap.appendChild(dashCard("Chatbot — most-asked questions",
      analyticsTable(qHeaders, qRows),
      csvBtn("CSV", () => downloadCsv("chatbot-questions.csv", qHeaders, qRows))
    ));

    // Registered users
    const uHeaders = ["Name", "Email", "Sex", "Age group", "Affiliation", "Downloads", "Registered"];
    const uRows = (data.users || []).map((u) => [
      u.name || "\u2014",
      u.email,
      u.sex,
      u.ageGroup,
      u.affiliation,
      u.downloads,
      String(u.registeredAt).slice(0, 10),
    ]);
    wrap.appendChild(dashCard(`Registered users (${uRows.length})`,
      analyticsTable(uHeaders, uRows),
      csvBtn("CSV", () => downloadCsv("registered-users-sdd.csv", uHeaders, uRows))
    ));

    wrap.appendChild(el("p", { class: "dash-note" },
      "Tip: use the CSV buttons to attach sex-disaggregated data (SDD) to your GAD accomplishment reports and PCW submissions."));
  })();

  return wrap;
}

/* ---------- KMS deliverables tracker ---------- */
const KMS_DELIVERABLES = [
  { key: "gpb", label: "GAD Plan & Budget (GPB)", basis: "PCW MC 2025-05, Annex B", section: "gpb", check: (d) => (d.gpb || []).length },
  { key: "accomplishments", label: "GAD Accomplishment Reports", basis: "PCW MC 2025-05, Annex B", section: "accomplishments", check: (d) => (d.accomplishments || []).length },
  { key: "agenda", label: "GAD Agenda / Strategic Priorities", basis: "PCW MC 2025-05, Annex B", section: "agenda", check: (d) => ((d.agenda || {}).points || []).length || ((d.agenda || {}).body ? 1 : 0) },
  { key: "estadoNiJuana", label: "Estado ni Juana Report", basis: "PCW MC 2025-05, Annex B", section: "estadoNiJuana", check: (d) => ((d.estadoNiJuana || {}).file || (d.estadoNiJuana || {}).body) ? 1 : 0 },
  { key: "strategicPlan", label: "GAD Strategic Plan", basis: "PCW MC 2025-05, Annex B", section: "strategicPlan", check: (d) => ((d.strategicPlan || {}).file ? 1 : 0) },
  { key: "knowledge", label: "Knowledge Products (laws, IEC, modules, statistics)", basis: "PCW MC 2025-05, Annex B", section: "knowledge", check: (d) => { const k = d.knowledge || {}; return (k.laws || []).length + (k.policies || []).length + (k.genderStats || []).length + (k.modules || []).length; } },
  { key: "policies", label: "Policies & Issuances (circulars, resolutions, memoranda)", basis: "PCW MC 2025-05, Annex B", section: "policies", check: (d) => { const p = d.policies || {}; return (p.circulars || []).length + (p.resolutions || []).length + (p.memoranda || []).length + (p.officeOrders || []).length; } },
  { key: "news", label: "GAD News & Announcements", basis: "PCW MC 2025-05, Annex B", section: "news", check: (d) => (d.news || []).length },
  { key: "paps", label: "GAD Programs, Activities & Projects (PAPs)", basis: "PCW MC 2025-05, Annex B", section: "paps", check: (d) => (d.paps || []).length },
  { key: "gfps", label: "GFPS Directory / Organizational Chart", basis: "PCW MC 2025-05, Annex B", section: "gfps", check: (d) => ((d.gfps || {}).members || []).length || ((d.gfps || {}).chartImage ? 1 : 0) },
  { key: "feedback", label: "Feedback Mechanism", basis: "PCW MC 2025-05, Annex B", section: "feedback", check: (d) => ((d.feedback || {}).formUrl || (d.feedback || {}).email) ? 1 : 0 },
  { key: "trackingMatrix", label: "Tracking Matrix (Annex A)", basis: "PCW MC 2025-05, Annex A", section: "trackingMatrix", check: (d) => (d.trackingMatrix || []).length },
  { key: "chatbot", label: "Chatbot Knowledge Base (KMS aid)", basis: "University KMS initiative", section: "chatbot", check: (d) => (d.chatbot || []).length },
];

function renderKmsSection() {
  const wrap = el("div", {});

  const rows = KMS_DELIVERABLES.map((del) => {
    const count = del.check(draft) || 0;
    const posted = count > 0;
    return { del, count, posted };
  });
  const postedCount = rows.filter((r) => r.posted).length;

  wrap.appendChild(el("div", { class: "stat-grid" }, [
    statCard("Deliverables posted", `${postedCount} / ${rows.length}`, true),
    statCard("Completion", `${Math.round((postedCount / rows.length) * 100)}%`),
    statCard("Tracking matrix entries", (draft.trackingMatrix || []).length),
  ]));

  // Last tracking matrix update
  const tm = (draft.trackingMatrix || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if (tm) {
    wrap.appendChild(el("p", { class: "dash-note" },
      `Last GAD Corner update logged: ${tm.date || "(no date)"} — ${tm.description || ""}${tm.person ? " (" + tm.person + ")" : ""}`));
  }

  const table = el("div", { class: "table-wrap" }, [
    el("table", { class: "data-table kms-table" }, [
      el("thead", {}, el("tr", {}, ["Deliverable", "Basis", "Status", "Items", ""].map((h) => el("th", {}, h)))),
      el("tbody", {}, rows.map(({ del, count, posted }) =>
        el("tr", {}, [
          el("td", {}, del.label),
          el("td", { class: "kms-basis" }, del.basis),
          el("td", {}, el("span", { class: "kms-status " + (posted ? "ok" : "missing") }, posted ? "Posted" : "Missing")),
          el("td", {}, String(count)),
          el("td", {}, el("button", {
            class: "btn btn-ghost btn-sm", type: "button",
            onclick: () => showSection(del.section),
          }, "Manage")),
        ])
      )),
    ]),
  ]);

  const csvExport = csvBtn("CSV", () => downloadCsv("kms-deliverables-status.csv",
    ["Deliverable", "Basis", "Status", "Items"],
    rows.map(({ del, count, posted }) => [del.label, del.basis, posted ? "Posted" : "Missing", count])));

  wrap.appendChild(dashCard("GAD Corner deliverables status", table, csvExport));
  wrap.appendChild(el("p", { class: "dash-note" },
    "This matrix tracks the knowledge products and deliverables vital to the University GAD implementation. \"Missing\" items link straight to the CMS section where you can add them."));
  return wrap;
}

/* ---------- sidebar (mobile) ---------- */
function openSidebar() {
  document.getElementById("cms-nav").classList.add("open");
  document.getElementById("sidebar-backdrop").classList.add("show");
}
function closeSidebar() {
  const nav = document.getElementById("cms-nav");
  if (nav) nav.classList.remove("open");
  const bd = document.getElementById("sidebar-backdrop");
  if (bd) bd.classList.remove("show");
}
document.getElementById("menu-btn").addEventListener("click", () => {
  const nav = document.getElementById("cms-nav");
  if (nav.classList.contains("open")) closeSidebar(); else openSidebar();
});
document.getElementById("sidebar-backdrop").addEventListener("click", closeSidebar);

/* ---------- save ---------- */
document.getElementById("save-btn").addEventListener("click", async () => {
  const btn = document.getElementById("save-btn");
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  try {
    const res = await api("/api/content", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed.");
    dirty = false;
    const s = document.getElementById("save-status");
    s.textContent = "All changes saved";
    s.className = "save-status saved";
    showToast("Content saved", "success");
  } catch (e) {
    showToast(e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save changes";
  }
});

window.addEventListener("beforeunload", (e) => {
  if (dirty) { e.preventDefault(); e.returnValue = ""; }
});

/* ---------- boot ---------- */
async function startCms() {
  const res = await api("/api/content", { cache: "no-store" });
  draft = await res.json();
  document.getElementById("login-view").hidden = true;
  document.getElementById("cms-view").hidden = false;
  renderCms();
}

(async function boot() {
  if (token()) {
    try { await startCms(); return; } catch {}
  }
  document.getElementById("login-view").hidden = false;
  document.getElementById("cms-view").hidden = true;
})();
