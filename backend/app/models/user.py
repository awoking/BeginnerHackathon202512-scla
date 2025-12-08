from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(200))

    memberships = relationship("Membership", back_populates="user", cascade="all, delete")
    tasks = relationship("Task", back_populates="owner", cascade="all, delete")

    #カラム（項目）を作成。Intengerは整数、Stringは文字列。
    #priary_keyは行を表す特別な番号。
    #uniqeは重複しないような設定。
    #indexは検索を早くするための設定。
    #セキュリティ上パスワードはハッシュ値として保存する。
    #relationshipを文字列で書くとSQLAlchemyが自動で理解してくれる。
    #参照はループが起きてはいけない