from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.team import Team
from app.models.membership import Membership
from app.models.user import User

def get_team_if_member(
        user_id: int,
        team_name: str,
        db: Session
):
    team = db.query(Team).filter(Team.name == team_name).first()
    if not team:
        return None
    
    in_team = db.query(Membership).filter(
        Membership.team_id == team.id,
        Membership.user_id == user_id
    ).first()

    if not in_team:
        return None
    

    return team



    

