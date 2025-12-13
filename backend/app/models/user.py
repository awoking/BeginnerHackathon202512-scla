from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.session import Base
from typing import Optional
import random
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(200))
    icon = Column(Integer, default = lambda:random.randint(1,3), nullable=False) #フロント側で整数と画像を紐づけておく。初期値はランダム。

    # プロジェクト機能用の関連（旧 Membership/owner 参照は退役）
    project_memberships = relationship(
        "ProjectMember", back_populates="user", cascade="all, delete"
    )
    # 逆参照は必要になったら追加（assignee/created_by/updated_by）

    # カラム（項目）を作成。Integerは整数、Stringは文字列。
    # primary_keyは行を表す特別な番号。
    # uniqueは重複しないような設定。
    # indexは検索を早くするための設定。
    # セキュリティ上パスワードはハッシュ値として保存する。
    # relationshipを文字列で書くとSQLAlchemyが自動で理解してくれる。
    # 参照はループが起きてはいけない
