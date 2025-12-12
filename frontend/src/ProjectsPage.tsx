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
import { Plus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProjectApi } from "@/services/ProjectApi";
import type { Project, ProjectCreate } from "@/services/ProjectApi";
import { useAuth } from "@/hooks/useAuth";
import { ERROR_MESSAGES } from "@/config/constants";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [newProject, setNewProject] = useState<ProjectCreate>({
    name: "",
  });

  const loadProjects = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");

      const data = await ProjectApi.getMyProjects(token);
      setProjects(data);
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
      });

      setNewProject({ name: "" });
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
        <p className="text-gray-500">
          プロジェクトがありません。新しいプロジェクトを作成してください。
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold flex-1">{project.name}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                作成日: {formatDate(project.created_at)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}`);
                  }}
                >
                  詳細を見る
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}/members`);
                  }}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
