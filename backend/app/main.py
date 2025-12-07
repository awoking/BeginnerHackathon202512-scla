from typing import Union

from fastapi import FastAPI
from app.core import auth
from app.database.session import engine, Base
from app.models import user, task, team, membership
from app.routers import tasks, users, auth, teams
#認証はauth,タスク管理はtask,ユーザー管理はuser,ファイルアップロードはimagesに記述する。images ,

Base.metadata.create_all(bind=engine)


app = FastAPI()



@app.get("/")
def read_root():
    return {"Hello": "World"}

#ファイルを読み込む。
app.include_router(auth.router)
#app.include_router(tasks.router)
app.include_router(users.router)
#app.include_router(images)
app.include_router(teams.router)
