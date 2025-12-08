from pydantic import BaseModel
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime | None = None

class TaskCreate(TaskBase):
    pass

class TaskRead(TaskBase):
    id: int
    owner_id: int | None = None
    team_id: int | None = None
    created_at: datetime   # ← models と一致

    class Config:
        from_attributes = True
