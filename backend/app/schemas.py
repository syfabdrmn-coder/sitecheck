from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal["safety", "structural", "electrical", "plumbing"]
Result = Literal["pass", "fail"]


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)
    contractor: str = Field(default="", max_length=120)


class SiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: str
    contractor: str
    created_at: datetime
    inspection_count: int = 0
    failed_count: int = 0


class InspectionCreate(BaseModel):
    inspector: str = Field(min_length=1, max_length=120)
    category: Category
    result: Result
    notes: str = ""
    inspected_on: date | None = None


class InspectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    site_id: int
    inspector: str
    category: Category
    result: Result
    notes: str
    inspected_on: date
    created_at: datetime
