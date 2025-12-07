from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

#DB接続のための関数と型を呼び出す
from app.database.session import get_db
from app.models.user import User
from app.schemas import UserCreate, UserRead


#このファイル内のAPIは/usersから始める。
#このファイル内のAPIには自動で/usersがつく。
#タグをつけているのでSwagger UI（/docs）から確認可能。
router = APIRouter(prefix="/users",tags={"users"})


@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    #ユーザーの重複を判定
    existing = db.query(User).filter(User.username == user_in.username).first()
    #重複が存在した場合
    if existing:
        raise HTTPException(status_code=400,detail="ユーザー名はすでに使用されています")
    
    #ユーザー作成。今はそのままだけどあとでpasswordをbcrypt化します。
    newuser = User(
        username=user_in.username,
        passord=user_in.password
    )

    #データベースに追加
    db.add(newuser)
    
    #編集を反映させる
    db.commit()
    
    #dbのデータでnewuserを更新する。
    #この場合はpythonのnewuserにidの情報をつける。
    db.refresh(newuser)

    return newuser

