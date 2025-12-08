from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.core.security import hash_password

router = APIRouter(
    prefix="/users",
    tags=["users"]
)


# ユーザー作成（新規登録）
@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):

    # 既存ユーザー確認
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="ユーザー名はすでに使用されています"
        )

    # パスワードをハッシュ化
    hashed_pw = hash_password(user_in.password)

    new_user = User(
        username=user_in.username,
        hashed_password=hashed_pw
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# 全ユーザー取得（デバッグ用）
@router.get("/all", response_model=list[UserRead])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users
