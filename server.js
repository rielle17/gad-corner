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
let mongoCollPromise = null;
function getStateColl() {
  if (!mongoCollPromise) {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(MONGODB_URI);
    mongoCollPromise = client
      .connect()
      .then((c) => c.db(MONGODB_DB).collection("state"));
  }
  return mongoCollPromise;
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
