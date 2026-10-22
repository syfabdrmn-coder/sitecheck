from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import case, func, select, text
from sqlalchemy.orm import Session

from . import models, schemas
from .config import CLIENT_URLS
from .database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Creates the tables if they don't exist yet (same structure as database/schema.sql).
    # This means a brand-new, empty database works straight away, for example on Render.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="SiteCheck API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CLIENT_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "SiteCheck API is running", "docs": "/docs"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


# ---------- Sites ----------

def _site_with_counts(db: Session, site_id: int | None = None):
    """Sites plus how many inspections each has, and how many failed."""
    query = (
        select(
            models.Site,
            func.count(models.Inspection.id).label("inspection_count"),
            func.count(case((models.Inspection.result == "fail", 1))).label("failed_count"),
        )
        .outerjoin(models.Inspection)
        .group_by(models.Site.id)
        .order_by(models.Site.created_at.desc(), models.Site.id.desc())
    )
    if site_id is not None:
        query = query.where(models.Site.id == site_id)

    results = []
    for site, inspection_count, failed_count in db.execute(query).all():
        out = schemas.SiteOut.model_validate(site)
        out.inspection_count = inspection_count
        out.failed_count = failed_count
        results.append(out)
    return results


@app.get("/api/sites", response_model=list[schemas.SiteOut])
def list_sites(db: Session = Depends(get_db)):
    return _site_with_counts(db)


@app.post("/api/sites", response_model=schemas.SiteOut, status_code=status.HTTP_201_CREATED)
def create_site(payload: schemas.SiteCreate, db: Session = Depends(get_db)):
    site = models.Site(**payload.model_dump())
    db.add(site)
    db.commit()
    db.refresh(site)
    return schemas.SiteOut.model_validate(site)


@app.get("/api/sites/{site_id}", response_model=schemas.SiteOut)
def get_site(site_id: int, db: Session = Depends(get_db)):
    found = _site_with_counts(db, site_id)
    if not found:
        raise HTTPException(status_code=404, detail="Site not found")
    return found[0]


@app.delete("/api/sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(site_id: int, db: Session = Depends(get_db)):
    site = db.get(models.Site, site_id)
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)  # its inspections are deleted too (ON DELETE CASCADE)
    db.commit()


# ---------- Inspections ----------

@app.get("/api/sites/{site_id}/inspections", response_model=list[schemas.InspectionOut])
def list_inspections(site_id: int, db: Session = Depends(get_db)):
    if db.get(models.Site, site_id) is None:
        raise HTTPException(status_code=404, detail="Site not found")
    query = (
        select(models.Inspection)
        .where(models.Inspection.site_id == site_id)
        .order_by(models.Inspection.inspected_on.desc(), models.Inspection.id.desc())
    )
    return db.scalars(query).all()


@app.post(
    "/api/sites/{site_id}/inspections",
    response_model=schemas.InspectionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_inspection(site_id: int, payload: schemas.InspectionCreate, db: Session = Depends(get_db)):
    if db.get(models.Site, site_id) is None:
        raise HTTPException(status_code=404, detail="Site not found")
    data = payload.model_dump(exclude_none=True)
    inspection = models.Inspection(site_id=site_id, **data)
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection


@app.delete("/api/inspections/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(inspection_id: int, db: Session = Depends(get_db)):
    inspection = db.get(models.Inspection, inspection_id)
    if inspection is None:
        raise HTTPException(status_code=404, detail="Inspection not found")
    db.delete(inspection)
    db.commit()
