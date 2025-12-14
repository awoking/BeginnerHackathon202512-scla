from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.database.session import get_db
from app.models.task import Task
from app.models.user import User


from fastapi import APIRouter, Header, HTTPException, Query, status, BackgroundTasks
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
import os
from dotenv import load_dotenv

router = APIRouter(
    prefix="/api/internal",
    tags=["internal"]
)

load_dotenv()

SHARED_SECRET_KEY = os.getenv("SHARED_SECRET_KEY")
#環境変数で読み込む
#bot_pass = os.getenv("bot_pass")

@router.get("/tasks")
def get_internal_tasks(
    group_id: str = Query(..., description="連携するDiscordのグループID"),
    x_api_key: str = Header(..., description="Botとの共有秘密鍵"),
    db: Session = Depends(get_db),
):
    """
    Bot連携用: 未完了タスク一覧取得API
    URL: GET /api/internal/tasks
    """
    
    
    if x_api_key != SHARED_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    

    # 2. タスク取得 (未完了のもの)
    # 必要であれば group_id に応じたプロジェクトの絞り込みをここに追加します
    tasks = db.query(Task).filter(Task.status != "done").all()

    # 3. レスポンス生成
    response_tasks = []
    for t in tasks:
        assignee_name = t.assignee.username

        response_tasks.append({
            "id": t.id,
            "title": t.title,
            "deadline": t.deadline,
            "assignee": assignee_name,
            "status": t.status
        })

    return {
        "group_id": group_id,
        "tasks": response_tasks
    }



