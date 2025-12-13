from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskRead
from app.models.membership import Membership
#from app.models.membership import MembershipCreate, MembershipRead
from app.utils.team import get_teamfromid
from app.core.auth import get_current_user
from backend.app.models.user import User

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)




@router.post("/", responsmodel=TaskRead, status_code=status.HTTP_201_CREATED)
def addask(thetask: TaskCreate,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    

    newtask = Task(
        owner_id = current_user.id,
        title = thetask.title,
        description = thetask.description,
        deadline = thetask.deadline, 
        team_id = getattr(thetask, "team_id", None)
    )
    if newtask.team_id :
          theteam = get_teamfromid(current_user,thetask.id)
          if theteam is None:
               raise HTTPException(
                    status_code=400,
                    detail="チーム名が間違っています"
                    )
          
    db.add(newtask)
    db.commit()
    db.refresh(newtask)

    return newtask

@router.put("/{task_id}"):




