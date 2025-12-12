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
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Users, 
  Settings, 
  ListTodo,
  UserPlus
} from "lucide-react";
import { ProjectApi } from "@/services/ProjectApi";
import { TaskApi } from "@/services/TaskApi";
import type { Project, ProjectMember } from "@/services/ProjectApi";
import type { Task, TaskCreate } from "@/services/TaskApi";
import { useAuth } from "@/hooks/useAuth";
import { ERROR_MESSAGES } from "@/config/constants";

type TabType = "tasks" | "members" | "settings";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // タスク作成用
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [parentTaskId, setParentTaskId] = useState<number | null>(null); // 子タスク作成時の親ID
  const [newTask, setNewTask] = useState<Omit<TaskCreate, "project_id">>({
    title: "",
    description: "",
    deadline: "",
    status: "not_started",
    priority: 0,
    assignee_id: undefined,
  });

  // メンバー招待用
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "VIEWER">("VIEWER");

  // フィルター用
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // プロジェクト編集用
  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");

  // タスク編集用
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    // JWTからユーザーIDを取得（検証なしデコード）
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const sub = payload?.sub ? parseInt(payload.sub, 10) : null;
        setCurrentUserId(Number.isFinite(sub) ? sub : null);
      } catch {
        setCurrentUserId(null);
      }
    } else {
      setCurrentUserId(null);
    }
  }, [getToken]);

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadTasks();
      loadMembers();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && activeTab === "tasks") {
      loadTasks();
    }
  }, [statusFilter]);

  const loadProject = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");
      if (!projectId) throw new Error("プロジェクトIDがありません");

      const data = await ProjectApi.getProject(token, parseInt(projectId, 10));
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const token = getToken();
      if (!token || !projectId) return;

      const filters: any = { limit: 100, offset: 0 };
      if (statusFilter && statusFilter !== "all") filters.status = statusFilter;

      const data = await TaskApi.getProjectTasks(
        token,
        parseInt(projectId, 10),
        filters
      );
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const loadMembers = async () => {
    try {
      const token = getToken();
      if (!token || !projectId) return;

      const data = await ProjectApi.getMembers(token, parseInt(projectId, 10));
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  // メンバー情報とcurrentUserIdからisAdminを再計算
  useEffect(() => {
    if (currentUserId && members.length > 0) {
      setIsAdmin(members.some((m) => m.user_id === currentUserId && m.role === "ADMIN"));
    } else {
      setIsAdmin(false);
    }
  }, [members, currentUserId]);

  const openProjectEdit = () => {
    if (!project) return;
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || "");
    setIsProjectEditOpen(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const token = getToken();
      if (!token || !projectId) throw new Error("認証情報が不足しています");
      const updated = await ProjectApi.updateProject(
        token,
        parseInt(projectId, 10),
        {
          name: editProjectName,
          description: editProjectDescription || undefined,
        }
      );
      setProject(updated);
      setIsProjectEditOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("このプロジェクトを削除します。よろしいですか？")) return;
    try {
      const token = getToken();
      if (!token || !projectId) throw new Error("認証情報が不足しています");
      await ProjectApi.deleteProject(token, parseInt(projectId, 10));
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");
      if (!projectId) throw new Error("プロジェクトIDがありません");

      const taskData: TaskCreate = {
        ...newTask,
        project_id: parseInt(projectId, 10),
        parent_id: parentTaskId || undefined,
        description: newTask.description || undefined,
        deadline: newTask.deadline || undefined,
        assignee_id: newTask.assignee_id ?? undefined,
      };

      await TaskApi.createTask(token, taskData);

      setNewTask({
        title: "",
        description: "",
        deadline: "",
        status: "not_started",
        priority: 0,
        assignee_id: undefined,
      });
      setParentTaskId(null);
      setIsTaskDialogOpen(false);
      loadTasks();
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
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      await TaskApi.updateStatus(token, taskId, newStatus);
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleCreateSubtask = (parentId: number) => {
    setParentTaskId(parentId);
    setIsTaskDialogOpen(true);
  };

  const handleOpenNewTaskDialog = () => {
    setParentTaskId(null);
    setIsTaskDialogOpen(true);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");
      if (!projectId) throw new Error("プロジェクトIDがありません");

      await ProjectApi.inviteMember(
        token,
        parseInt(projectId, 10),
        {
          username: inviteUsername,
          role: inviteRole,
        }
      );

      setInviteUsername("");
      setInviteRole("VIEWER");
      setIsInviteDialogOpen(false);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleChangeRole = async (memberId: number, newRole: "ADMIN" | "VIEWER") => {
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");
      if (!projectId) throw new Error("プロジェクトIDがありません");

      if (project && newRole !== "ADMIN") {
        const target = members.find((m) => m.id === memberId);
        if (target && target.user_id === project.creator_id) {
          throw new Error("プロジェクト作成者のロールは変更できません");
        }
      }

      await ProjectApi.changeRole(
        token,
        parseInt(projectId, 10),
        memberId,
        newRole
      );
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    if (project && member.user_id === project.creator_id) {
      setError("プロジェクト作成者は削除できません");
      return;
    }

    if (!confirm(`${member.username} をプロジェクトから削除しますか？`)) return;

    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");
      if (!projectId) throw new Error("プロジェクトIDがありません");

      await ProjectApi.removeMember(token, parseInt(projectId, 10), member.id);
      loadMembers();
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
      not_started: "未着手",
      in_progress: "進行中",
      completed: "完了",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>プロジェクトが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl">
      {/* ヘッダー */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/projects")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          プロジェクト一覧に戻る
        </Button>

        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-gray-600 text-lg">{project.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            作成日: {formatDate(project.created_at)}
          </p>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "tasks"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ListTodo className="inline-block mr-2 h-4 w-4" />
            タスク
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "members"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Users className="inline-block mr-2 h-4 w-4" />
            メンバー
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "settings"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Settings className="inline-block mr-2 h-4 w-4" />
            設定
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      {/* タスクタブ */}
      {activeTab === "tasks" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="ステータスで絞込" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="not_started">未着手</SelectItem>
                  <SelectItem value="in_progress">進行中</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenNewTaskDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  新規タスク
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {parentTaskId ? "子タスクを作成" : "新しいタスクを作成"}
                  </DialogTitle>
                  <DialogDescription>
                    タスクの詳細を入力してください
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
                    <div
                      className={
                        members.length > 0
                          ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                          : ""
                      }
                    >
                      <div>
                        <Label htmlFor="priority">優先度</Label>
                        <Select
                          value={String(newTask.priority)}
                          onValueChange={(value) =>
                            setNewTask({ ...newTask, priority: parseInt(value, 10) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">なし</SelectItem>
                            <SelectItem value="1">低</SelectItem>
                            <SelectItem value="2">中</SelectItem>
                            <SelectItem value="3">高</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {members.length > 0 && (
                        <div>
                          <Label htmlFor="assignee">担当者</Label>
                          <Select
                            value={
                              newTask.assignee_id ? String(newTask.assignee_id) : "none"
                            }
                            onValueChange={(value) =>
                              setNewTask({
                                ...newTask,
                                assignee_id:
                                  value === "none" ? undefined : parseInt(value, 10),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="担当者を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">未設定</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.id} value={String(m.user_id)}>
                                  {m.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    作成
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {tasks.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                タスクがありません。新規タスクを作成してください。
              </Card>
            ) : (
              tasks
                .filter((task) => !task.parent_id) // 親タスクのみ表示
                .map((task) => (
                  <div key={task.id}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                          {task.description && (
                            <p className="text-gray-600 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <Select
                              value={task.status}
                              onValueChange={(value) =>
                                handleStatusChange(task.id, value)
                              }
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
                            <span className="text-gray-500">
                              優先度: {task.priority || "なし"}
                            </span>
                            <span className="text-gray-500">
                              期限: {formatDate(task.deadline)}
                            </span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateSubtask(task.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              子タスク作成
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTask(task);
                                setIsTaskEditOpen(true);
                              }}
                            >
                              編集
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </Card>
                    
                    {/* 子タスク */}
                    {tasks
                      .filter((subtask) => subtask.parent_id === task.id)
                      .map((subtask) => (
                        <Card key={subtask.id} className="p-4 ml-8 mt-2 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-base mb-2">
                                📁 {subtask.title}
                              </h4>
                              {subtask.description && (
                                <p className="text-gray-600 text-sm mb-2">
                                  {subtask.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm flex-wrap">
                                <Select
                                  value={subtask.status}
                                  onValueChange={(value) =>
                                    handleStatusChange(subtask.id, value)
                                  }
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
                                <span className="text-gray-500">
                                  優先度: {subtask.priority || "なし"}
                                </span>
                                <span className="text-gray-500">
                                  期限: {formatDate(subtask.deadline)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(subtask.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTask(subtask);
                                setIsTaskEditOpen(true);
                              }}
                            >
                              編集
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateSubtask(subtask.id)}
                            >
                              子タスク作成
                            </Button>
                          </div>

                          {/* 孫タスク */}
                          {tasks
                            .filter((grand) => grand.parent_id === subtask.id)
                            .map((grand) => (
                              <Card
                                key={grand.id}
                                className="p-4 ml-8 mt-2 bg-white border border-gray-200"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-sm mb-2">🗂 {grand.title}</h5>
                                    {grand.description && (
                                      <p className="text-gray-600 text-sm mb-2">
                                        {grand.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm flex-wrap">
                                      <Select
                                        value={grand.status}
                                        onValueChange={(value) =>
                                          handleStatusChange(grand.id, value)
                                        }
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
                                      <span className="text-gray-500">
                                        優先度: {grand.priority || "なし"}
                                      </span>
                                      <span className="text-gray-500">
                                        期限: {formatDate(grand.deadline)}
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTask(grand.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTask(grand);
                                      setIsTaskEditOpen(true);
                                    }}
                                  >
                                    編集
                                  </Button>
                                </div>
                              </Card>
                            ))}
                        </Card>
                      ))}
                  </div>
                ))
            )}
          </div>

          {/* タスク編集ダイアログ */}
          <Dialog open={isTaskEditOpen} onOpenChange={setIsTaskEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>タスクを編集</DialogTitle>
              </DialogHeader>
              {editingTask && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const token = getToken();
                      if (!token) throw new Error("認証トークンがありません");
                      await TaskApi.updateTask(token, editingTask.id, {
                        title: editingTask.title,
                        description: editingTask.description || undefined,
                        deadline: editingTask.deadline || undefined,
                        priority: editingTask.priority,
                        assignee_id: editingTask.assignee_id ?? undefined,
                      });
                      setIsTaskEditOpen(false);
                      setEditingTask(null);
                      loadTasks();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR
                      );
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="edit-title">タイトル</Label>
                    <Input
                      id="edit-title"
                      value={editingTask.title}
                      onChange={(e) =>
                        setEditingTask({ ...editingTask, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">説明</Label>
                    <Textarea
                      id="edit-description"
                      value={editingTask.description || ""}
                      onChange={(e) =>
                        setEditingTask({ ...editingTask, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-deadline">期限</Label>
                    <Input
                      id="edit-deadline"
                      type="datetime-local"
                      value={editingTask.deadline || ""}
                      onChange={(e) =>
                        setEditingTask({ ...editingTask, deadline: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-priority">優先度</Label>
                      <Select
                        value={String(editingTask.priority)}
                        onValueChange={(value) =>
                          setEditingTask({ ...editingTask, priority: parseInt(value, 10) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">なし</SelectItem>
                          <SelectItem value="1">低</SelectItem>
                          <SelectItem value="2">中</SelectItem>
                          <SelectItem value="3">高</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {members.length > 0 && (
                      <div>
                        <Label htmlFor="edit-assignee">担当者</Label>
                        <Select
                          value={editingTask.assignee_id ? String(editingTask.assignee_id) : "none"}
                          onValueChange={(value) =>
                            setEditingTask({
                              ...editingTask,
                              assignee_id: value === "none" ? undefined : parseInt(value, 10),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="担当者を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">未設定</SelectItem>
                            {members.map((m) => (
                              <SelectItem key={m.id} value={String(m.user_id)}>
                                {m.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full">保存</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* メンバータブ */}
      {activeTab === "members" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">プロジェクトメンバー</h2>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!isAdmin} title={!isAdmin ? "ADMINのみ招待可能" : undefined}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  メンバーを招待
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>メンバーを招待</DialogTitle>
                  <DialogDescription>
                    招待するユーザーのユーザー名とロールを指定してください
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteMember} className="space-y-4">
                  <div>
                    <Label htmlFor="username">ユーザー名 *</Label>
                    <Input
                      id="username"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">ロール *</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value: "ADMIN" | "VIEWER") =>
                        setInviteRole(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">閲覧者</SelectItem>
                        <SelectItem value="ADMIN">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">
                    招待
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {member.username}
                      {project && member.user_id === project.creator_id && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          作成者
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      招待日: {formatDate(member.invited_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value: "ADMIN" | "VIEWER") =>
                        handleChangeRole(member.id, value)
                      }
                      disabled={!isAdmin || (project && member.user_id === project.creator_id)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue
                          placeholder={
                            !isAdmin
                              ? "ADMINのみ変更可"
                              : project && member.user_id === project.creator_id
                                ? "作成者は固定"
                                : undefined
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">閲覧者</SelectItem>
                        <SelectItem value="ADMIN">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                    {isAdmin && project && member.user_id !== project.creator_id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveMember(member)}
                      >
                        削除
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 設定タブ */}
      {activeTab === "settings" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">プロジェクト設定</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">プロジェクト名</h3>
                <p className="text-gray-600">{project.name}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">説明</h3>
                <p className="text-gray-600">
                  {project.description || "説明はありません"}
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">作成日</h3>
                <p className="text-gray-600">{formatDate(project.created_at)}</p>
              </div>
              <div className="pt-4 border-t flex gap-2">
                <Button variant="outline" onClick={openProjectEdit}>編集</Button>
                <Button variant="destructive" onClick={handleDeleteProject}>削除</Button>
              </div>
            </div>
          </Card>

          {/* プロジェクト編集ダイアログ */}
          <Dialog open={isProjectEditOpen} onOpenChange={setIsProjectEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>プロジェクトを編集</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div>
                  <Label htmlFor="proj-name">名前</Label>
                  <Input id="proj-name" value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="proj-desc">説明</Label>
                  <Textarea id="proj-desc" value={editProjectDescription} onChange={(e) => setEditProjectDescription(e.target.value)} rows={3} />
                </div>
                <Button type="submit" className="w-full">保存</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
