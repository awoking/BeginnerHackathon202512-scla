from pydantic import BaseModel
from typing import Optional


class UserBase(BaseModel):
    username:str

class UserCreate(UserBase):
    password: str
    icon: Optional[int] = None

class UserRead(UserBase):
    id: int = 1

    class Config:
        from_attributes = True

        #orm_modeは辞書的に扱えるようにする。
        #orm_modeは消しました。
# backend/app/schemas/task.py

# 2. 更新用（変更検知用）
class UserUpdate(BaseModel):
    # 入力なしなら None（変更なし）、あればその値で更新
    icon: Optional[int] = None



