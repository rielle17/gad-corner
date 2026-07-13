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

- The **free** plan has an **ephemeral filesystem** — content edited in the CMS
  and any uploaded files are reset whenever the service restarts or redeploys.
  This is fine for a demo/preview.
- For a **persistent live site**, upgrade to a paid instance and enable a disk:
  uncomment the `disk` block and the `DATA_DIR` / `UPLOAD_DIR` env vars in
  `render.yaml`, then redeploy. The server auto-seeds `content.json` onto the
  disk on first boot.

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

| Variable         | Purpose                                            | Default        |
| ---------------- | -------------------------------------------------- | -------------- |
| `PORT`           | Port the server listens on                         | `3000`         |
| `ADMIN_PASSWORD` | Initial CMS admin password (set on first boot)     | `gadadmin2025` |
| `DATA_DIR`       | Folder for `content.json` + `admin.json`           | `./data`       |
| `UPLOAD_DIR`     | Folder for CMS file uploads                         | `./uploads`    |

> After the first login, change the password from the CMS **Account** section.
