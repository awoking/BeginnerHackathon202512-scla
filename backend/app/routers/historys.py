from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.core.permissions import ROLE_ADMIN, ROLE_VIEWER, user_project_role
from app.schemas.project import (
    ProjectCreate, ProjectRead, ProjectUpdate,
    ProjectMemberCreate, ProjectMemberUpdate, ProjectMemberRead,
)
from app.models.task_history import TaskHistory
from app.schemas.task_history import TaskHistoryCreate, TaskHistoryRead

router = APIRouter(prefix="/hitosty", tags=["history"])

@router.get("/{task_id}_history", response_model=list[TaskHistoryRead])
def get_history()
