import discord
from discord.ext import commands, tasks
from aiohttp import web
import aiosqlite
import aiohttp
import asyncio
import datetime
import json
import os
from dotenv import load_dotenv

load_dotenv()

# ================= Configuration =================
# Discord Bot Token
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')

# Web Service API Settings
# Webサービス側のAPIエンドポイント (ローカルホスト想定)
WEB_API_URL = 'http://localhost:8000/api/internal/tasks'
# Webhook受信用設定 (Botがリッスンするポート)
WEBHOOK_PORT = 5000
# 簡易認証用キー (Webサービス側と一致させる)
API_SECRET = os.getenv('API_SECRET')

# ================= Bot Setup =================
intents = discord.Intents.default()
bot = commands.Bot(command_prefix='/', intents=intents)

# ================= Database (SQLite) Functions =================
DB_NAME = 'bot_data.db'

async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        # チャンネルIDとWebサービスのグループIDの紐付けテーブル
        await db.execute('''
            CREATE TABLE IF NOT EXISTS mapping (
                channel_id INTEGER PRIMARY KEY,
                group_id TEXT NOT NULL
            )
        ''')
        # 通知済みタスク管理 (重複通知防止用)
        await db.execute('''
            CREATE TABLE IF NOT EXISTS sent_reminders (
                task_id TEXT PRIMARY KEY,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        await db.commit()

async def get_channel_by_group(group_id):
    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute('SELECT channel_id FROM mapping WHERE group_id = ?', (str(group_id),)) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else None

# ================= Webhook Server (For Immediate Alerts) =================

async def handle_webhook(request):
    """
    Webサービスから緊急タスクの通知を受け取るエンドポイント
    POST http://localhost:5000/webhook
    """
    # 簡易認証
    if request.headers.get('X-API-KEY') != API_SECRET:
        return web.Response(status=403, text="Forbidden")

    try:
        data = await request.json()
        group_id = data.get('group_id')
        title = data.get('title')
        priority = data.get('priority', 'normal')

        # グループIDに紐付いたチャンネルを探す
        channel_id = await get_channel_by_group(group_id)
        
        if channel_id:
            channel = bot.get_channel(channel_id)
            if channel:
                # 緊急通知の送信
                embed = discord.Embed(
                    title="🚨 緊急タスク発生 / Immediate Task Alert", 
                    description=f"**{title}**", 
                    color=discord.Color.red()
                )
                embed.add_field(name="Priority", value=priority.upper())
                await channel.send(embed=embed)
                print(f"Sent webhook alert to channel {channel_id}")
            else:
                print(f"Channel {channel_id} not found.")
        else:
            print(f"No mapping found for group_id: {group_id}")

        return web.Response(status=200, text="OK")
        
    except Exception as e:
        print(f"Webhook Error: {e}")
        return web.Response(status=500, text="Internal Server Error")

# ================= Discord Bot Commands & Tasks =================

@bot.event
async def on_ready():
    await init_db()
    await bot.tree.sync() # スラッシュコマンドの同期
    check_reminders.start() # 定期リマインダーループ開始
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')

@bot.tree.command(name="setup", description="このチャンネルをWebサービスのグループと連携します")
async def setup(interaction: discord.Interaction, group_id: str):
    """
    /setup {group_id}
    WebサービスのグループIDをこのチャンネルに紐付けます。
    """
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute('INSERT OR REPLACE INTO mapping (channel_id, group_id) VALUES (?, ?)', 
                         (interaction.channel_id, group_id))
        await db.commit()
    
    await interaction.response.send_message(
        f"✅ セットアップ完了\nGroup ID: `{group_id}` をこのチャンネルに紐付けました。\nこれよりリマインド通知が開始されます。"
    )

@tasks.loop(minutes=5)
async def check_reminders():
    """
    5分ごとにWebサービスのAPIを叩いて、期限切れ間近のタスクを確認する
    """
    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute('SELECT channel_id, group_id FROM mapping') as cursor:
            mappings = await cursor.fetchall()

    if not mappings:
        return

    async with aiohttp.ClientSession() as session:
        for channel_id, group_id in mappings:
            try:
                # WebサービスAPIへのリクエスト
                headers = {'X-API-KEY': API_SECRET}
                url = f"{WEB_API_URL}?group_id={group_id}"
                
                async with session.get(url, headers=headers, timeout=10) as resp:
                    if resp.status != 200:
                        print(f"API Error for group {group_id}: Status {resp.status}")
                        continue
                        
                    data = await resp.json()
                    tasks_list = data.get('tasks', [])
                    
                    await process_periodic_reminders(channel_id, tasks_list)

            except Exception as e:
                print(f"Error fetching tasks for group {group_id}: {e}")

async def process_periodic_reminders(channel_id, tasks_list):
    channel = bot.get_channel(channel_id)
    if not channel:
        return

    now = datetime.datetime.now()
    
    for task in tasks_list:
        try:
            # 期限チェックロジック (タスク形式に合わせて調整してください)
            # 想定形式: "2025-12-13T15:00:00" (ISO format)
            deadline_str = task.get('deadline')
            if not deadline_str:
                continue
                
            deadline = datetime.datetime.fromisoformat(deadline_str)
            time_diff = deadline - now
            
            # 条件: 期限まで残り60分以内、かつまだ期限は過ぎていない
            if datetime.timedelta(minutes=0) < time_diff < datetime.timedelta(minutes=60):
                
                # 重複通知チェック
                task_id = str(task.get('id'))
                async with aiosqlite.connect(DB_NAME) as db:
                    cursor = await db.execute('SELECT 1 FROM sent_reminders WHERE task_id = ?', (task_id,))
                    if await cursor.fetchone():
                        continue # 通知済みならスキップ

                    # 通知済みとしてマーク
                    await db.execute('INSERT INTO sent_reminders (task_id) VALUES (?)', (task_id,))
                    await db.commit()

                # 通知送信
                embed = discord.Embed(title="⏰ 期限が迫っています", color=discord.Color.orange())
                embed.add_field(name="タスク", value=task.get('title'), inline=False)
                embed.add_field(name="期限", value=deadline_str, inline=True)
                embed.add_field(name="担当", value=task.get('assignee', '未定'), inline=True)
                
                await channel.send(embed=embed)

        except ValueError:
            pass # 日付形式エラーなどは無視

# ================= Main Entry Point =================

async def main():
    # 1. Webhook受信サーバーのセットアップ
    app = web.Application()
    app.router.add_post('/webhook', handle_webhook)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', WEBHOOK_PORT)
    await site.start()
    print(f"Webhook Server listening on port {WEBHOOK_PORT}")

    # 2. Discord Botの起動
    async with bot:
        await bot.start(DISCORD_TOKEN)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass