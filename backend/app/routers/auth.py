from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.models.user import User
from app.database.session import get_db
from app.core.security import verify_password
from app.schemas.auth import Token

SECRET_KEY = "YOUR_SECRET_KEY"
ALGORITHM = "HS256"

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    #ユーザー名で検索
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    #パスワード検証
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    #JWT作成
    payload = {"sub": str(user.id)}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return Token(access_token=token)

