# Deploying esign-mvp to a public URL

Goal: a live URL you can send to a reviewer so they can run the **whole** flow
themselves — upload a PDF, place fields, send to their own email, click the
signing link, sign, and download the completed PDF.

The app uses **SQLite + local PDF files**, so it needs a host with a
**persistent disk** (the DB and PDFs must survive restarts so a signing link
emailed now still works when clicked later). Both options below provide that.

The code is already host-ready:

- `DATABASE_URL` → point at a file on the disk (`file:/data/app.db`).
- `UPLOAD_DIR` → a folder on the disk (`/data/uploads`).
- `APP_URL` → auto-derived from the host's public URL (`RENDER_EXTERNAL_URL` on
  Render, `RAILWAY_PUBLIC_DOMAIN` on Railway), so email links are correct with
  no manual step. You can still set `APP_URL` explicitly to override.

---

## Option A — Render (Blueprint, recommended)

A `render.yaml` Blueprint is included. A persistent disk on Render requires a
paid instance (**Starter, ~$7/mo**) — reliable and the best impression.

1. Push this repo to GitHub (already done).
2. Go to <https://dashboard.render.com> → **New → Blueprint**.
3. Connect the repo `farahfarchoukh/esign-mvp`. Render reads `render.yaml` and
   proposes the `esign-mvp` web service with a 1 GB disk at `/data`.
4. Click **Apply**. First build runs the Dockerfile (~5–8 min).
5. **Set email env vars** (Service → Environment): `SMTP_HOST=smtp.gmail.com`,
   `SMTP_PORT=587`, `SMTP_USER=<your gmail>`, `SMTP_PASS=<gmail app password>`,
   `MAIL_FROM=<your gmail>`. Save → it redeploys.
   *(Skip these to demo with Ethereal preview links instead of real email.)*
6. Open the service URL (e.g. `https://esign-mvp.onrender.com`). Done.

**Free, single-session variant:** in `render.yaml` delete the `disk:` block and
set `plan: free`. Works for one continuous sitting, but data resets when the
free instance sleeps (~15 min idle) or redeploys — so a link emailed and opened
much later may 404. Fine for a live walkthrough, not for "try it whenever."

---

## Option B — Railway (volume, low/no cost)

Railway includes a starter credit and supports volumes.

1. <https://railway.app> → **New Project → Deploy from GitHub repo** → pick the repo.
   Railway builds from the `Dockerfile` automatically.
2. **Add a Volume** (service → **+ Volume**) mounted at **`/data`**.
3. **Variables** (service → Variables):
   - `DATABASE_URL=file:/data/app.db`
   - `UPLOAD_DIR=/data/uploads`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (as above)
   - `PORT=3000`
4. **Settings → Networking → Generate Domain** to get a public URL. Railway sets
   `RAILWAY_PUBLIC_DOMAIN`, which the app uses for email links automatically.
5. Open the generated URL. Done.

---

## After deploying — quick smoke test

1. Open the URL, enter **your own** email as sender, drag in
   `samples/CORE-Cashless-Service-Agreement.pdf`.
2. In the editor add a recipient (use a second email you can open), click
   **Auto-place sample fields**, then **Save & Send**.
3. Open the signing email, click the link, sign, submit.
4. Confirm the sender gets the "Completed" email and the signed PDF downloads.

## Security

- **Never commit SMTP creds.** Set them only in the host's dashboard. `.env` is
  gitignored.
- After the assessment, **revoke the Gmail App Password**
  (<https://myaccount.google.com/apppasswords>).

## Why not Vercel?

Vercel's filesystem is ephemeral and serverless instances don't share state, so
SQLite + local PDF files won't work there without first swapping to **Postgres +
object storage (S3)** — see *Production notes* in the README.
