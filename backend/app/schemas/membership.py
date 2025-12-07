from pydantic import BaseModel

class MembershipBase(BaseModel):
    team_id: int
    user_id: int


class MembershipCreate(MembershipBase):
    """チーム参加用（POST用）"""
    pass


class MembershipRead(MembershipBase):
    id: int

    class Config:
        orm_mode = True
