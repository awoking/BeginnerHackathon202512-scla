from sqlalchemy import Column, Integer, String, DateTime,Text,Table, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base #sessionで定義した親クラスを参照している。

class Task(Base):
    id = Column(Integer, primary_key=True)
    title = Column(Integer,index=True)
    createdtime = Column(DateTime)
    description = Column(Text)
    deadline = Column(DateTime)
    
    #個人タスク
    ownerid = Column(String, ForeignKey("users.id"), index=True, nullable=True)
    #チームタスク
    ownerid = Column(String,ForeignKey("teams.id"),index=True, nullable=True)
    #nullableはデータなしでも構わないということ。ForeignKeyはこの項目のデータが別のテーブルのidであることを保証している
    
    #リレーション（Python側の便利リンク）
    owner = relationship("User", back_populates="tasks")
    team = relationship("Team", back_populates="tasks")


#中間テーブル
reders = Table(
    "reders",
    Base.metadate,
    Column("task_id", Integer, ForeignKey("tasks.id"),index=True),
    Column("userid", Integer, ForeignKey("user.id"),index=True),
)




