from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.team import Team
from app.models.membership import Membership
from app.models.user import User
from app.schemas.team import TeamCreate, TeamRead
from app.core.auth import get_current_user

router = APIRouter(
    prefix="/teams",
    tags=["teams"]
)

@router.post("/teams", response_model=TeamRead)
def create_team(
    team_in: TeamCreate,db: Session = Depends(get_db),current_user:User = Depends(get_current_user)):
    team = Team(name=team_in.name,ownerid=current_user.id)
    db.add(team)
    db.commit()
    db.refresh(team)
    

    membership = Membership(
        team_id = team.id,
        user_id =current_user.id
    )
    db.add(membership)
    db.commit

    
    return team
