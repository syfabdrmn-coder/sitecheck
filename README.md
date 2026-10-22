# SiteCheck

A full-stack app for logging construction site inspections. Add sites, record safety, structural,
electrical and plumbing inspections, and see which sites have failures.

| Layer    | Tech                    | Runs at                      |
|----------|-------------------------|------------------------------|
| Frontend | React 18 + Vite         | http://localhost:5173        |
| Backend  | FastAPI + SQLAlchemy 2  | http://localhost:8000/docs   |
| Database | PostgreSQL + pgAdmin    | localhost:5432               |

This project is **not dockerized and not deployed yet**. Doing that is your job; see `LAB.md`.
First, get it running on your own computer with the steps below.

## Folder structure

```
sitecheck/
├── README.md            ← you are here
├── LAB.md               ← your tasks: Docker Compose + Render
├── database/
│   ├── schema.sql       ← creates the tables
│   └── seed.sql         ← sample data
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py      ← API routes
│       ├── config.py    ← reads DATABASE_URL and CLIENT_URL
│       ├── database.py  ← database connection
│       ├── models.py    ← tables as Python classes
│       └── schemas.py   ← what the API accepts and returns
└── frontend/
    ├── package.json
    ├── .env.example
    ├── index.html
    └── src/
        ├── App.jsx      ← the whole UI
        ├── api.js       ← calls the backend, reads VITE_API_URL
        └── styles.css
```

## Part 1: Install the tools (one time)

| Tool | Download | Check it works |
|---|---|---|
| Python 3.12 | https://www.python.org/downloads/ (tick **Add Python to PATH**) | `python --version` |
| Node.js 20 LTS | https://nodejs.org | `node --version` |
| PostgreSQL 16 or newer + pgAdmin | https://www.postgresql.org/download/windows/ (the installer includes pgAdmin) | pgAdmin opens |
| VS Code | https://code.visualstudio.com | |

When the PostgreSQL installer asks for a password for the `postgres` user, **write it down**.
You'll need it below.

## Part 2: Create the database in pgAdmin

1. Open **pgAdmin** and expand **Servers → PostgreSQL** (enter your `postgres` password).
2. Right-click **Databases → Create → Database…**, name it `sitecheck`, and click **Save**.
3. Right-click the new **sitecheck** database and choose **Query Tool**.
4. Click the **Open File** icon, choose `database/schema.sql`, and press **Execute** (F5).
5. Do the same with `database/seed.sql`.
6. Expand **sitecheck → Schemas → public → Tables**. You should see `sites` and `inspections`.
   Right-click **sites → View/Edit Data → All Rows** to see the sample sites.

## Part 3: Run the backend

Open the `sitecheck` folder in VS Code, then open a terminal (**Terminal → New Terminal**):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

On macOS/Linux, use `source .venv/bin/activate` and `cp .env.example .env`.

Open `backend/.env` and replace `YOUR_PASSWORD` with your PostgreSQL password. Then:

```powershell
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs. Try **GET /api/sites → Try it out → Execute**. You should see the sample sites.

If PowerShell says "running scripts is disabled", run this once, then try `activate` again:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

## Part 4: Run the frontend

Open a **second** terminal (the backend must keep running in the first):

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open http://localhost:5173. Pick a site, add an inspection, then check the `inspections` table
in pgAdmin: your new row is there.

The footer shows which API the frontend is talking to. A green dot means it's connected.

## API

| Method | Path | Body |
|---|---|---|
| GET | `/health` | |
| GET | `/api/sites` | |
| POST | `/api/sites` | `{name, location, contractor?}` |
| GET | `/api/sites/{id}` | |
| DELETE | `/api/sites/{id}` | deletes its inspections too |
| GET | `/api/sites/{id}/inspections` | |
| POST | `/api/sites/{id}/inspections` | `{inspector, category, result, notes?, inspected_on?}` |
| DELETE | `/api/inspections/{id}` | |

`category` is `safety`, `structural`, `electrical` or `plumbing`. `result` is `pass` or `fail`.

## How configuration works

The app never hard-codes addresses or passwords. It reads them from environment variables:

| Variable | Used by | Local value | Why it matters later |
|---|---|---|---|
| `DATABASE_URL` | backend | `postgresql://postgres:PASSWORD@localhost:5432/sitecheck` | In Docker and on Render, the database is somewhere else |
| `CLIENT_URL` | backend | `http://localhost:5173` | The backend only accepts browser requests from this address (CORS) |
| `VITE_API_URL` | frontend | `http://localhost:8000` | Baked into the JavaScript **when the frontend is built** |

Keep this table in mind during the lab. Most deployment problems come from one of these three values.
