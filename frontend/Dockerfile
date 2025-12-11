# ベースイメージとしてNode.jsの軽量版を使用
FROM node:20-alpine

# コンテナ内の作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピー
# この層をキャッシュすることで、package.jsonに変更がない限り、
# npm installの時間を節約できる
COPY package*.json ./

# 依存関係をインストール
# ホスト側のnode_modulesのキャッシュが使われないように注意
RUN npm install

# アプリケーションのすべてのソースコードをコンテナ内にコピー
COPY . .

# React開発サーバーがリッスンするポート（デフォルトは3000）
EXPOSE 5173

# 起動コマンドは docker-compose.yml で上書きされるため、ここでは省略
# CMD ["npm", "start"]