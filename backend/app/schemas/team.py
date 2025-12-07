
from pydantic import BaseModel

class TeamBase(BaseModel):
    name:str


class TeamCreate(TeamBase):
    pass

class TeamRead(TeamBase):