from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class TaskHistory(Base):
    __tablename__ = "task_histories"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # action_type: CREATE / UPDATE / DELETE / STATUS_CHANGE / ASSIGNEE_CHANGE / PRIORITY_CHANGE
    action_type = Column(String, nullable=False)

    # JSON or text summary of changes
    changes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task")
    user = relationship("User")
