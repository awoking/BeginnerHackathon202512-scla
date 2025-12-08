from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # 個人タスク
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # チームタスク
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    owner = relationship("User", back_populates="tasks")
    team = relationship("Team", back_populates="tasks")
