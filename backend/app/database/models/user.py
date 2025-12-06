
from sqlalchemy import Column, Intenger, String
from app.database.session import Base #sessionで定義した親クラスを参照している。

class User(Base):
    __tabename__ = "users"
    id = Column(Intenger, priary_key=True)
    username = Column(String,unique=True,index = True)
    passwaord_hash = Column(String)


    #カラム（項目）を作成。Intengerは整数、Stringは文字列。
    #priary_keyは行を表す特別な番号。
    #uniqeは重複しないような設定。
    #indexは検索を早くするための設定。
    #セキュリティ上パスワードはハッシュ値として保存する。