from pydantic import BaseModel
from datetime import datetime
#共通項目
class TaskBase(BaseModel):
    title:str
    description: str | None = None
    deadline: datetime | None = None
    #descripiton,deadlineは送られてなくても問題ない

#入力用
class TaskCreate(TaskBase):
    pass

#レスポンス用
class TaskRead(TaskBase):
    id: int
    ownerid: int
    createdtime:datetime

