const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
// DATA_DIR / UPLOAD_DIR can point to a persistent disk in production
// (e.g. DATA_DIR=/var/data). They default to the project folder locally.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(ROOT, "uploads");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const SEED_CONTENT = path.join(ROOT, "data", "content.json");

const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "gadadmin2025";

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// On a fresh persistent disk the content file won't exist yet, so seed it
// from the copy bundled in the repo.
if (!fs.existsSync(CONTENT_FILE)) {
  if (fs.existsSync(SEED_CONTENT) && SEED_CONTENT !== CONTENT_FILE) {
    fs.copyFileSync(SEED_CONTENT, CONTENT_FILE);
  } else if (!fs.existsSync(SEED_CONTENT)) {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify({ site: {} }, null, 2));
  }
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function loadAdmin() {
  if (!fs.existsSync(ADMIN_FILE)) {
    const salt = crypto.randomBytes(16).toString("hex");
    const admin = { salt, hash: hashPassword(DEFAULT_PASSWORD, salt) };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
    return admin;
  }
  return JSON.parse(fs.readFileSync(ADMIN_FILE, "utf-8"));
}

function saveAdmin(admin) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
}

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_FILE, "utf-8"));
}

function writeContent(content) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2));
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

app.use(express.json({ limit: "2mb" }));

// --- Auth endpoints ---
app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== "string") {
    return res.status(400).json({ error: "Password is required." });
  }
  const admin = loadAdmin();
  const attempt = hashPassword(password, admin.salt);
  const ok =
    attempt.length === admin.hash.length &&
    crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(admin.hash));
  if (!ok) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  res.json({ token: issueToken() });
});

app.post("/api/logout", requireAuth, (req, res) => {
  const token = (req.headers.authorization || "").slice(7);
  sessions.delete(token);
  res.json({ ok: true });
});

app.post("/api/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  const admin = loadAdmin();
  const attempt = hashPassword(currentPassword || "", admin.salt);
  const ok =
    attempt.length === admin.hash.length &&
    crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(admin.hash));
  if (!ok) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  saveAdmin({ salt, hash: hashPassword(newPassword, salt) });
  res.json({ ok: true });
});

// --- Content endpoints ---
app.get("/api/content", (req, res) => {
  try {
    res.json(readContent());
  } catch (err) {
    res.status(500).json({ error: "Unable to read content." });
  }
});

app.put("/api/content", requireAuth, (req, res) => {
  const content = req.body;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return res.status(400).json({ error: "Invalid content payload." });
  }
  try {
    writeContent(content);
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
    const stamp = Date.now().toString(36);
    cb(null, `${base}-${stamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error("File type not allowed."));
    }
    cb(null, true);
  },
});

app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    res.json({
      ok: true,
      path: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
    });
  });
});

app.get("/api/uploads", requireAuth, (req, res) => {
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

// Serve uploaded files from UPLOAD_DIR (may live on a persistent disk).
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(ROOT, { index: "index.html", extensions: ["html"] }));

app.listen(PORT, () => {
  loadAdmin();
  console.log(`GAD Corner running at http://localhost:${PORT}`);
  console.log(`Admin CMS at        http://localhost:${PORT}/admin`);
});
