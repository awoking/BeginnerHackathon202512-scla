from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.core.permissions import ROLE_ADMIN, ROLE_VIEWER, user_project_role
from app.schemas.project import (
    ProjectCreate, ProjectRead,
    ProjectMemberCreate, ProjectMemberRead,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectRead)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # プロジェクト作成。作成者をOWNER/ADMIN相当としてメンバーに登録。
    project = Project(name=payload.name, description=payload.description, owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    # 作成者をADMINでメンバー登録
    member = ProjectMember(project_id=project.id, user_id=current_user.id, role=ROLE_ADMIN)
    db.add(member)
    db.commit()

    return project


@router.get("/", response_model=list[ProjectRead])
def list_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 自分が所有 or メンバーのプロジェクト一覧
    owned = db.query(Project).filter(Project.owner_id == current_user.id)
    joined_ids = [pm.project_id for pm in db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()]
    joined = db.query(Project).filter(Project.id.in_(joined_ids)) if joined_ids else []
    results = list(owned.all()) + (list(joined) if isinstance(joined, list) else list(joined.all()))
    # 重複排除
    uniq = {p.id: p for p in results}
    return list(uniq.values())


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    # 閲覧は VIEWER 以上許可（JOIN 済み想定）。所有者も可。
    if not (project.owner_id == current_user.id or role in (ROLE_ADMIN, ROLE_VIEWER)):
        raise HTTPException(status_code=403, detail="閲覧権限がありません")
    return project


@router.post("/{project_id}/members", response_model=ProjectMemberRead)
def invite_member(
    project_id: int,
    payload: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    # 招待は ADMIN のみ許可。所有者は ADMIN 相当。
    if not (project.owner_id == current_user.id or role == ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="招待権限がありません")

    # 既存メンバー重複チェック
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == payload.user_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="既にメンバーです")

    member = ProjectMember(project_id=project_id, user_id=payload.user_id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/{project_id}/members", response_model=list[ProjectMemberRead])
def list_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    if not (project.owner_id == current_user.id or role in (ROLE_ADMIN, ROLE_VIEWER)):
        raise HTTPException(status_code=403, detail="閲覧権限がありません")
    return db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()


@router.patch("/{project_id}/members/{member_id}", response_model=ProjectMemberRead)
def change_member_role(
    project_id: int,
    member_id: int,
    new_role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    if not (project.owner_id == current_user.id or role == ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="権限がありません")

    member = db.query(ProjectMember).filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    # 値検証は将来 Enum 化で厳密化予定
    member.role = new_role
    db.add(member)
    db.commit()
    db.refresh(member)
    return member
