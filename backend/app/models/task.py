from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, backref
from datetime import datetime,timezone
from app.database.session import Base
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    # プロジェクト紐付け（必須：すべてのタスクはプロジェクト配下）
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    # 階層構造（親参照）。NULLなら親タスク。
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # 期限（タイムゾーンはUTC想定）。必要ならTZ対応に改良予定。
    deadline = Column(DateTime, nullable=True)

    # ステータス（例: not_started / in_progress / completed）
    status = Column(String, default="not_started")

    # 優先度（0=未設定）。後でEnumに置換予定。
    priority = Column(Integer, default=0)

    # 担当者（プロジェクトメンバーのユーザー）
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # 作成・更新者
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(JST))
    updated_at = Column(DateTime, default=lambda: datetime.now(JST), onupdate=lambda: datetime.now(JST))


    # リレーション
    project = relationship("Project", back_populates="tasks")
    parent = relationship(
        "Task",
        remote_side=[id],
        backref=backref("children", cascade="all, delete-orphan")
    )
    assignee = relationship("User", foreign_keys=[assignee_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    # 将来の拡張用プレースホルダー
    # owner = relationship("User", foreign_keys=[created_by])
    # 他の関連付けは必要に応じて追加
