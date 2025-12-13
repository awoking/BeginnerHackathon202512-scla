import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isOverdue, getTaskBackgroundClass, getCalendarTaskColorClass } from "@/lib/task-utils";
import { formatDate, formatDateWithTime } from "@/lib/dateUtils";
import { TaskApi, type Task } from "@/services/TaskApi";
import { useAuth } from "@/hooks/useAuth";
import { useTaskFiltering } from "@/hooks/useTaskFiltering";
import { ERROR_MESSAGES } from "@/config/constants";

function App() {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  const [sortKey, setSortKey] = useState<"updated" | "deadline">("updated");
  const [activeView, setActiveView] = useState<"timeline" | "calendar">("timeline");
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [leafTaskIds, setLeafTaskIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = getToken();
        if (!token) throw new Error("認証トークンがありません");
        const data = await TaskApi.getMyAssignedTasks(token);
        // 葉タスク判定（各タスクの子を取得して、子がないもののみ残す）
        const leaves: Set<number> = new Set();
        for (const t of data) {
          try {
            const children = await TaskApi.getChildren(token, t.id);
            if (!children || children.length === 0) {
              leaves.add(t.id);
            }
          } catch {
            // 失敗時は一旦含める（安全側）
            leaves.add(t.id);
          }
        }
        setLeafTaskIds(leaves);
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "期限なし";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateWithTime = (dateString?: string) => {
    if (!dateString) return "期限なし";
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusLabel: Record<string, string> = {
    not_started: "未着手",
    in_progress: "進行中",
    completed: "完了",
  };

  const timeline = useTaskFiltering({
    tasks,
    leafTaskIds,
    showCompleted,
    showOverdue,
    sortKey,
  });

  const calendarCells = useMemo(() => {
    const filtered = (showCompleted ? tasks : tasks.filter((t) => t.status !== "completed"))
      .filter((t) => t.deadline);
    
    const withoutOverdue = showOverdue
      ? filtered
      : filtered.filter((t) => !isOverdue(t));

    const taskMap = new Map<string, Task[]>();
    withoutOverdue.forEach((t) => {
      if (!t.deadline) return;
      const key = new Date(t.deadline).toISOString().slice(0, 10);
      const arr = taskMap.get(key) || [];
      arr.push(t);
      taskMap.set(key, arr);
    });

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const offset = start.getDay();
    const cells: Array<{ date?: Date; tasks?: Task[] }> = [];
    for (let i = 0; i < offset; i += 1) {
      cells.push({});
    }
    for (let d = 1; d <= end.getDate(); d += 1) {
      const date = new Date(year, month, d);
      const key = date.toISOString().slice(0, 10);
      cells.push({ date, tasks: taskMap.get(key) || [] });
    }
    return cells;
  }, [tasks, showCompleted, showOverdue, calendarDate]);

  const changeStatus = async (taskId: number, newStatus: string) => {
    try {
      const token = getToken();
      if (!token) return;

      // 親タスクを完了にしようとする場合、すべての子タスクが完了しているか確認
      if (newStatus === "completed") {
        const currentTask = tasks.find((t) => t.id === taskId);
        if (currentTask) {
          const children = await TaskApi.getChildren(token, taskId);
          if (children && children.length > 0) {
            const allChildrenCompleted = children.every((c) => c.status === "completed");
            if (!allChildrenCompleted) {
              setError("子タスクをすべて完了させてから、親タスクを完了にしてください。");
              return;
            }
          }
        }
      }

      await TaskApi.updateStatus(token, taskId, newStatus);
      const data = await TaskApi.getMyAssignedTasks(token);
      // 再取得後に葉判定も再計算
      const leaves: Set<number> = new Set();
      for (const t of data) {
        try {
          const children = await TaskApi.getChildren(token, t.id);
          if (!children || children.length === 0) {
            leaves.add(t.id);
          }
        } catch {
          leaves.add(t.id);
        }
      }
      setLeafTaskIds(leaves);
      setTasks(data);
      // 更新後、展開中の子タスクも再取得したければここで対応可能
    } catch {
      // noop
    }
  };

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">ダッシュボード</h1>
        
        {/* フィルターと表示オプション */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 border-r pr-4">
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${activeView === "timeline" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              onClick={() => setActiveView("timeline")}
            >
              タイムライン
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${activeView === "calendar" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              onClick={() => setActiveView("calendar")}
            >
              カレンダー
            </button>
          </div>

          {activeView === "timeline" && (
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as "updated" | "deadline")}
              className="border rounded px-2 py-1.5 text-sm bg-white"
            >
              <option value="updated">更新が新しい順</option>
              <option value="deadline">期限が近い順</option>
            </select>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              完了も表示
            </label>
            <label className="text-sm text-gray-700 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOverdue}
                onChange={(e) => setShowOverdue(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              期限超過を非表示
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : activeView === "calendar" ? (
        // カレンダー表示
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {calendarDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
            </h2>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                title="前月"
              >
                ◀
              </button>
              <button
                className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                onClick={() => setCalendarDate(new Date())}
                title="今月"
              >
                今
              </button>
              <button
                className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                title="次月"
              >
                ▶
              </button>
            </div>
          </div>
          {calendarCells.length === 0 ? (
            <p className="text-gray-500">表示できる期限はありません。</p>
          ) : (
            <div className="grid grid-cols-7 gap-2 text-sm">
              {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                <div key={d} className="text-center text-gray-500 font-medium">
                  {d}
                </div>
              ))}
              {calendarCells.map((cell, idx) => (
                <div
                  key={idx}
                  className={`min-h-[90px] rounded border border-gray-200 p-2 flex flex-col gap-1 ${
                    cell.date ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  {cell.date && (
                    <div className="flex items-center justify-between text-xs text-gray-700">
                      <span className="font-semibold">{cell.date.getDate()}</span>
                    </div>
                  )}
                  {cell.tasks &&
                    cell.tasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[11px] truncate px-1 py-0.5 rounded border ${
                          getCalendarTaskColorClass(t)
                        } border-gray-200`}
                        title={`${t.title} (${t.project_name || "プロジェクト"})`}
                      >
                        {t.title}
                      </div>
                    ))}
                  {cell.tasks && cell.tasks.length > 3 && (
                    <div className="text-[11px] text-gray-500">他 {cell.tasks.length - 3} 件</div>
                  )}
                  {!cell.date && <div className="flex-1" />}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : timeline.length === 0 ? (
        // タイムライン表示（空）
        <p className="text-gray-500">担当中のタスクはありません。</p>
      ) : (
        // タイムライン表示
        <div className="space-y-2">
          {timeline.map((task) => (
            <Card key={task.id} className={`p-3 ${getTaskBackgroundClass(task)}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{task.title}</h3>
                  {task.project_name && (
                    <p className="text-xs text-gray-600 truncate">
                      {task.project_creator_username || ""} / {task.project_name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                    {sortKey === "deadline" ? (
                      <span className="font-bold text-gray-700">期限: {formatDateWithTime(task.deadline)}</span>
                    ) : (
                      <span className="font-bold text-gray-700">更新: {formatDateWithTime(task.updated_at || task.created_at)}</span>
                    )}
                    <span>優先度: {task.priority ?? 0}</span>
                  </div>
                </div>
                <Select
                  value={task.status}
                  onValueChange={(value) => changeStatus(task.id, value)}
                >
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">未着手</SelectItem>
                    <SelectItem value="in_progress">進行中</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
