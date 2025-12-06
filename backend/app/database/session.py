from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
DATABASE_URL = "sqlite:///./app/db"

engine = create_engine(
    DATABASE_URL, conect_args={"check_same_thread": False}
    #DBへの接続機能を作る。aonect_argsでスレッドの設定を変えて非同期環境に対応させる。
)

#sessionを作る
SessionLocal = sessionmaker(
    autocomit=False,
    autoflush=False,
    bind=engine
    )

#User,TaskなどすべてのモデルがこのBaseになる。
Base = declarative_base()
