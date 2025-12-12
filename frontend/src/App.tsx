import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskApi, type Task } from "@/services/TaskApi";
import { useAuth } from "@/hooks/useAuth";
import { ERROR_MESSAGES } from "@/config/constants";

function App() {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
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

  const statusLabel: Record<string, string> = {
    not_started: "未着手",
    in_progress: "進行中",
    completed: "完了",
  };

  const timeline = useMemo(() => {
    const assignedLeaves = tasks.filter((t) => leafTaskIds.has(t.id));
    const filtered = showCompleted
      ? assignedLeaves
      : assignedLeaves.filter((t) => t.status !== "completed");

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "deadline") {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return aTime - bTime;
      }
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();
      return bTime - aTime;
    });

    return sorted;
  }, [tasks, showCompleted, sortKey]);

  const calendarCells = useMemo(() => {
    const filtered = (showCompleted ? tasks : tasks.filter((t) => t.status !== "completed"))
      .filter((t) => t.deadline);

    const taskMap = new Map<string, Task[]>();
    filtered.forEach((t) => {
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
  }, [tasks, showCompleted, calendarDate]);

  const changeStatus = async (taskId: number, newStatus: string) => {
    try {
      const token = getToken();
      if (!token) return;
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
    <div>
      <h1 className="text-3xl font-bold mb-4">ダッシュボード</h1>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded text-sm ${activeView === "timeline" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveView("timeline")}
          >
            タイムライン
          </button>
          <button
            className={`px-3 py-1 rounded text-sm ${activeView === "calendar" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveView("calendar")}
          >
            カレンダー
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <span className="text-gray-600">並び順:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as "updated" | "deadline")}
            className="border rounded px-2 py-1 text-sm"
            disabled={activeView !== "timeline"}
          >
            <option value="updated">更新が新しい順</option>
            <option value="deadline">期限が近い順</option>
          </select>
        </div>
        <label className="text-sm text-gray-700 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4"
          />
          完了タスクも表示
        </label>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      <p className="text-gray-600 mb-4">自分が担当のタスク一覧</p>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : activeView === "calendar" ? (
        // カレンダー表示
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">カレンダー</h2>
              <span className="text-sm text-gray-500">
                {calendarDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 border rounded text-sm"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              >
                前月
              </button>
              <button
                className="px-2 py-1 border rounded text-sm"
                onClick={() => setCalendarDate(new Date())}
              >
                今月
              </button>
              <button
                className="px-2 py-1 border rounded text-sm"
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              >
                次月
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
                        className="text-[11px] truncate px-1 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100"
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
        // タイムライン表示（日付仕切り）
        <div className="space-y-6">
          {timeline
            .reduce((acc: Array<{ dateKey: string; items: Task[] }>, t) => {
              const rawDate =
                sortKey === "deadline"
                  ? (t.deadline ? new Date(t.deadline) : new Date(t.updated_at || t.created_at))
                  : new Date(t.updated_at || t.created_at);
              const key = rawDate.toISOString().slice(0, 10);
              const last = acc[acc.length - 1];
              if (!last || last.dateKey !== key) acc.push({ dateKey: key, items: [t] });
              else last.items.push(t);
              return acc;
            }, [])
            .map((group) => (
              <div key={group.dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm text-gray-600 whitespace-nowrap">
                    {new Date(group.dateKey).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="space-y-3">
                  {group.items.map((task) => (
                    <Card key={task.id} className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-semibold text-lg leading-snug">{task.title}</h3>
                          {task.project_name && (
                            <p className="text-sm text-gray-600">
                              {task.project_creator_username || ""} / {task.project_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={task.status}
                            onValueChange={(value) => changeStatus(task.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">未着手</SelectItem>
                              <SelectItem value="in_progress">進行中</SelectItem>
                              <SelectItem value="completed">完了</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>期限: {formatDate(task.deadline)}</span>
                        <span>優先度: {task.priority ?? 0}</span>
                        <span>
                          {sortKey === "deadline"
                            ? `期限基準: ${formatDate(task.deadline)}`
                            : `更新: ${formatDate(task.updated_at || task.created_at)}`}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default App;
