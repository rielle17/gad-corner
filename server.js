const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Local (fallback) storage paths — used when no MongoDB/Cloudinary is configured.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(ROOT, "uploads");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const SEED_CONTENT = path.join(ROOT, "data", "content.json");

const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "gadadmin2025";

// --- Persistence backends (all optional, auto-detected from env vars) ---
// MongoDB keeps CMS content + admin password across restarts/redeploys.
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "gadcorner";
const USE_MONGO = Boolean(MONGODB_URI);

// Cloudinary keeps uploaded files (PDFs, images) across restarts/redeploys.
const USE_CLOUDINARY = Boolean(
  process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
);

// Only prepare local folders/seed when we actually fall back to the filesystem.
if (!USE_MONGO) {
  for (const dir of [DATA_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(CONTENT_FILE)) {
    if (fs.existsSync(SEED_CONTENT) && SEED_CONTENT !== CONTENT_FILE) {
      fs.copyFileSync(SEED_CONTENT, CONTENT_FILE);
    } else if (!fs.existsSync(SEED_CONTENT)) {
      fs.writeFileSync(CONTENT_FILE, JSON.stringify({ site: {} }, null, 2));
    }
  }
}
if (!USE_CLOUDINARY && !fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function seedContent() {
  if (fs.existsSync(SEED_CONTENT)) {
    try {
      return JSON.parse(fs.readFileSync(SEED_CONTENT, "utf-8"));
    } catch {
      /* fall through */
    }
  }
  return { site: {} };
}

// --- MongoDB connection (lazy, cached) ---
let mongoDbPromise = null;
function getDb() {
  if (!mongoDbPromise) {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(MONGODB_URI);
    mongoDbPromise = client.connect().then((c) => c.db(MONGODB_DB));
  }
  return mongoDbPromise;
}
function getStateColl() {
  return getDb().then((db) => db.collection("state"));
}

// --- Content storage ---
async function readContent() {
  if (USE_MONGO) {
    const coll = await getStateColl();
    const doc = await coll.findOne({ _id: "content" });
    if (!doc) {
      const seed = seedContent();
      await coll.updateOne({ _id: "content" }, { $set: { data: seed } }, { upsert: true });
      return seed;
    }
    return doc.data;
  }
  return JSON.parse(fs.readFileSync(CONTENT_FILE, "utf-8"));
}

async function writeContent(content) {
  if (USE_MONGO) {
    const coll = await getStateColl();
    await coll.updateOne({ _id: "content" }, { $set: { data: content } }, { upsert: true });
    return;
  }
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
}

// --- Admin (password) storage ---
async function loadAdmin() {
  if (USE_MONGO) {
    const coll = await getStateColl();
    const doc = await coll.findOne({ _id: "admin" });
    if (!doc) {
      const salt = crypto.randomBytes(16).toString("hex");
      const admin = { salt, hash: hashPassword(DEFAULT_PASSWORD, salt) };
      await coll.updateOne({ _id: "admin" }, { $set: admin }, { upsert: true });
      return admin;
    }
    return { salt: doc.salt, hash: doc.hash };
  }
  if (!fs.existsSync(ADMIN_FILE)) {
    const salt = crypto.randomBytes(16).toString("hex");
    const admin = { salt, hash: hashPassword(DEFAULT_PASSWORD, salt) };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
    return admin;
  }
  return JSON.parse(fs.readFileSync(ADMIN_FILE, "utf-8"));
}

async function saveAdmin(admin) {
  if (USE_MONGO) {
    const coll = await getStateColl();
    await coll.updateOne(
      { _id: "admin" },
      { $set: { salt: admin.salt, hash: admin.hash } },
      { upsert: true }
    );
    return;
  }
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
}

// --- Analytics storage (visitors + events) ---
// Mongo: `visitors` and `events` collections. Fallback: data/analytics.json.
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");
const MAX_LOCAL_EVENTS = 20000;

function readLocalAnalytics() {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
  } catch {
    return { visitors: {}, events: [] };
  }
}
function writeLocalAnalytics(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (data.events.length > MAX_LOCAL_EVENTS) {
    data.events = data.events.slice(-MAX_LOCAL_EVENTS);
  }
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data));
}

const SEX_VALUES = ["Female", "Male", "Prefer not to say"];
const AGE_GROUPS = ["Below 18", "18-24", "25-34", "35-44", "45-54", "55 and above"];
const AFFILIATIONS = ["Student", "Faculty", "Staff", "Alumni", "Parent/Guardian", "Guest/Other"];

function cleanStr(v, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function saveVisitor(profile) {
  if (USE_MONGO) {
    const db = await getDb();
    await db.collection("visitors").updateOne(
      { _id: profile.id },
      { $set: { ...profile, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return;
  }
  const data = readLocalAnalytics();
  const existing = data.visitors[profile.id] || { createdAt: new Date().toISOString() };
  data.visitors[profile.id] = { ...existing, ...profile, updatedAt: new Date().toISOString() };
  writeLocalAnalytics(data);
}

async function getVisitor(id) {
  if (!id) return null;
  if (USE_MONGO) {
    const db = await getDb();
    return db.collection("visitors").findOne({ _id: id });
  }
  return readLocalAnalytics().visitors[id] || null;
}

async function logEvent(event) {
  const doc = { ...event, ts: new Date() };
  if (USE_MONGO) {
    const db = await getDb();
    await db.collection("events").insertOne(doc);
    return;
  }
  const data = readLocalAnalytics();
  data.events.push({ ...doc, ts: doc.ts.toISOString() });
  writeLocalAnalytics(data);
}

async function hasVisitToday(visitorId) {
  const dayKey = new Date().toISOString().slice(0, 10);
  if (USE_MONGO) {
    const db = await getDb();
    const found = await db.collection("events").findOne({ type: "visit", visitorId, dayKey });
    return Boolean(found);
  }
  const data = readLocalAnalytics();
  return data.events.some((e) => e.type === "visit" && e.visitorId === visitorId && e.dayKey === dayKey);
}

async function getAllEvents() {
  if (USE_MONGO) {
    const db = await getDb();
    return db.collection("events").find({}).sort({ ts: 1 }).limit(100000).toArray();
  }
  return readLocalAnalytics().events;
}

async function getAllVisitors() {
  if (USE_MONGO) {
    const db = await getDb();
    return db.collection("visitors").find({}).toArray();
  }
  const v = readLocalAnalytics().visitors;
  return Object.keys(v).map((id) => ({ _id: id, ...v[id] }));
}

// Cached public counters so the badge endpoint stays cheap.
let publicStatsCache = { data: null, at: 0 };
async function getPublicStats() {
  if (publicStatsCache.data && Date.now() - publicStatsCache.at < 60000) {
    return publicStatsCache.data;
  }
  let visits = 0;
  let visitors = 0;
  if (USE_MONGO) {
    const db = await getDb();
    visits = await db.collection("events").countDocuments({ type: "visit" });
    const distinct = await db.collection("events").distinct("visitorId", { type: "visit" });
    visitors = distinct.length;
  } else {
    const data = readLocalAnalytics();
    const visitEvents = data.events.filter((e) => e.type === "visit");
    visits = visitEvents.length;
    visitors = new Set(visitEvents.map((e) => e.visitorId)).size;
  }
  publicStatsCache = { data: { visits, visitors }, at: Date.now() };
  return publicStatsCache.data;
}

// --- Cloudinary setup ---
let cloudinary = null;
if (USE_CLOUDINARY) {
  cloudinary = require("cloudinary").v2;
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function uploadToCloudinary(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const resourceType = IMAGE_EXT.has(ext) ? "image" : "raw";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "gad-corner",
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

// --- Simple in-memory session tokens ---
const sessions = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 8; // 8 hours

function issueToken() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function isValidToken(token) {
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!isValidToken(token)) {
    return res.status(401).json({ error: "Unauthorized. Please log in again." });
  }
  next();
}

app.use(express.json({ limit: "10mb" }));

// --- Auth endpoints ---
app.post("/api/login", async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== "string") {
    return res.status(400).json({ error: "Password is required." });
  }
  try {
    const admin = await loadAdmin();
    const attempt = hashPassword(password, admin.salt);
    const ok =
      attempt.length === admin.hash.length &&
      crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(admin.hash));
    if (!ok) {
      return res.status(401).json({ error: "Incorrect password." });
    }
    res.json({ token: issueToken() });
  } catch (err) {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

app.post("/api/logout", requireAuth, (req, res) => {
  const token = (req.headers.authorization || "").slice(7);
  sessions.delete(token);
  res.json({ ok: true });
});

app.post("/api/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  try {
    const admin = await loadAdmin();
    const attempt = hashPassword(currentPassword || "", admin.salt);
    const ok =
      attempt.length === admin.hash.length &&
      crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(admin.hash));
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    const salt = crypto.randomBytes(16).toString("hex");
    await saveAdmin({ salt, hash: hashPassword(newPassword, salt) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Unable to change password." });
  }
});

// --- Content endpoints ---
app.get("/api/content", async (req, res) => {
  try {
    res.json(await readContent());
  } catch (err) {
    res.status(500).json({ error: "Unable to read content." });
  }
});

app.put("/api/content", requireAuth, async (req, res) => {
  const content = req.body;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return res.status(400).json({ error: "Invalid content payload." });
  }
  try {
    await writeContent(content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Unable to save content." });
  }
});

// --- Analytics endpoints ---
app.post("/api/register", async (req, res) => {
  const { visitorId, name, email, sex, ageGroup, affiliation } = req.body || {};
  const cleanEmail = cleanStr(email, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  if (!SEX_VALUES.includes(sex)) {
    return res.status(400).json({ error: "Please select your sex." });
  }
  if (!AGE_GROUPS.includes(ageGroup)) {
    return res.status(400).json({ error: "Please select your age group." });
  }
  if (!AFFILIATIONS.includes(affiliation)) {
    return res.status(400).json({ error: "Please select your affiliation." });
  }
  const id = /^[a-f0-9-]{8,64}$/i.test(visitorId || "") ? visitorId : crypto.randomUUID();
  try {
    await saveVisitor({ id, name: cleanStr(name, 120), email: cleanEmail, sex, ageGroup, affiliation });
    res.json({ ok: true, visitorId: id });
  } catch (err) {
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

app.post("/api/track/visit", async (req, res) => {
  const { visitorId } = req.body || {};
  const id = /^[a-f0-9-]{8,64}$/i.test(visitorId || "") ? visitorId : null;
  if (!id) return res.status(400).json({ error: "Invalid visitor id." });
  try {
    if (!(await hasVisitToday(id))) {
      const visitor = await getVisitor(id);
      await logEvent({
        type: "visit",
        visitorId: id,
        dayKey: new Date().toISOString().slice(0, 10),
        sex: visitor ? visitor.sex : "",
        ageGroup: visitor ? visitor.ageGroup : "",
        affiliation: visitor ? visitor.affiliation : "",
      });
      publicStatsCache = { data: null, at: 0 };
    }
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.post("/api/track/download", async (req, res) => {
  const { visitorId, file, title, category } = req.body || {};
  try {
    const visitor = await getVisitor(visitorId);
    if (!visitor || !visitor.email) {
      return res.status(403).json({ error: "Please register before downloading files." });
    }
    await logEvent({
      type: "download",
      visitorId,
      file: cleanStr(file, 400),
      title: cleanStr(title, 200),
      category: cleanStr(category, 100),
      email: visitor.email,
      sex: visitor.sex || "",
      ageGroup: visitor.ageGroup || "",
      affiliation: visitor.affiliation || "",
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Unable to record download." });
  }
});

app.post("/api/track/chat", async (req, res) => {
  const { visitorId, query, matched } = req.body || {};
  try {
    const visitor = await getVisitor(visitorId);
    await logEvent({
      type: "chat",
      visitorId: cleanStr(visitorId, 64),
      query: cleanStr(query, 300),
      matched: cleanStr(matched, 120),
      sex: visitor ? visitor.sex : "",
      affiliation: visitor ? visitor.affiliation : "",
    });
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.get("/api/stats/public", async (req, res) => {
  try {
    res.json(await getPublicStats());
  } catch (err) {
    res.json({ visits: 0, visitors: 0 });
  }
});

function tally(list, key, buckets) {
  const out = {};
  for (const b of buckets) out[b] = 0;
  out["Not specified"] = 0;
  for (const item of list) {
    const v = item[key];
    if (v && out[v] !== undefined) out[v] += 1;
    else out["Not specified"] += 1;
  }
  return out;
}

app.get("/api/admin/analytics", requireAuth, async (req, res) => {
  try {
    const [events, visitors] = await Promise.all([getAllEvents(), getAllVisitors()]);
    const visits = events.filter((e) => e.type === "visit");
    const downloads = events.filter((e) => e.type === "download");
    const chats = events.filter((e) => e.type === "chat");

    // Visits per day (last 30 days)
    const perDay = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      perDay[new Date(now - i * 86400000).toISOString().slice(0, 10)] = 0;
    }
    for (const v of visits) {
      const day = v.dayKey || String(v.ts).slice(0, 10);
      if (perDay[day] !== undefined) perDay[day] += 1;
    }

    // Downloads grouped by file with SDD split
    const byFile = {};
    for (const d of downloads) {
      const key = d.file || d.title || "(unknown)";
      if (!byFile[key]) {
        byFile[key] = { file: d.file || "", title: d.title || d.file || "(unknown)", category: d.category || "", total: 0, sex: {} };
        for (const s of SEX_VALUES) byFile[key].sex[s] = 0;
        byFile[key].sex["Not specified"] = 0;
      }
      byFile[key].total += 1;
      const s = SEX_VALUES.includes(d.sex) ? d.sex : "Not specified";
      byFile[key].sex[s] += 1;
      if (d.title && !byFile[key].title) byFile[key].title = d.title;
    }
    const downloadRows = Object.values(byFile).sort((a, b) => b.total - a.total);

    // Chatbot: most-asked questions
    const chatCounts = {};
    for (const c of chats) {
      const q = (c.query || "").toLowerCase();
      if (!q) continue;
      if (!chatCounts[q]) chatCounts[q] = { query: c.query, count: 0, matched: c.matched || "" };
      chatCounts[q].count += 1;
    }
    const topQuestions = Object.values(chatCounts).sort((a, b) => b.count - a.count).slice(0, 30);

    // Registered users list (most recent first)
    const users = visitors
      .filter((v) => v.email)
      .map((v) => ({
        name: v.name || "",
        email: v.email,
        sex: v.sex || "",
        ageGroup: v.ageGroup || "",
        affiliation: v.affiliation || "",
        registeredAt: v.createdAt || "",
        downloads: downloads.filter((d) => d.visitorId === v._id).length,
      }))
      .sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)));

    res.json({
      totals: {
        visits: visits.length,
        uniqueVisitors: new Set(visits.map((v) => v.visitorId)).size,
        registeredUsers: users.length,
        downloads: downloads.length,
        chatQuestions: chats.length,
      },
      visitsPerDay: perDay,
      visitorsBySex: tally(users, "sex", SEX_VALUES),
      visitorsByAge: tally(users, "ageGroup", AGE_GROUPS),
      visitorsByAffiliation: tally(users, "affiliation", AFFILIATIONS),
      downloadsBySex: tally(downloads, "sex", SEX_VALUES),
      downloadRows,
      topQuestions,
      users,
      meta: { sexValues: SEX_VALUES, ageGroups: AGE_GROUPS, affiliations: AFFILIATIONS },
    });
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).json({ error: "Unable to build analytics report." });
  }
});

// --- File uploads ---
const ALLOWED_EXT = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
]);

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base =
      path
        .basename(file.originalname, ext)
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "file";
    const stamp = Date.now().toString(36);
    cb(null, `${base}-${stamp}${ext}`);
  },
});

const upload = multer({
  storage: USE_CLOUDINARY ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: (USE_CLOUDINARY ? 10 : 60) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error("File type not allowed."));
    }
    cb(null, true);
  },
});

app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    if (USE_CLOUDINARY) {
      try {
        const result = await uploadToCloudinary(req.file);
        return res.json({
          ok: true,
          path: result.secure_url,
          name: req.file.originalname,
          size: req.file.size,
        });
      } catch (e) {
        return res.status(500).json({ error: "Cloud upload failed. Please try again." });
      }
    }
    res.json({
      ok: true,
      path: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
    });
  });
});

app.get("/api/uploads", requireAuth, async (req, res) => {
  if (USE_CLOUDINARY) {
    // Files live in Cloudinary; the CMS stores their URLs directly in content.
    return res.json([]);
  }
  const files = fs
    .readdirSync(UPLOAD_DIR)
    .filter((f) => !f.startsWith("."))
    .map((f) => {
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      return { path: `/uploads/${f}`, name: f, size: stat.size, modified: stat.mtimeMs };
    })
    .sort((a, b) => b.modified - a.modified);
  res.json(files);
});

// --- Static serving with guards ---
const BLOCKED = [
  /^\/server\.js/i,
  /^\/package(-lock)?\.json/i,
  /^\/node_modules/i,
  /^\/data(\/|$)/i,
  /^\/\.git/i,
];

app.use((req, res, next) => {
  const decoded = decodeURIComponent(req.path);
  if (BLOCKED.some((re) => re.test(decoded))) {
    return res.status(404).send("Not found");
  }
  next();
});

// Serve locally uploaded files (only relevant when not using Cloudinary).
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(ROOT, { index: "index.html", extensions: ["html"] }));

app.listen(PORT, async () => {
  try {
    // Warm up connections and ensure the admin + content records exist.
    await loadAdmin();
    await readContent();
  } catch (err) {
    console.error("Startup initialization error:", err.message);
  }
  const store = USE_MONGO ? "MongoDB" : "local files";
  const files = USE_CLOUDINARY ? "Cloudinary" : "local uploads";
  console.log(`GAD Corner running at http://localhost:${PORT}`);
  console.log(`Admin CMS at        http://localhost:${PORT}/admin`);
  console.log(`Content store: ${store} | File store: ${files}`);
});
