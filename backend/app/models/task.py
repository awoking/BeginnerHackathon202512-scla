from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from app.database.session import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
        project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # 階層構造（親参照）。NULLなら親タスク。
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
        # deadline = Column(DateTime, nullable=True)

    # ステータス（NOT_STARTED / IN_PROGRESS / COMPLETED）
        status = Column(String, default="not_started")

    # 優先度（1,2,3）
    priority = Column(Integer, nullable=True)
        priority = Column(Integer, default=0)

    # 担当者（プロジェクトメンバーのユーザー）
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # 作成・更新者
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

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
        # relationships
        owner = relationship("User", foreign_keys=[created_by])
        # Add additional relationships if necessary
