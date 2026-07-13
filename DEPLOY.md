# Deploying the GAD Corner website

This app is a **Node.js + Express** server with a built-in CMS. It needs a host
that runs Node (not a static-only host like GitHub Pages). Below are the steps
to push it to GitHub and put it live.

---

## 1. Push to GitHub

The project is already a git repository with one commit on the `main` branch.

### Option A — GitHub website (no CLI needed)

1. Go to <https://github.com/new> and create an **empty** repository
   (do **not** add a README, .gitignore, or license). Name it e.g. `gad-corner`.
2. Copy the repo URL, then run in this folder:

```bash
git remote add origin https://github.com/<your-username>/gad-corner.git
git branch -M main
git push -u origin main
```

Git will ask you to sign in to GitHub the first time (a browser window opens).

### Option B — GitHub CLI

```bash
winget install --id GitHub.cli        # install once
gh auth login                         # sign in (browser)
gh repo create gad-corner --private --source . --remote origin --push
```

---

## 2. Deploy live (Render — free, easiest)

Render can build straight from your GitHub repo and there is a `render.yaml`
blueprint included.

1. Sign up at <https://render.com> and connect your GitHub account.
2. Click **New +** > **Blueprint**, pick the `gad-corner` repo, and confirm.
   (Or **New +** > **Web Service**, Build Command `npm install`,
   Start Command `npm start`.)
3. In the service **Environment** settings, set `ADMIN_PASSWORD` to a strong
   password of your choice.
4. Deploy. Your site will be live at `https://gad-corner.onrender.com`
   and the CMS at `https://gad-corner.onrender.com/admin`.

### Important: data persistence

By default the server stores content and uploads on the local filesystem. On
Render's **free** plan that filesystem is **ephemeral**, so CMS edits and
uploaded files reset on every restart/redeploy.

To keep data permanently on the free plan (no credit card required), point the
server at free cloud services using environment variables (see below):

- **MongoDB Atlas** (free M0 cluster) — stores CMS content + admin password.
- **Cloudinary** (free tier) — stores uploaded files (PDFs, images).

When `MONGODB_URI` is set, content/admin live in MongoDB. When Cloudinary vars
are set, uploads go to Cloudinary. If neither is set, the server falls back to
local files (handy for local development).

Alternatively, upgrade to a paid Render instance and enable a disk: uncomment
the `disk` block and the `DATA_DIR` / `UPLOAD_DIR` env vars in `render.yaml`.

---

## 3. Alternative hosts

- **Railway** (<https://railway.app>): "Deploy from GitHub repo", add a Volume
  mounted at `/var/data`, and set `DATA_DIR=/var/data`,
  `UPLOAD_DIR=/var/data/uploads` for persistence.
- **Docker anywhere** (Fly.io, Cloud Run, a VPS): a `Dockerfile` is included.
  ```bash
  docker build -t gad-corner .
  docker run -p 3000:3000 -e ADMIN_PASSWORD=yourpassword gad-corner
  ```

---

## Environment variables

| Variable                  | Purpose                                             | Default        |
| ------------------------- | --------------------------------------------------- | -------------- |
| `PORT`                    | Port the server listens on                          | `3000`         |
| `ADMIN_PASSWORD`          | Initial CMS admin password (set on first boot)      | `gadadmin2025` |
| `MONGODB_URI`             | MongoDB Atlas connection string (persistent content)| _(unset)_      |
| `MONGODB_DB`              | MongoDB database name                               | `gadcorner`    |
| `CLOUDINARY_CLOUD_NAME`   | Cloudinary cloud name (persistent uploads)          | _(unset)_      |
| `CLOUDINARY_API_KEY`      | Cloudinary API key                                  | _(unset)_      |
| `CLOUDINARY_API_SECRET`   | Cloudinary API secret                               | _(unset)_      |
| `DATA_DIR`                | Local folder for `content.json` + `admin.json`      | `./data`       |
| `UPLOAD_DIR`              | Local folder for CMS file uploads                   | `./uploads`    |

> After the first login, change the password from the CMS **Account** section.

## Free persistent setup (MongoDB Atlas + Cloudinary)

1. **MongoDB Atlas** — create a free account at <https://www.mongodb.com/atlas>,
   create a free **M0** cluster, add a database user, allow network access from
   anywhere (`0.0.0.0/0`), then copy the connection string
   (`mongodb+srv://user:pass@cluster.xxxx.mongodb.net/`). Set it as `MONGODB_URI`
   on Render.
2. **Cloudinary** — create a free account at <https://cloudinary.com>. From the
   dashboard copy the **Cloud name**, **API Key**, and **API Secret**, and set
   them as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Redeploy on Render. Content and uploads now persist across restarts.

> Cloudinary's free tier limits a single upload to ~10 MB. For larger files,
> host them elsewhere (e.g. Google Drive) and paste the link into the CMS file
> field directly.
