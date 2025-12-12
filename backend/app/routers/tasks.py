from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.permissions import can_view_task, can_modify_task
from app.database.session import get_db
from app.models.task import Task
from app.models.user import User
from app.models.task_history import TaskHistory
from app.schemas.task import TaskCreate, TaskRead


router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 新モデルに合わせて作成者・任意の関連を設定
    task = Task(
        title=task_in.title,
        description=task_in.description,
        deadline=task_in.deadline,
        project_id=task_in.project_id,
        parent_id=task_in.parent_id,
        status=task_in.status or "not_started",
        priority=task_in.priority or 0,
        assignee_id=task_in.assignee_id,
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

    return task


@router.get("/", response_model=list[TaskRead])
def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 自分が作成した、または担当のタスクを取得
    tasks = (
        db.query(Task)
        .filter((Task.created_by == current_user.id) | (Task.assignee_id == current_user.id))
        .all()
    )
    return tasks


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


from app.schemas.task import TaskStatusUpdate, TaskAssigneeUpdate, TaskPriorityUpdate


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
    if not can_modify_task(db, current_user, task):
        raise HTTPException(status_code=403, detail="権限がありません")
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
