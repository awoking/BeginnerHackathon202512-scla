from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectRead(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectMemberBase(BaseModel):
    user_id: int
    role: str  # ADMIN / VIEWER（後でEnumに変更予定）

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMemberRead(ProjectMemberBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True
