# CvSU-CCAT GAD Corner (Dynamic Website + CMS)

A dynamic **Gender and Development (GAD) Corner** website with a built-in
content management system (CMS), built to comply with **PCW Memorandum
Circular No. 2025-05 – Guidelines on the Establishment of GAD Corner**
(Digital GAD Corner) and its Annex B suggested wireframe.

## Features

- **Dynamic front-end** – all content is served from `data/content.json` through a REST API and rendered client-side.
- **Built-in CMS** (`/admin`) – password-protected editor for every section, with file/image uploads.
- **PCW-compliant structure** – includes all Section 5.0 minimum contents:
  News & Announcements, GAD Agenda, GAD Plan and Budget, Accomplishment Reports,
  Estado ni Juana Report, PAPs, Knowledge Products & IEC (laws, policies, gender
  statistics, modules), GFPS organizational structure, Awards, Partnerships,
  Social media links, Knowledge Management System link, Feedback mechanism,
  GFPS contact details, and a Tracking Matrix (Annex A).
- **Prominent Downloads section** – every uploaded file is listed and searchable.
- **Accessibility** – text-resize, high-contrast mode, keyboard-friendly navigation.
- Fully responsive (desktop, tablet, mobile).

## Requirements

- Node.js 18+ (tested on Node 24)

## Getting started

```bash
npm install
npm start
```

Then open:

- Website: <http://localhost:3000>
- CMS admin: <http://localhost:3000/admin>

### Default CMS password

```
gadadmin2025
```

Change it immediately from **Account & Password** in the CMS. The password is
stored (salted + hashed) in `data/admin.json`, which is created on first run.

## How content works

- All content lives in `data/content.json`.
- The public site reads it via `GET /api/content`.
- The CMS saves changes via `PUT /api/content` (auth required).
- Uploaded files are stored in `uploads/` and served at `/uploads/...`.
- Existing resources (the `downloadable files/`, `accomplishment reports/`, and
  `2025 PHOTOS/` folders, plus the root images) are served at their real paths
  and already referenced in the seeded content.

## Project structure

```
index.html      Front-end shell
app.js          Front-end rendering (fetches the API)
styles.css      Front-end styles
admin.html      CMS shell
admin.js        CMS logic (schema-driven editor)
admin.css       CMS styles
server.js       Express server (API, auth, uploads, static)
data/           content.json (content store) + admin.json (credentials)
uploads/        CMS-uploaded files
```

## Notes

- To change the port: `PORT=8080 npm start` (or set the `PORT` environment variable).
- Reference documents: `PCW MC 2025 -05 Guidelines on the Establishment of GAD Corner.pdf`
  and `PCW Guidelines on the Establishment of GAD Corner - Annexes.pdf`.
