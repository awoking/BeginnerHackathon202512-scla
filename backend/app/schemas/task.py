from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    # 期限（ISO8601, UTC推奨）。後でTZ対応に改良予定。
    deadline: Optional[datetime] = None

    # プロジェクト紐付け（必須：すべてのタスクはプロジェクト配下）
    project_id: int
    # 階層構造（親参照）。NULLなら親タスク。
    parent_id: Optional[int] = None

    # 初期ステータス/優先度
    status: Optional[str] = None  # not_started / in_progress / completed
    priority: Optional[int] = None  # 0=未設定（後でEnumへ）
    assignee_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskRead(TaskBase):
    id: int
    project_id: int
    created_by: int
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class TaskStatusUpdate(BaseModel):
    status: str  # not_started / in_progress / completed

class TaskAssigneeUpdate(BaseModel):
    assignee_id: Optional[int] = None

class TaskPriorityUpdate(BaseModel):
    priority: int  # 後でEnum化予定（1/2/3など）。今は整数。

    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[int] = None
    assignee_id: Optional[int] = None
    parent_id: Optional[int] = None
