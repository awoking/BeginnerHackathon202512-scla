from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.permissions import can_view_task, can_modify_task, can_change_status
from app.database.session import get_db
from app.models.task import Task
from app.models.user import User
from app.models.task_history import TaskHistory
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.schemas.task import (
    TaskCreate,
    TaskRead,
    TaskStatusUpdate,
    TaskAssigneeUpdate,
    TaskPriorityUpdate,
    TaskUpdate,
    TaskWithProjectRead,
)
from datetime import datetime
from zoneinfo import ZoneInfo


router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # すべてのタスクはプロジェクト配下。メンバーのみ作成可能。
    from app.core.permissions import user_project_role
    role = user_project_role(db, current_user.id, task_in.project_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="プロジェクトメンバーのみタスク作成可能です")

    project = db.query(Project).filter(Project.id == task_in.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="プロジェクトが見つかりません")

    auto_assignee_id = task_in.assignee_id
    if task_in.assignee_id is None:
        # 作成者以外のメンバーがいない場合、担当者を作成者に自動設定
        other_members = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project.id, ProjectMember.user_id != project.creator_id)
            .count()
        )
        if other_members == 0:
            auto_assignee_id = project.creator_id

    task = Task(
        title=task_in.title,
        description=task_in.description,
        deadline=task_in.deadline,
        project_id=task_in.project_id,
        parent_id=task_in.parent_id,
        status=task_in.status or "not_started",
        priority=task_in.priority or 0,
        assignee_id=auto_assignee_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    # 履歴記録（CREATE）
    history = TaskHistory(
        task_id=task.id,
        user_id=current_user.id,
        action_type="CREATE",
        changes=f"title={task.title}"
    )
    db.add(history)
    db.commit()

    now = datetime.now(ZoneInfo("Asia/Tokyo"))
    if task.deadline:
        # deadlineにJST情報を付与して比較可能にする
        deadline_aware = task.deadline.replace(tzinfo=ZoneInfo("Asia/Tokyo"))
        # 期限が現在より前なら揶揄う
        if deadline_aware < now:
            raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="計画性がありません"  # ここでふざける
            )

    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # タスクを取得
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="タスクが見つかりません"
        )

    # 権限チェック（作成者/担当者/ADMIN/VIEWER）
    if not can_view_task(db, current_user, task):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このタスクを閲覧する権限がありません"
        )

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # タスクを取得
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="タスクが見つかりません"
        )

    # 権限チェック（作成者 or ADMIN）
    if not can_modify_task(db, current_user, task):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このタスクを削除する権限がありません"
        )

    # 履歴記録（DELETE）
    history = TaskHistory(
        task_id=task.id,
        user_id=current_user.id,
        action_type="DELETE",
        changes=None,
    )
    db.add(history)
    db.delete(task)
    db.commit()

    return None


@router.get("/{task_id}/children", response_model=list[TaskRead])
def list_children(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = db.query(Task).filter(Task.id == task_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="親タスクが見つかりません")
    if not can_view_task(db, current_user, parent):
        raise HTTPException(status_code=403, detail="権限がありません")
    return parent.children


@router.get("/projects/{project_id}/roots", response_model=list[TaskRead])
def list_project_roots(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # プロジェクトのトップレベルタスク（parent_id が NULL）
    tasks = db.query(Task).filter(Task.project_id == project_id, Task.parent_id == None).all()  # noqa: E711
    # 任意で: 閲覧可能なものに絞る（簡易フィルター）
    visible = [t for t in tasks if can_view_task(db, current_user, t)]
    return visible


@router.get("/projects/{project_id}", response_model=list[TaskRead])
def list_project_tasks(
    project_id: int,
    status: str | None = None,
    assignee_id: int | None = None,
    priority: int | None = None,
    parent_id: int | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """プロジェクト内のタスク一覧。
    - メンバーのみ閲覧可。VIEWER/ADMIN/所有者を想定。
    - 未来拡張: 合計件数 total を返すレスポンス型に変更予定。
    """
    from app.core.permissions import user_project_role, ROLE_ADMIN, ROLE_VIEWER
    role = user_project_role(db, current_user.id, project_id)
    # 所有者も許可（Project.owner_idチェックは簡易化のため省略。projects.get で担保想定）
    if role is None:
        raise HTTPException(status_code=403, detail="プロジェクトメンバーのみ閲覧可能です")

    q = db.query(Task).filter(Task.project_id == project_id)
    if parent_id is not None:
        q = q.filter(Task.parent_id == parent_id)
    if status is not None:
        q = q.filter(Task.status == status)
    if assignee_id is not None:
        q = q.filter(Task.assignee_id == assignee_id)
    if priority is not None:
        q = q.filter(Task.priority == priority)
    if search:
        # 簡易検索（タイトル・説明の部分一致）。後で全文検索に拡張予定。
        like = f"%{search}%"
        q = q.filter((Task.title.ilike(like)) | (Task.description.ilike(like)))

    q = q.order_by(Task.updated_at.desc())
    items = q.offset(offset).limit(limit).all()

    # 念のため各タスクに対して閲覧権限チェック（ロールの差分対応用）
    visible = [t for t in items if can_view_task(db, current_user, t)]
    return visible


@router.get("/assigned/me", response_model=list[TaskWithProjectRead])
def list_my_assigned_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 自分が担当のタスクをプロジェクト情報付きで返す
    tasks = (
        db.query(Task, Project)
        .join(Project, Task.project_id == Project.id)
        .filter(Task.assignee_id == current_user.id)
        .order_by(Task.updated_at.desc())
        .all()
    )

    result = []
    for task, project in tasks:
        result.append({
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "deadline": task.deadline,
            "project_id": task.project_id,
            "parent_id": task.parent_id,
            "status": task.status,
            "priority": task.priority,
            "assignee_id": task.assignee_id,
            "created_by": task.created_by,
            "updated_by": task.updated_by,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "project_name": project.name,
            "project_creator_username": project.creator.username if project.creator else "Unknown",
        })
    return result


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    # ステータスは VIEWER も変更可（要メンバー）。担当者・作成者・ADMINも可。
    if not can_change_status(db, current_user, task):
        raise HTTPException(status_code=403, detail="権限がありません（ステータス変更）")
    old = task.status
    task.status = payload.status
    task.updated_by = current_user.id
    db.add(task)
    db.commit()
    db.refresh(task)
    db.add(TaskHistory(task_id=task.id, user_id=current_user.id, action_type="STATUS_CHANGE", changes=f"{old} -> {task.status}"))
    db.commit()
    return task


@router.patch("/{task_id}/assignee", response_model=TaskRead)
def update_assignee(
    task_id: int,
    payload: TaskAssigneeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    if not can_modify_task(db, current_user, task):
        raise HTTPException(status_code=403, detail="権限がありません")
    old = task.assignee_id
    task.assignee_id = payload.assignee_id
    task.updated_by = current_user.id
    db.add(task)
    db.commit()
    db.refresh(task)
    db.add(TaskHistory(task_id=task.id, user_id=current_user.id, action_type="ASSIGNEE_CHANGE", changes=f"{old} -> {task.assignee_id}"))
    db.commit()
    return task


@router.patch("/{task_id}/priority", response_model=TaskRead)
def update_priority(
    task_id: int,
    payload: TaskPriorityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    if not can_modify_task(db, current_user, task):
        raise HTTPException(status_code=403, detail="権限がありません")
    old = task.priority
    task.priority = payload.priority
    task.updated_by = current_user.id
    db.add(task)
    db.commit()
    db.refresh(task)
    db.add(TaskHistory(task_id=task.id, user_id=current_user.id, action_type="PRIORITY_CHANGE", changes=f"{old} -> {task.priority}"))
    db.commit()
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")
    if not can_modify_task(db, current_user, task):
        raise HTTPException(status_code=403, detail="権限がありません")

    before = {
        "title": task.title,
        "description": task.description,
        "deadline": task.deadline,
        "priority": task.priority,
        "assignee_id": task.assignee_id,
        "parent_id": task.parent_id,
    }

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.deadline is not None:
        task.deadline = payload.deadline
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.assignee_id is not None:
        task.assignee_id = payload.assignee_id
    if payload.parent_id is not None:
        task.parent_id = payload.parent_id

    task.updated_by = current_user.id
    db.add(task)
    db.commit()
    db.refresh(task)

    changes = []
    for k in before:
        after_val = getattr(task, k)
        if before[k] != after_val:
            changes.append(f"{k}:{before[k]}->{after_val}")
    if changes:
        db.add(TaskHistory(task_id=task.id, user_id=current_user.id, action_type="UPDATE", changes=", ".join(changes)))
        db.commit()

    return task
