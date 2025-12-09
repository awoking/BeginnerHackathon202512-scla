from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskRead
from app.models.membership import Membership
from app.models.membership import MembershipCreate, MembershipRead
from app.utils.team import get_team_if_member

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)




@router.post("/", responsmodel=TaskRead, status_code=status.HTTP_201_CREATED)
def addask(thetask=TaskCreate,db:Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    

    newtask = Task(
        owner_id = current_user.id,
        title = thetask.title,
        description = thetask.description,
        deadline = thetask.deadline, 
        team_id = thetask.team_id
    )
    if not get_team_if_member(current_user,)

    db.add(newtask)
    db.commit()
    db.refresh(newtask)

    return newtask

@router.put("/{task_id}")





