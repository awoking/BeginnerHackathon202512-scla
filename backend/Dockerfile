# ベースイメージとしてPythonの軽量版を使用
FROM python:3.11-slim

# コンテナ内の作業ディレクトリを設定
WORKDIR /app

# Pythonの依存関係ファイル（requirements.txt）をコピー
# COPYの後にRUNを置くことで、requirements.txtに変更がない限り、
# pip installのレイヤーがキャッシュされ、ビルド時間を短縮できる (レイヤーキャッシュの活用)
COPY requirements.txt .

# 依存関係をインストール。--no-cache-dirでディスク容量を節約
RUN pip install -r requirements.txt

# アプリケーションのすべてのソースコードをコンテナ内にコピー
COPY . .

# FastAPIがリッスンするポート（Uvicornのデフォルトは8000）
EXPOSE 8000

# コマンドは docker-compose.yml で上書きされるため、ここでは省略することが多いですが、
# 汎用的な起動コマンドを書いておくこともできます。
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]