from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class SavedScreener(Base):
    __tablename__ = "saved_screeners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    conditions = Column(Text, nullable=False)       # JSON-serialised list of condition dicts
    sort_by = Column(String, default="score")
    sort_order = Column(String, default="desc")      # "asc" or "desc"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
