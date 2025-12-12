from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskHistoryBase(BaseModel):
    task_id: int
    user_id: int
    action_type: str
    changes: Optional[str] = None

class TaskHistoryCreate(TaskHistoryBase):
    pass

class TaskHistory(TaskHistoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
