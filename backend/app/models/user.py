
from sqlalchemy import Column, Intenger, String
from sqlalchemy.orm import relationship
from app.database.session import Base #sessionで定義した親クラスを参照している。

class User(Base):
    __tabename__ = "users"
    id = Column(Intenger, priary_key=True)
    username = Column(String,unique=True,index = True)
    hashed_passwaord = Column(String)
    
    teams = relationship("TeamMember", back_populates="user")
    memberships = relationship("Membership", back_populates="user")



    #カラム（項目）を作成。Intengerは整数、Stringは文字列。
    #priary_keyは行を表す特別な番号。
    #uniqeは重複しないような設定。
    #indexは検索を早くするための設定。
    #セキュリティ上パスワードはハッシュ値として保存する。
    #relationshipを文字列で書くとSQLAlchemyが自動で理解してくれる。
    #参照はループが起きてはいけない