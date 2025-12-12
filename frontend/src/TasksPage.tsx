import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { TaskApi } from "@/services/TaskApi";
import type { Task, TaskCreate } from "@/services/TaskApi";
import { ProjectApi } from "@/services/ProjectApi";
import type { Project } from "@/services/ProjectApi";
import { useAuth } from "@/hooks/useAuth";
import { ERROR_MESSAGES } from "@/config/constants";

export function TasksPage() {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | "">("");

  const [newTask, setNewTask] = useState<TaskCreate>({
    title: "",
    description: "",
    deadline: "",
    status: "not_started",
    priority: 0,
  });

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      if (projectId) {
        // プロジェクト指定の場合、そのプロジェクト内のタスクを取得
        const projData = await ProjectApi.getProject(token, parseInt(projectId, 10));
        setProject(projData);

        const filters: any = { limit: 100, offset: 0 };
        if (statusFilter) filters.status = statusFilter;
        const tasksData = await TaskApi.getProjectTasks(
          token,
          parseInt(projectId, 10),
          filters
        );
        setTasks(tasksData);
      } else {
        // プロジェクト未指定の場合、自分のタスクを取得
        const tasksData = await TaskApi.getMyTasks(token);
        setTasks(tasksData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, statusFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      const taskData: TaskCreate = {
        title: newTask.title,
        description: newTask.description || undefined,
        deadline: newTask.deadline || undefined,
        status: newTask.status || "not_started",
        priority: newTask.priority || 0,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
      };

      await TaskApi.createTask(token, taskData);

      setNewTask({
        title: "",
        description: "",
        deadline: "",
        status: "not_started",
        priority: 0,
      });
      setIsDialogOpen(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("このタスクを削除してもよろしいですか？")) return;

    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      await TaskApi.deleteTask(token, taskId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      await TaskApi.updateStatus(token, taskId, newStatus);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "期限なし";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: "未開始",
      in_progress: "進行中",
      completed: "完了",
    };
    return labels[status] || status;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {projectId && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {projectId ? `${project?.name || "プロジェクト"} - タスク` : "マイタスク"}
          </h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              タスクを追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいタスクを作成</DialogTitle>
              <DialogDescription>
                タイトルは必須、その他は任意です。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="タスクのタイトルを入力"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  placeholder="タスクの説明を入力（任意）"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="deadline">期限</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) =>
                    setNewTask({ ...newTask, deadline: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="status">ステータス</Label>
                <Select
                  value={newTask.status || "not_started"}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">未開始</SelectItem>
                    <SelectItem value="in_progress">進行中</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit">作成</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projectId && (
        <div className="mb-4 flex gap-2">
          <Label className="flex items-center">ステータスフィルター:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">すべて</SelectItem>
              <SelectItem value="not_started">未開始</SelectItem>
              <SelectItem value="in_progress">進行中</SelectItem>
              <SelectItem value="completed">完了</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {error && !isDialogOpen && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">タスクがありません。新しいタスクを追加してください。</p>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                  {task.description && (
                    <p className="text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500 mb-3">
                    <span>期限: {formatDate(task.deadline)}</span>
                    <span>優先度: {task.priority}</span>
                  </div>
                  {projectId && (
                    <div className="flex gap-2">
                      <Select
                        value={task.status}
                        onValueChange={(newStatus) =>
                          handleStatusChange(task.id, newStatus)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">未開始</SelectItem>
                          <SelectItem value="in_progress">進行中</SelectItem>
                          <SelectItem value="completed">完了</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
