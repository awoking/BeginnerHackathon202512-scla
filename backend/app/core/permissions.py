from sqlalchemy.orm import Session
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.user import User

# NOTE: 簡易版の権限チェック。後でキャッシュや複雑なロールに拡張予定。

ROLE_ADMIN = "ADMIN"
ROLE_VIEWER = "VIEWER"


def user_project_role(db: Session, user_id: int, project_id: int | None) -> str | None:
    """ユーザーのプロジェクト内ロールを返す。未参加なら None。
    将来はプロジェクト非所属でも自分のタスクなら許可する等の分岐を追加予定。
    """
    if project_id is None:
        return None
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )
    return member.role if member else None


def can_view_task(db: Session, user: User, task: Task) -> bool:
    """閲覧許可: 作成者 or 担当者 or プロジェクトADMIN。
    VIEWERも閲覧可にする場合はここで許可。"""
    if task.created_by == user.id or task.assignee_id == user.id:
        return True
    role = user_project_role(db, user.id, task.project_id)
    return role == ROLE_ADMIN or role == ROLE_VIEWER


def can_modify_task(db: Session, user: User, task: Task) -> bool:
    """変更許可（ステータス変更以外の操作）:
    - プロジェクトタスク: メンバーかつ（作成者 or ADMIN or 担当者）。
      要件: VIEWERはステータス変更のみ許可。編集は不可。
    - 非プロジェクトタスク: 作成者のみ。
    """
    if task.created_by == user.id:
        return True
    role = user_project_role(db, user.id, task.project_id)
    return task.created_by == user.id or role == ROLE_ADMIN or task.assignee_id == user.id

def can_change_status(db: Session, user: User, task: Task) -> bool:
    """ステータス変更許可:
    - プロジェクトタスク: メンバーかつ（ADMIN or VIEWER or 作成者 or 担当者）。
      要件: VIEWERはステータス変更のみ可。
    - 非プロジェクトタスク: 作成者 or 担当者。
    """
    role = user_project_role(db, user.id, task.project_id)
    if task.project_id is not None:
        if role is None:
            return False
        return role in (ROLE_ADMIN, ROLE_VIEWER) or task.created_by == user.id or task.assignee_id == user.id
    return task.created_by == user.id or task.assignee_id == user.id
