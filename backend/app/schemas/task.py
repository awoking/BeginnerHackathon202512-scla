from pydantic import BaseModel
from datetime import datetime

class TaskBase(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None

class TaskCreate(TaskBase):
    pass

#ユーザーに見せるよう
class TaskRead(TaskBase):
    id: int
    owner_id: int
    team_id: int | None = None
    created_at: datetime   # ← models と一致
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class TaskUpdate(TaskBase):
    title: str | None = None
    discription:str | None = None
    