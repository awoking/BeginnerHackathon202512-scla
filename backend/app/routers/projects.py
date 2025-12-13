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

router = APIRouter(prefix="/projects", tags=["projects"])


@router.delete(
    "/{project_id}/members/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="プロジェクトから脱退（自分自身）",
    description="認証済みユーザーが、指定されたプロジェクトから脱退します。プロジェクト作成者（creator）は脱退できません。",
)
def leave_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. プロジェクトの存在確認
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="プロジェクトが見つかりません。",
        )

    # 2. プロジェクト作成者（creator_id）は脱退できない
    if project.creator_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="プロジェクト作成者（オーナー）は脱退できません。プロジェクトを削除するか、オーナー権限を移譲する必要があります。",
        )

    # 3. 自分の ProjectMember レコードを検索
    member_record = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.user_id == current_user.id,
            ProjectMember.project_id == project_id
        )
        .first()
    )

    if not member_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="このプロジェクトに参加していません。",
        )
        
    # 4. 担当タスクをプロジェクト作成者に付け替える (remove_memberのロジックを踏襲)
    tasks_to_reassign = (
        db.query(Task)
        .filter(Task.project_id == project_id, Task.assignee_id == current_user.id)
        .all()
    )
    
    for task in tasks_to_reassign:
        # 担当者をプロジェクト作成者（creator_id）に変更
        task.assignee_id = project.creator_id
        task.updated_by = current_user.id # 最終更新者を自分にする
        db.add(task)
        # 注: 担当者変更の履歴 (TaskHistory) 記録はここでは省略します。

    # 5. メンバーシップレコードを削除
    db.delete(member_record)
    db.commit()

    # 成功時には 204 No Content を返す
    return None


def project_to_read(project: Project):
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "creator_id": project.creator_id,
        "creator_username": project.creator.username if project.creator else "Unknown",
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }


@router.post("/", response_model=ProjectRead)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # プロジェクト作成。作成者をOWNER/ADMIN相当としてメンバーに登録。
    project = Project(name=payload.name, description=payload.description, creator_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    # 作成者をADMINでメンバー登録
    member = ProjectMember(project_id=project.id, user_id=current_user.id, role=ROLE_ADMIN)
    db.add(member)
    db.commit()

    db.refresh(project)
    return project_to_read(project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    # 変更は所有者またはADMINに限定
    if not (project.creator_id == current_user.id or role == ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="権限がありません")

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description

    db.add(project)
    db.commit()
    db.refresh(project)
    return project_to_read(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    if not (project.creator_id == current_user.id or role == ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="権限がありません")

    # メンバーとタスクはモデル側のリレーションでcascade delete設定済み想定
    db.delete(project)
    db.commit()
    return None


@router.get("/", response_model=list[ProjectRead])
def list_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 自分が所有 or メンバーのプロジェクト一覧
    owned = db.query(Project).filter(Project.creator_id == current_user.id)
    joined_ids = [pm.project_id for pm in db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()]
    joined = db.query(Project).filter(Project.id.in_(joined_ids)) if joined_ids else []
    results = list(owned.all()) + (list(joined) if isinstance(joined, list) else list(joined.all()))
    # 重複排除
    uniq = {p.id: p for p in results}
    return [project_to_read(p) for p in uniq.values()]


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
    if not (project.creator_id == current_user.id or role in (ROLE_ADMIN, ROLE_VIEWER)):
        raise HTTPException(status_code=403, detail="閲覧権限がありません")
    return project_to_read(project)


@router.post("/{project_id}/members/invite", response_model=ProjectMemberRead)
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
    if not (project.creator_id == current_user.id or role == ROLE_ADMIN):
        raise HTTPException(status_code=403, detail="招待権限がありません")

    # ユーザー名でユーザーを検索
    from app.models.user import User
    target_user = db.query(User).filter(User.username == payload.username).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    # 既存メンバー重複チェック
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == target_user.id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="既にメンバーです")

    # ロール値検証
    if payload.role not in (ROLE_ADMIN, ROLE_VIEWER):
        raise HTTPException(status_code=400, detail="無効なロールです")

    member = ProjectMember(project_id=project_id, user_id=target_user.id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    # レスポンスに username を含める
    return {
        "id": member.id,
        "project_id": member.project_id,
        "user_id": member.user_id,
        "role": member.role,
        "invited_at": member.invited_at,
        "username": target_user.username,
    }


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
    if not (project.creator_id == current_user.id or role in (ROLE_ADMIN, ROLE_VIEWER)):
        raise HTTPException(status_code=403, detail="閲覧権限がありません")
    
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    # usernameを含めるために追加情報を付与
    result = []
    for member in members:
        member_dict = {
            "id": member.id,
            "project_id": member.project_id,
            "user_id": member.user_id,
            "role": member.role,
            "invited_at": member.invited_at,
            "username": member.user.username if member.user else "Unknown"
        }
        result.append(member_dict)
    return result


@router.patch("/{project_id}/members/{member_id}", response_model=ProjectMemberRead)
def change_member_role(
    project_id: int,
    member_id: int,
    payload: ProjectMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    role = user_project_role(db, current_user.id, project.id)
    # 変更権限はプロジェクトの ADMIN のみ（所有者でもADMINでなければ不可）
    if role != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="ロール変更はADMINのみ許可されています")

    member = db.query(ProjectMember).filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    # プロジェクト作成者のロールは常にADMINに固定
    if member.user_id == project.creator_id:
        if payload.role != ROLE_ADMIN:
            raise HTTPException(status_code=400, detail="プロジェクト作成者のロールは変更できません")
        member.role = ROLE_ADMIN
        db.add(member)
        db.commit()
        db.refresh(member)
        return {
            "id": member.id,
            "project_id": member.project_id,
            "user_id": member.user_id,
            "role": member.role,
            "invited_at": member.invited_at,
            "username": member.user.username if member.user else "Unknown",
        }

    # ロール値検証（将来 Enum 化で厳密化予定）
    if payload.role not in (ROLE_ADMIN, ROLE_VIEWER):
        raise HTTPException(status_code=400, detail="無効なロールです")
    
    member.role = payload.role
    db.add(member)
    db.commit()
    db.refresh(member)

    # ProjectMemberRead で要求される username を含めて返却
    return {
        "id": member.id,
        "project_id": member.project_id,
        "user_id": member.user_id,
        "role": member.role,
        "invited_at": member.invited_at,
        "username": member.user.username if member.user else "Unknown",
    }


@router.delete("/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")

    role = user_project_role(db, current_user.id, project.id)
    if role != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="メンバー削除はADMINのみ許可されています")

    member = db.query(ProjectMember).filter(ProjectMember.id == member_id, ProjectMember.project_id == project_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    # プロジェクト作成者の強制削除は許可しない（必要ならロール変更のみ）
    if member.user_id == project.creator_id:
        raise HTTPException(status_code=400, detail="プロジェクト作成者は削除できません")

    # 担当タスクをプロジェクト作成者に付け替える
    tasks = (
        db.query(Task)
        .filter(Task.project_id == project_id, Task.assignee_id == member.user_id)
        .all()
    )
    for task in tasks:
        task.assignee_id = project.creator_id
        task.updated_by = current_user.id
        db.add(task)

    db.delete(member)
    db.commit()
    return None
