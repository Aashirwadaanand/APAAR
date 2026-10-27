# Render Deployment & Operations Guide — SIH26263 APAAR Enrolment Integrity Platform

This guide provides instructions for deploying the **APAAR ID-Based Student Data Management and Verification Platform** onto [Render](https://render.com).

---

## 1. Architecture Overview

- **Backend:** FastAPI (Python 3.11) Web Service running with Uvicorn.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS Static Site.
- **Database:** SQLite with Persistent Storage mounted at `/var/data/apaar_institute.db`.
- **Integrity Baseline:** 3 synthetic AICTE-approved institutions and 63 synthetic student records with deliberate edge cases for evaluation.

---

## 2. Prerequisites & GitHub Preparation

### Push Code to Your GitHub Repository
1. Initialize git and commit the prepared files (local databases and virtual environments are automatically excluded by `.gitignore`):
   ```bash
   git add .
   git commit -m "Prepare SIH26263 for Render deployment with persistent SQLite and dynamic API routing"
   ```
2. Link to your GitHub repository (e.g., `APAAR`) and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/Aashirwadaanand/APAAR.git
   git push -u origin main
   ```

---

## 3. Option A — Automated Deployment via Render Blueprint (`render.yaml`)

The repository includes a ready-to-use [render.yaml](file:///c:/Users/aashirwad/Desktop/SIH2026/render.yaml) file:

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository (`APAAR`).
4. Render will parse `render.yaml` and configure:
   - `apaar-integrity-backend` Web Service with 1GB persistent disk at `/var/data`.
   - `apaar-integrity-frontend` Static Site with SPA rewrite rules.
5. In the Blueprint review screen, verify the services and click **Apply** (`VITE_API_BASE_URL` is automatically wired to the backend host via Blueprint `fromService` cross-linking).


---

## 4. Option B — Manual Step-by-Step Deployment

### Step 1: Deploy the FastAPI Backend Web Service
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `apaar-integrity-backend` (or your chosen name)
   - **Region:** Singapore / Frankfurt / Oregon (select closest to your judges)
   - **Branch:** `main`
   - **Root Directory:** *(leave blank for repository root)*
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Starter` ($7/mo — required for persistent disks)
4. Configure **Persistent Disk**:
   - Scroll to **Disks** section and click **Add Disk**.
   - **Name:** `apaar-persistent-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB`
5. Configure **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Matches tested runtime |
   | `DATABASE_PATH` | `/var/data/apaar_institute.db` | Persistent SQLite file path |
   | `ENVIRONMENT` | `production` | Enables production safeguards |
   | `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Will update in Step 3 |
6. Configure **Health Check**:
   - **Health Check Path:** `/api/health`
7. Click **Create Web Service**. Wait for the build to finish. Copy your backend URL:
   - Example: `https://apaar-integrity-backend.onrender.com`

---

### Step 2: Deploy the React Frontend Static Site
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `apaar-integrity-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Configure **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://apaar-integrity-backend.onrender.com` | Deployed backend public URL from Step 1 |
5. Configure **Redirects/Rewrites (SPA Routing)**:
   - The build automatically outputs `dist/_redirects` (`/* /index.html 200`).
   - In Render Static Site **Redirects/Rewrites**, you can also add:
     - **Type:** `Rewrite`
     - **Source:** `/*`
     - **Destination:** `/index.html`
6. Click **Create Static Site**.
7. Once deployed, copy your frontend public URL:
   - Example: `https://apaar-integrity-frontend.onrender.com`

---

### Step 3: Complete CORS Origin Binding
1. Go back to your backend service: `apaar-integrity-backend` -> **Environment**.
2. Update `CORS_ORIGINS` to include your live frontend URL:
   ```
   CORS_ORIGINS=https://apaar-integrity-frontend.onrender.com,http://localhost:5173
   ```
   *(Or set `FRONTEND_URL=https://apaar-integrity-frontend.onrender.com`)*
3. Click **Save Changes**. Render will automatically redeploy the backend with the new allowed origin.

---

## 5. Persistent Storage & Demo Reset Operation

### Normal Startup Behavior
- When the container starts, the application checks if the persistent database already contains records.
- If records exist (e.g. 63 students), **the existing database is untouched and preserved**.
- If starting on a brand-new, empty persistent disk (0 records), the app automatically populates the initial demo dataset (3 institutions, 63 synthetic students, 7 active integrity cases).

### Resetting Demo Data Locally
To restore the pristine demo baseline on your local machine:
```bash
python backend/reset_demo.py
```

### Resetting Demo Data in Production (Protected Safeguard)
Running `reset_demo.py` against a production or persistent database is **intentionally blocked** by default to protect live evaluation data.

If you intentionally want to reset the production database back to pristine demo state:
- **Option 1 (Render SSH / Shell):**
  ```bash
  python backend/reset_demo.py --confirm-production-reset
  ```
- **Option 2 (Environment Variable):**
  Set `ALLOW_PRODUCTION_DEMO_RESET=true` in Render backend environment variables, trigger manual deploy/run, then remove the variable.

---

## 6. Security & Demonstration Disclosures

1. **Authentication Scope:** Write endpoints (e.g. manual student enrollment, CSV upload, integrity case resolution) do not require authentication tokens in this hackathon demonstration to eliminate login friction for judges. For production government deployment, OAuth 2.0 / OpenID Connect with AICTE institutional credentials and RBAC must be added.
2. **Synthetic Data Disclosure:** All student names, birthdates, and APAAR identifiers are synthetic test fixtures generated with Verhoeff-compliant checksums. No real Aadhaar or student data is present.
3. **Simulated Sandbox:** Verification adapters simulate response states (demographic match, central registry timeout, consent denial). They do not interface with live UIDAI, DigiLocker, or ABC production infrastructure.
