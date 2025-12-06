from sqlalchemy import Column, Integer, String, DateTime,Text
from app.databae.session import Base #sessionで定義した親クラスを参照している。

class Task(Base):
    id = Column(Integer, primary_key=True)
    ownerid = Column(String index=True)
    title = Column(Integer,index=True)
    time = Column(DateTime)
    description = Column(Text)
    deadline = Column(DateTime)
        





