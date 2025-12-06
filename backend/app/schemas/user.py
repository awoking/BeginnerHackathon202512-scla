from pydantic import BaseModel
class UserBase(BaseModel):
    unsername:str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

    class Config:
        orm_mode = True
        #orm_modeは辞書的に扱えるようにする。


