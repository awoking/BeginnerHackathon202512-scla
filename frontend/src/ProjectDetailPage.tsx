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
import { ProgressBar } from "@/components/ui/progress-bar";
import { isOverdue, getTaskBackgroundClass } from "@/lib/task-utils";

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
  const [parentTaskId, setParentTaskId] = useState<number | null>(null); // サブタスク作成時の親ID
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
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});
  // ダッシュボード同様のビュー
  const [taskView, setTaskView] = useState<"timeline" | "calendar" | "hierarchy">("hierarchy");
  const [sortKey, setSortKey] = useState<"updated" | "deadline">("updated");
  const [leafTaskIds, setLeafTaskIds] = useState<Set<number>>(new Set());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [leafProgress, setLeafProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });

  // プロジェクト編集用
  const [isProjectEditOpen, setIsProjectEditOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");

  // タスク編集用
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // 編集フォーム用フィールド
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState<string | undefined>(undefined);
  const [editTaskDeadline, setEditTaskDeadline] = useState<string | undefined>(undefined);
  const [editTaskPriority, setEditTaskPriority] = useState<number>(0);
  const [editTaskAssignee, setEditTaskAssignee] = useState<number | undefined>(undefined);

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
      if (statusFilter && statusFilter !== "all" && statusFilter !== "active") {
        filters.status = statusFilter;
      }

      const data = await TaskApi.getProjectTasks(
        token,
        parseInt(projectId, 10),
        filters
      );
      setTasks(data);
      // 葉タスク判定
      const leaves: Set<number> = new Set();
      let leafCompleted = 0;
      let leafTotal = 0;
      for (const t of data) {
        try {
          const children = await TaskApi.getChildren(token, t.id);
          if (!children || children.length === 0) {
            leaves.add(t.id);
            leafTotal++;
            if (t.status === "completed") {
              leafCompleted++;
            }
          }
        } catch {
          leaves.add(t.id);
          leafTotal++;
          if (t.status === "completed") {
            leafCompleted++;
          }
        }
      }
      setLeafTaskIds(leaves);
      setLeafProgress({ completed: leafCompleted, total: leafTotal });
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

      // サブタスクの場合、メインタスクの期限チェック
      if (parentTaskId && newTask.deadline) {
        const parentTask = tasks.find((t) => t.id === parentTaskId);
        if (parentTask && parentTask.deadline) {
          const childDeadline = new Date(newTask.deadline);
          const parentDeadline = new Date(parentTask.deadline);
          if (childDeadline > parentDeadline) {
            throw new Error("サブタスクの期限はメインタスクの期限以前に設定してください。");
          }
        }
      }

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

      // メインタスクを完了にしようとする場合、すべてのサブタスクが完了しているか確認
      if (newStatus === "completed") {
        const currentTask = tasks.find((t) => t.id === taskId);
        if (currentTask) {
          const children = tasks.filter((t) => t.parent_id === taskId);
          if (children.length > 0) {
            const allChildrenCompleted = children.every((c) => c.status === "completed");
            if (!allChildrenCompleted) {
              setError("サブタスクをすべて完了させてから、メインタスクを完了にしてください。");
              return;
            }
          }
        }
      }

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

  // 編集対象が変わったらフォームを初期化
  useEffect(() => {
    if (editingTask) {
      setEditTaskTitle(editingTask.title || "");
      setEditTaskDescription(editingTask.description || undefined);
      setEditTaskDeadline(editingTask.deadline || undefined);
      setEditTaskPriority(editingTask.priority ?? 0);
      setEditTaskAssignee(editingTask.assignee_id ?? undefined);
    } else {
      setEditTaskTitle("");
      setEditTaskDescription(undefined);
      setEditTaskDeadline(undefined);
      setEditTaskPriority(0);
      setEditTaskAssignee(undefined);
    }
  }, [editingTask]);

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!editingTask) return;
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      const payload: any = {
        title: editTaskTitle,
        description: editTaskDescription || undefined,
        deadline: editTaskDeadline || undefined,
        priority: editTaskPriority,
        assignee_id: editTaskAssignee ?? null,
      };

      await TaskApi.updateTask(token, editingTask.id, payload);
      setIsTaskEditOpen(false);
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleOpenNewTaskDialog = () => {
    setParentTaskId(null);
    setIsTaskDialogOpen(true);
  };

  const getAssigneeName = (assigneeId?: number) => {
    if (!assigneeId) return "未設定";
    const found = members.find((m) => m.user_id === assigneeId);
    return found ? found.username : "不明なユーザー";
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

  const formatDateWithTime = (dateString?: string): string => {
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

  const getDateKey = (dateString?: string): string => {
    if (!dateString) return "期限なし";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const timelineGrouped = () => {
    const assignedLeaves = tasks.filter((t) => leafTaskIds.has(t.id));
    const filtered = showCompleted
      ? assignedLeaves
      : assignedLeaves.filter((t) => t.status !== "completed");
    const withoutOverdue = showOverdue
      ? filtered
      : filtered.filter((t) => !isOverdue(t));
    const grouped: Record<string, Task[]> = {};
    const dateKeyFn = sortKey === "deadline"
      ? (t: Task) => getDateKey(t.deadline)
      : (t: Task) => getDateKey(t.updated_at || t.created_at);
    withoutOverdue.forEach((t) => {
      const key = dateKeyFn(t);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => (sortKey === "deadline" ? a.localeCompare(b) : b.localeCompare(a)))
      .map(([date, tks]) => ({ date, tasks: tks }));
  };

  const calendarTasks = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const assignedLeaves = tasks.filter((t) => leafTaskIds.has(t.id));
    const filtered = showCompleted
      ? assignedLeaves
      : assignedLeaves.filter((t) => t.status !== "completed");
    const tasksByDate: Record<number, Task[]> = {};
    filtered.forEach((t) => {
      if (t.deadline) {
        const d = new Date(t.deadline);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          if (!tasksByDate[day]) tasksByDate[day] = [];
          tasksByDate[day].push(t);
        }
      }
    });
    return tasksByDate;
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

        <div className="border-b pb-6">
          <div className="flex items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 text-lg">{project.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                作成日: {formatDate(project.created_at)}
              </p>
            </div>
            
            {/* 進捗ゲージ */}
            {leafProgress.total > 0 && (
              <div className="flex-shrink-0 w-56 mb-1">
                <ProgressBar
                  value={Math.round((leafProgress.completed / leafProgress.total) * 100)}
                  label={`${leafProgress.completed}/${leafProgress.total} 完了`}
                  showPercentage={true}
                  className="w-full"
                />
              </div>
            )}
          </div>
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
            } ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!isAdmin}
            title={!isAdmin ? "ADMINのみアクセス可能" : undefined}
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
          {/* ビュー切り替え */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={taskView === "hierarchy" ? "default" : "outline"}
                onClick={() => setTaskView("hierarchy")}
              >
                階層表示
              </Button>
              <Button
                variant={taskView === "timeline" ? "default" : "outline"}
                onClick={() => setTaskView("timeline")}
              >
                タイムライン
              </Button>
              <Button
                variant={taskView === "calendar" ? "default" : "outline"}
                onClick={() => setTaskView("calendar")}
              >
                カレンダー
              </Button>
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
                    {parentTaskId ? "サブタスクを作成" : "新しいタスクを作成"}
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
                      max={
                        parentTaskId
                          ? (() => {
                              const parent = tasks.find((t) => t.id === parentTaskId);
                              if (parent?.deadline) {
                                const d = new Date(parent.deadline);
                                return d.toISOString().slice(0, 16);
                              }
                              return undefined;
                            })()
                          : undefined
                      }
                    />
                    {parentTaskId && tasks.find((t) => t.id === parentTaskId)?.deadline && (
                      <p className="text-xs text-gray-500 mt-1">
                        メインタスクの期限: {formatDate(tasks.find((t) => t.id === parentTaskId)?.deadline)}
                      </p>
                    )}
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
              {/* タスク編集ダイアログ */}
              <Dialog open={isTaskEditOpen} onOpenChange={(open) => { if (!open) { setIsTaskEditOpen(false); setEditingTask(null); } else { setIsTaskEditOpen(open); } }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>タスクを編集</DialogTitle>
                    <DialogDescription>タスクの情報を編集して保存してください</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateTask} className="space-y-4">
                    <div>
                      <Label htmlFor="edit-title">タイトル *</Label>
                      <Input
                        id="edit-title"
                        value={editTaskTitle}
                        onChange={(e) => setEditTaskTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">説明</Label>
                      <Textarea
                        id="edit-description"
                        value={editTaskDescription || ""}
                        onChange={(e) => setEditTaskDescription(e.target.value || undefined)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-deadline">期限</Label>
                      <Input
                        id="edit-deadline"
                        type="datetime-local"
                        value={editTaskDeadline || ""}
                        onChange={(e) => setEditTaskDeadline(e.target.value || undefined)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-priority">優先度</Label>
                      <Select value={String(editTaskPriority)} onValueChange={(v) => setEditTaskPriority(parseInt(v, 10))}>
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
                        <Select value={editTaskAssignee ? String(editTaskAssignee) : "none"} onValueChange={(v) => setEditTaskAssignee(v === "none" ? undefined : parseInt(v, 10))}>
                          <SelectTrigger>
                            <SelectValue />
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
                    <Button type="submit" className="w-full">
                      保存
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
          </div>

          {/* 階層表示（デフォルト） */}
          {taskView === "hierarchy" && (
            <div>
              <div className="mb-4 flex items-center gap-4 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="ステータスで絞込" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">進行中/未着手</SelectItem>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="not_started">未着手</SelectItem>
                    <SelectItem value="in_progress">進行中</SelectItem>
                    <SelectItem value="completed">完了</SelectItem>
                  </SelectContent>
                </Select>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                  />
                  完了も表示
                </label>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showOverdue}
                    onChange={(e) => setShowOverdue(e.target.checked)}
                  />
                  期限超過を非表示
                </label>
              </div>

              <div className="space-y-4 mt-6">
                {tasks.filter((t) => {
                  if (!showCompleted && t.status === "completed") return false;
                  if (!showOverdue && isOverdue(t)) return false;
                  return true;
                }).length === 0 ? (
                  <Card className="p-8 text-center text-gray-500">
                    タスクがありません。新規タスクを作成してください。
                  </Card>
                ) : (
                  tasks
                    .filter((t) => !t.parent_id && (showCompleted || t.status !== "completed") && (showOverdue || !isOverdue(t)))
                    .map((task) => {
                      const childCount = tasks.filter((t) => t.parent_id === task.id).length;
                      return (
                        <div key={task.id}>
                          {/* メインタスク */}
                          <Card className={`p-3 shadow-lg rounded-none ${getTaskBackgroundClass(task)}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 flex items-start gap-1.5">
                                <button
                                  className="mt-0.5 text-gray-600 hover:text-gray-900 flex-shrink-0 text-sm font-bold"
                                  onClick={() =>
                                    setExpandedMap({
                                      ...expandedMap,
                                      [task.id]: !expandedMap[task.id],
                                    })
                                  }
                                >
                                  {childCount > 0 ? (expandedMap[task.id] ? "▼" : "▶") : ""}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-sm">{task.title}</h3>
                                  {task.description && (
                                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{task.description}</p>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                                    <span>期限: {formatDate(task.deadline)}</span>
                                    <span>優先度: {task.priority || "なし"}</span>
                                    <span>担当: {getAssigneeName(task.assignee_id)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Select
                                  value={task.status}
                                  onValueChange={(value) =>
                                    handleStatusChange(task.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-[100px] h-8 text-xs font-bold rounded-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="not_started"><span className="font-bold">未着手</span></SelectItem>
                                    <SelectItem value="in_progress"><span className="font-bold">進行中</span></SelectItem>
                                    <SelectItem value="completed"><span className="font-bold">完了</span></SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleCreateSubtask(task.id)}
                                  title="サブタスク作成"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskEditOpen(true);
                                  }}
                                  title="編集"
                                >
                                  編集
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDeleteTask(task.id)}
                                  title="削除"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            {childCount > 0 && !expandedMap[task.id] && (
                              <div className="text-xs text-gray-400 ml-5 mt-1">
                                サブタスク {childCount}件
                              </div>
                            )}
                          </Card>

                          {/* サブタスク */}
                          {expandedMap[task.id] && tasks
                            .filter((subtask) => subtask.parent_id === task.id)
                            .filter((t) => (showCompleted || t.status !== "completed") && (showOverdue || !isOverdue(t)))
                            .map((subtask) => {
                              const grandCount = tasks.filter((t) => t.parent_id === subtask.id).length;
                              return (
                                <div key={subtask.id} className="mt-3 ml-6 max-w-3xl">
                                  <Card className={`p-2 shadow-md rounded-none ${getTaskBackgroundClass(subtask)}`}>
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex-1 flex items-start gap-1">
                                        <button
                                          className="mt-0.5 text-gray-500 hover:text-gray-700 flex-shrink-0 text-sm"
                                          onClick={() =>
                                            setExpandedMap({
                                              ...expandedMap,
                                              [subtask.id]: !expandedMap[subtask.id],
                                            })
                                          }
                                        >
                                          {grandCount > 0 ? (expandedMap[subtask.id] ? "▼" : "▶") : ""}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-xs">{subtask.title}</h4>
                                          {subtask.description && (
                                            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{subtask.description}</p>
                                          )}
                                          <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                                            <span>期限: {formatDate(subtask.deadline)}</span>
                                            <span>優先度: {subtask.priority || "なし"}</span>
                                            <span>担当: {getAssigneeName(subtask.assignee_id)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <Select
                                          value={subtask.status}
                                          onValueChange={(value) =>
                                            handleStatusChange(subtask.id, value)
                                          }
                                        >
                                          <SelectTrigger className="w-[90px] h-7 text-xs font-bold rounded-none">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="not_started"><span className="font-bold">未着手</span></SelectItem>
                                            <SelectItem value="in_progress"><span className="font-bold">進行中</span></SelectItem>
                                            <SelectItem value="completed"><span className="font-bold">完了</span></SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleCreateSubtask(subtask.id)}
                                          title="サブタスク作成"
                                        >
                                          <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-xs"
                                          onClick={() => {
                                            setEditingTask(subtask);
                                            setIsTaskEditOpen(true);
                                          }}
                                          title="編集"
                                        >
                                          編集
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => handleDeleteTask(subtask.id)}
                                          title="削除"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>

                                  {grandCount > 0 && !expandedMap[subtask.id] && (
                                    <div className="text-xs text-gray-400 ml-5 mt-1">
                                      サブタスク {grandCount}件
                                    </div>
                                  )}

                                  {/* ミニタスク */}
                                  {expandedMap[subtask.id] && tasks
                                    .filter((grand) => grand.parent_id === subtask.id)
                                    .filter((t) => (showCompleted || t.status !== "completed") && (showOverdue || !isOverdue(t)))
                                    .map((grand) => (
                                      <div key={grand.id} className="mt-2 ml-6 max-w-2xl">
                                        <Card
                                          className={`p-2 shadow-sm rounded-none ${getTaskBackgroundClass(grand)}`}
                                        >
                                          <div className="flex items-start justify-between gap-1">
                                            <div className="flex-1 min-w-0">
                                              <h5 className="font-bold text-xs">{grand.title}</h5>
                                              {grand.description && (
                                                <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{grand.description}</p>
                                              )}
                                              <div className="text-xs text-gray-500 mt-1 flex gap-2 flex-wrap">
                                                <span>期限: {formatDate(grand.deadline)}</span>
                                                <span>優先度: {grand.priority || "なし"}</span>
                                                <span>担当: {getAssigneeName(grand.assignee_id)}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                              <Select
                                                value={grand.status}
                                                onValueChange={(value) =>
                                                  handleStatusChange(grand.id, value)
                                                }
                                              >
                                                <SelectTrigger className="w-[90px] h-7 text-xs font-bold rounded-none">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="not_started"><span className="font-bold">未着手</span></SelectItem>
                                                  <SelectItem value="in_progress"><span className="font-bold">進行中</span></SelectItem>
                                                  <SelectItem value="completed"><span className="font-bold">完了</span></SelectItem>
                                                </SelectContent>
                                              </Select>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-xs"
                                                onClick={() => {
                                                  setEditingTask(grand);
                                                  setIsTaskEditOpen(true);
                                                }}
                                                title="編集"
                                              >
                                                編集
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => handleDeleteTask(grand.id)}
                                                title="削除"
                                              >
                                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                              </Button>
                                            </div>
                                          </div>
                                        </Card>
                                      </div>
                                    ))}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* タイムラインビュー */}
          {taskView === "timeline" && (
            <div>
              <div className="mb-4 flex items-center gap-4 flex-wrap">
                <Select value={sortKey} onValueChange={(v: any) => setSortKey(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="ソート方法" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">更新日時</SelectItem>
                    <SelectItem value="deadline">期限</SelectItem>
                  </SelectContent>
                </Select>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                  />
                  完了タスクも表示
                </label>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showOverdue}
                    onChange={(e) => setShowOverdue(e.target.checked)}
                  />
                  期限超過を非表示
                </label>
              </div>

              <div className="space-y-2">
                {timelineGrouped().map(({ date, tasks: groupTasks }) => (
                  <div key={date}>
                    <div className="space-y-2">
                      {groupTasks.map((task) => (
                        <Card key={task.id} className={`p-3 ${getTaskBackgroundClass(task)}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{task.title}</h4>
                              {task.description && (
                                <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                                {sortKey === "deadline" ? (
                                  <>
                                    <span className="font-bold text-gray-700">期限: {formatDateWithTime(task.deadline)}</span>
                                    <span>優先度: {task.priority ?? 0}</span>
                                    <span>担当: {getAssigneeName(task.assignee_id)}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-gray-700">更新: {formatDateWithTime(task.updated_at || task.created_at)}</span>
                                    <span>優先度: {task.priority ?? 0}</span>
                                    <span>担当: {getAssigneeName(task.assignee_id)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value)}
                            >
                              <SelectTrigger className="w-[100px] h-8 text-xs">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* カレンダービュー */}
          {taskView === "calendar" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prev = new Date(calendarDate);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarDate(prev);
                    }}
                  >
                    前月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarDate(new Date())}
                  >
                    今月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = new Date(calendarDate);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarDate(next);
                    }}
                  >
                    翌月
                  </Button>
                </div>
                <h3 className="text-lg font-semibold">
                  {calendarDate.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                  })}
                </h3>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                  />
                  完了も表示
                </label>
                <label className="text-sm text-gray-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={showOverdue}
                    onChange={(e) => setShowOverdue(e.target.checked)}
                  />
                  期限超過を非表示
                </label>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                  <div key={d} className="text-center font-semibold text-sm p-2">
                    {d}
                  </div>
                ))}
                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const dayTasks = calendarTasks()[day] || [];
                  return (
                    <Card key={day} className="aspect-square p-2 flex flex-col">
                      <p className="text-sm font-semibold">{day}</p>
                      <div className="flex-1 text-xs space-y-1 overflow-y-auto">
                        {dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className={`px-1 py-0.5 rounded truncate ${
                              t.status === "completed"
                                ? "bg-blue-100 text-blue-800"
                                : isOverdue(t)
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-gray-500 text-xs">
                            +{dayTasks.length - 2} 他
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
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
      {activeTab === "settings" && isAdmin && (
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
      {activeTab === "settings" && !isAdmin && (
        <div className="p-8 text-center text-gray-500">
          <p>ADMINのみがプロジェクト設定にアクセスできます。</p>
        </div>
      )}
    </div>
  );
}
