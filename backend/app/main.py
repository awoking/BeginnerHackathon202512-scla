from typing import Union

from fastapi import FastAPI
from routers import auth, tasks, users, images #認証はauth,タスク管理はtask,ユーザー管理はuser,ファイルアップロードはimagesに記述する。

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}

#ファイルを読み込む。
app.include_router(auth)
app.include_router(tasks)
app.include_router(users)
app.include_router(images)