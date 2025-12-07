from pydantic import BaseModel
class UserBase(BaseModel):
    username:str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True

        #orm_modeは辞書的に扱えるようにする。


