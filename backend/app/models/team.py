from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.session import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    #名前で管理するので一意性を持たせる。

    #双方向の紐付け
    tasks = relationship("Task", back_populates="team")
    memberships = relationship("Membership", back_populates="team")

