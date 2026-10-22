# Lab: Dockerize SiteCheck and deploy it on Render (free tier)

**Goal:** take an app that only runs on your laptop, package it with Docker, run the whole stack
with one command, then put it on the internet for free.

**Before you start:** finish `README.md` so the app works on your computer without Docker.

| Part | You will build | Checkpoint |
|---|---|---|
| 1 | `backend/Dockerfile` | API runs in a container |
| 2 | `frontend/Dockerfile` + `nginx.conf` | UI runs in a container |
| 3 | `docker-compose.yml` with **db, backend, frontend, pgAdmin** | `docker compose up` runs everything |
| 4 | GitHub repo | Code is pushed, no secrets |
| 5 | `render.yaml` blueprint on the **free tier** | Live URL works |
| 6 | pgAdmin → Render database | You can see live data |

Install **Docker Desktop** (https://www.docker.com/products/docker-desktop) and make sure it says
*Engine running* before Part 1.

---

## Part 1: Backend Dockerfile

Create `backend/Dockerfile`.

**Requirements**
- Start from `python:3.12-slim`.
- Copy `requirements.txt` and install it **before** copying the code. (Why? Docker caches each
  step. If only your code changes, the slow `pip install` step is reused.)
- Copy the `app` folder.
- Start uvicorn on host `0.0.0.0` and port `$PORT`, defaulting to `8000`.
  Render tells your app which port to use through the `PORT` variable.

Also create `backend/.dockerignore` so `.venv`, `__pycache__` and `.env` are **not** copied into the image.

**Hints**
- `127.0.0.1` inside a container means "this container only". `0.0.0.0` means "accept connections from outside".
- To use a variable in `CMD`, run it through a shell:
  `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]`

**Checkpoint**

Your local PostgreSQL from the README must be running. From the `sitecheck` folder:

```powershell
docker build -t sitecheck-backend ./backend
docker run --rm -p 8000:8000 -e DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@host.docker.internal:5432/sitecheck sitecheck-backend
```

Open http://localhost:8000/health and you should see `{"status":"ok"}`.

> **Think:** why `host.docker.internal` and not `localhost`?

---

## Part 2: Frontend Dockerfile

Create `frontend/Dockerfile` using a **multi-stage build**:

1. **Stage 1 (`node:20-alpine`):** copy `package*.json`, run `npm install`, copy the rest, run `npm run build`.
   This produces plain HTML/CSS/JS files in `dist/`.
2. **Stage 2 (`nginx:alpine`):** copy `dist/` into `/usr/share/nginx/html`. Nginx serves the files on port 80.

**Requirements**
- Accept the backend address as a build argument: `ARG VITE_API_URL` then `ENV VITE_API_URL=$VITE_API_URL`,
  **before** `npm run build`.
- Add a small `frontend/nginx.conf` that serves `index.html` for any unknown path (`try_files $uri /index.html;`).
- Add `frontend/.dockerignore` with `node_modules`, `dist` and `.env`.

> **Think:** `VITE_API_URL` is a *build* argument, not a normal environment variable. What happens
> if you change it after the image is built?

**Checkpoint**

```powershell
docker build -t sitecheck-frontend --build-arg VITE_API_URL=http://localhost:8000 ./frontend
docker run --rm -p 5173:80 sitecheck-frontend
```

With the Part 1 backend still running, open http://localhost:5173.

---

## Part 3: Docker Compose (db + backend + frontend + pgAdmin)

Create `docker-compose.yml` in the `sitecheck` folder with **four services**.

| Service | Image / build | Port on your PC | Notes |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `5433` → 5432 | user, password and database name via `POSTGRES_*` variables |
| `backend` | `./backend` | `8000` → 8000 | `DATABASE_URL` must point at the **`db` service** |
| `frontend` | `./frontend` | `5173` → 80 | pass `VITE_API_URL` as a build arg |
| `pgadmin` | `dpage/pgadmin4` | `5050` → 80 | needs `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` |

**Requirements**
- Store the database in a **named volume** so data survives `docker compose down`.
- Mount `./database` into the db container at `/docker-entrypoint-initdb.d` so `schema.sql` and
  `seed.sql` run automatically the **first** time the database starts.
- Add a **healthcheck** to `db` (`pg_isready`), and make `backend` wait for it
  (`depends_on: db: condition: service_healthy`).
- Add `restart: on-failure` to `backend`.

**Hints**
- Inside Compose, containers find each other by **service name**. The backend's database host is `db`, not `localhost`.
- Why `5433` and not `5432`? Your PostgreSQL from the README already uses 5432 on your PC.
  Two programs can't share a port. Inside the Docker network, the database still uses 5432.
- The browser runs on **your PC**, not inside Docker. So `VITE_API_URL` is `http://localhost:8000`, not `http://backend:8000`.

**Checkpoint**

```powershell
docker compose up --build
```

- http://localhost:5173 shows the app with the sample sites.
- http://localhost:5050 opens pgAdmin. Register a server with **host `db`, port `5432`**, and
  the user and password from your Compose file. You should see the `sitecheck` tables.

> **Think:** your **desktop** pgAdmin connects to this database at `localhost:5433`, but the
> **pgAdmin container** uses `db:5432`. Why are they different?

Useful commands:

| Command | What it does |
|---|---|
| `docker compose up --build` | Rebuild images after changing code, then start |
| `docker compose up` | Start using existing images |
| `docker compose ps` | List containers and their status |
| `docker compose logs backend` | Show one service's logs |
| `docker compose down` | Stop and remove containers (data kept) |
| `docker compose down -v` | Same, **and delete the database volume** |

---

## Part 4: Push to GitHub

1. Create an empty repo on GitHub (no README, no .gitignore).
2. In the `sitecheck` folder:

```powershell
git init
git add .
git commit -m "SiteCheck with Docker Compose"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/sitecheck.git
git push -u origin main
```

**Checkpoint:** on GitHub, check that **no `.env` file** and **no `node_modules`** were uploaded.

---

## Part 5: Deploy on Render (free tier)

Create `render.yaml` in the `sitecheck` folder describing three things:

| Resource | Type | Settings |
|---|---|---|
| `sitecheck-db-YOURNAME` | `databases:` | `plan: free`, `region: singapore` |
| `sitecheck-backend-YOURNAME` | web service, `runtime: docker` | `plan: free`, `region: singapore`, `dockerContext: ./backend`, `dockerfilePath: ./backend/Dockerfile`, `healthCheckPath: /health` |
| `sitecheck-frontend-YOURNAME` | web service, `runtime: static` | `rootDir: frontend`, `buildCommand: npm install && npm run build`, `staticPublishPath: dist` |

**Environment variables**
- Backend `DATABASE_URL`: use `fromDatabase` with `property: connectionString`. Never paste the password.
- Backend `CLIENT_URL`: your frontend's Render URL.
- Frontend `VITE_API_URL`: your backend's Render URL.

**Hints**
- Put **your name** in each service name. Render URLs must be unique across all users. If the name
  is taken, Render adds random characters to the URL, and your `CLIENT_URL` / `VITE_API_URL` will be wrong.
- On Render the frontend is a **static site**: Render runs `npm run build` itself and serves `dist/`.
  Your frontend Dockerfile is only used locally.
- Render does **not** use `docker-compose.yml`. Each service is configured separately.

**Deploy**
1. Push `render.yaml` to GitHub.
2. On https://render.com, sign in with GitHub, then **Blueprints → New Blueprint Instance**, and pick your repo.
3. Check that every item says **Free**, then click **Deploy Blueprint**.
4. Wait until all three are **Live** or **Available** (5–10 minutes the first time).

**Checkpoint**
- `https://<your-backend>.onrender.com/health` shows `{"status":"ok"}`.
- `https://<your-frontend>.onrender.com` loads, and the footer dot is **green**.
- The live database starts **empty**, so add a site through the UI. (Part 6 loads sample data.)

If the URLs Render gave you differ from what you wrote in `render.yaml`, fix the values, commit and
push. Render redeploys automatically.

---

## Part 6: Connect pgAdmin to the Render database

1. In Render, open your database, click **Connect**, then the **External** tab.
2. In desktop pgAdmin, choose **Register → Server**:
   - **Host:** the external hostname (ends in `.singapore-postgres.render.com`)
   - **Port:** `5432`. **Database, Username, Password:** from Render.
   - **Parameters tab → SSL mode:** `require`
3. Open **Query Tool** on the database and run `database/seed.sql`.
4. Refresh your live site. The sample sites appear.

> Do **not** use the *Internal* URL from your laptop. It only works between services inside Render.

> **Never** paste the External URL into chat, screenshots or GitHub. It contains the password.

---

## Troubleshooting (real errors students hit)

| Error | Cause | Fix |
|---|---|---|
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Your local PostgreSQL (or another container) already uses that port | Use `"5433:5432"` for `db`, or stop the other container with `docker ps` and `docker stop <name>` |
| `Bind for 0.0.0.0:8000 failed` | An old project's container is using 8000 | `docker ps`, then `docker stop <name>` |
| `Temporary failure in name resolution` (backend logs) | Backend container is attached to a broken network after a failed start | `docker compose down`, then `docker compose up` |
| Part 1: `no pg_hba.conf entry for host ...` | Your Windows PostgreSQL only accepts connections from 127.0.0.1 | If `docker build` succeeded, your Dockerfile is fine. Move on: Part 3 tests it with its own database container |
| `connection refused` to `localhost:5432` from the backend container | Inside a container, `localhost` is the container itself | Use `db` (Compose) or `host.docker.internal` (Part 1) |
| Page shows "Could not reach the API: Failed to fetch" | `VITE_API_URL` is wrong, or the backend is asleep or failed | Open `<backend>/health` directly. Fix the URL and **rebuild** the frontend |
| Browser console says **CORS** | `CLIENT_URL` on the backend doesn't exactly match the frontend URL | Fix `CLIENT_URL` (no trailing `/`) and redeploy the backend |
| Render: `Not Found` at the backend URL | The URL Render assigned is different (name was taken) | Copy the real URL from the service page |
| pgAdmin to Render: `SSL connection has been closed unexpectedly` | Wrong host (placeholder or internal hostname) or SSL not set | Use the full external hostname and SSL mode `require` |
| Changes don't appear after `docker compose up` | Images still contain the old code | `docker compose up --build` |
| Seed data missing in Compose | `/docker-entrypoint-initdb.d` only runs on an **empty** volume | `docker compose down -v`, then `docker compose up` (deletes local data) |

## Render free tier: what to expect

- The free backend **sleeps** after a period with no traffic. The first visit afterwards takes
  around a minute. That's normal, not a bug.
- The free database is **temporary**: it expires after a limited period, and Render emails you
  before it does. Don't store anything important in it.
- Free resources are limited per account, so each student should deploy from **their own** Render account.
- Check https://render.com/pricing for the current free-tier limits.

## Stretch goals

1. Add a GitHub Actions workflow that builds both Docker images on every push.
2. Add a **"Re-inspect by" date** column: change `schema.sql`, `models.py`, `schemas.py` and the UI.
   How would you add the column to the live Render database without losing data?
3. Replace `create_all` with **Alembic** migrations.
