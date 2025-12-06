from pydantic import BaseModel
from datetime import datetime #datetimeは時間を扱うのに適した型。

#共通項目
class TaskBase(BaseModel):
    title:str
    description: str | None = None
    deadline: datetime | None = None
    #descripiton,deadlineは送られてなくても問題ない。

#入力用
class TaskCreate(TaskBase):
    pass
#TaskBaseと同じ型。ただしあとで入力の際の項目が増えるかもしれないのできちんと分けておく。

#レスポンス用
class TaskRead(TaskBase):
    id: int
    ownerid: int
    createdtime:datetime

