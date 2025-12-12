import { useState, useEffect } from "react";
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
import { Plus, Users, Zap, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectApi } from "@/services/ProjectApi";
import type { Project, ProjectCreate } from "@/services/ProjectApi";
import { useAuth } from "@/hooks/useAuth";
import { ERROR_MESSAGES } from "@/config/constants";
import { TaskApi } from "@/services/TaskApi";
import { ProgressBar } from "@/components/ui/progress-bar";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<number, { taskCount: number; members: number; leafCompleted: number; leafTotal: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [newProject, setNewProject] = useState<ProjectCreate>({
    name: "",
    description: "",
  });

  const loadProjects = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      const data = await ProjectApi.getMyProjects(token);
      setProjects(data);

      // プロジェクトごとのタスク数とメンバー数を取得
      const stats: Record<number, { taskCount: number; members: number; leafCompleted: number; leafTotal: number }> = {};
      for (const project of data) {
        try {
          const tasks = await TaskApi.getProjectTasks(token, project.id, {});
          const members = await ProjectApi.getMembers(token, project.id);

          // 葉タスク（子を持たないタスク）を計算
          let leafCompleted = 0;
          let leafTotal = 0;
          for (const task of tasks) {
            try {
              const children = await TaskApi.getChildren(token, task.id);
              if (!children || children.length === 0) {
                // 葉タスク
                leafTotal++;
                if (task.status === "completed") {
                  leafCompleted++;
                }
              }
            } catch {
              // エラー時も葉タスクとして数える（安全側）
              leafTotal++;
              if (task.status === "completed") {
                leafCompleted++;
              }
            }
          }

          stats[project.id] = {
            taskCount: tasks.length,
            members: members.length,
            leafCompleted,
            leafTotal,
          };
        } catch {
          stats[project.id] = { taskCount: 0, members: 0, leafCompleted: 0, leafTotal: 0 };
        }
      }
      setProjectStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      const created = await ProjectApi.createProject(token, {
        name: newProject.name,
        description: newProject.description || undefined,
      });

      setNewProject({ name: "", description: "" });
      setIsDialogOpen(false);
      setProjects([...projects, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">プロジェクト</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              プロジェクトを作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいプロジェクトを作成</DialogTitle>
              <DialogDescription>
                プロジェクト名を入力してください。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label htmlFor="projectName">プロジェクト名 *</Label>
                <Input
                  id="projectName"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  placeholder="プロジェクト名を入力"
                  required
                />
              </div>
              <div>
                <Label htmlFor="projectDescription">説明</Label>
                <Textarea
                  id="projectDescription"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  placeholder="プロジェクトの説明を入力（任意）"
                  rows={3}
                />
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

      {error && !isDialogOpen && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p>プロジェクトがありません。新しいプロジェクトを作成してください。</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => {
            const stats = projectStats[project.id] || { taskCount: 0, members: 0 };
            return (
              <Card
                key={project.id}
                className="p-4 cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-200 border group flex flex-col"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                {/* ヘッダー */}
                <div className="mb-3">
                  <h3 className="font-semibold text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    作成者: {project.creator_username || "不明"}
                  </p>
                </div>

                {/* 説明 */}
                {project.description && (
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2 flex-grow">
                    {project.description}
                  </p>
                )}

                {/* 統計情報 */}
                <div className="flex gap-3 text-xs text-gray-500 mb-3 pb-3 border-t pt-3">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-orange-500" />
                    <span>{stats.taskCount} タスク</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span>{stats.members} メンバー</span>
                  </div>
                </div>

                {/* 進捗ゲージ */}
                {stats.leafTotal > 0 && (
                  <div className="mb-3">
                    <ProgressBar
                      value={Math.round((stats.leafCompleted / stats.leafTotal) * 100)}
                      label={`完了: ${stats.leafCompleted}/${stats.leafTotal}`}
                      showPercentage={true}
                    />
                  </div>
                )}

                {/* 作成日 */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(project.created_at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
