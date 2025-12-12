from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectRead(ProjectBase):
    id: int
    creator_id: int
    creator_username: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectMemberBase(BaseModel):
    role: str  # ADMIN / VIEWER（後でEnumに変更予定）

class ProjectMemberCreate(BaseModel):
    username: str  # ユーザー名で招待
    role: str  # ADMIN / VIEWER

class ProjectMemberUpdate(BaseModel):
    role: str  # ADMIN / VIEWER

class ProjectMemberRead(ProjectMemberBase):
    id: int
    project_id: int
    user_id: int
    username: str  # ユーザー名も含める
    invited_at: datetime

    class Config:
        from_attributes = True
