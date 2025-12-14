import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskApi } from "@/services/TaskApi";
import { API_BASE_URL } from "@/config/constants";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Home, FolderOpen, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ProjectApi, type Project } from "@/services/ProjectApi";

const menuItems = [
  {
    title: "ダッシュボード",
    url: "/",
    icon: Home,
  },
  {
    title: "プロジェクト",
    url: "/projects",
    icon: FolderOpen,
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { logout, getToken, fetchWithAuth } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; icon: number } | null>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const token = getToken();
        if (!token) return;
        const data = await ProjectApi.getMyProjects(token);
        setProjects(data);
      } catch {
        // サイドバーなので静かに失敗しても無視
      } finally {
        setLoadingProjects(false);
      }
    };
    loadProjects();
    // load current user
    const loadUser = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/users/me`);
        if (!res.ok) return;
        const json = await res.json();
        setCurrentUser({ id: json.id, username: json.username, icon: json.icon });
      } catch {
        // ignore
      }
    };
    loadUser();
  }, [getToken]);

  useEffect(() => {
    // fetch overdue notifications on mount and on navigation
    const fetchOverdue = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const items = await TaskApi.getMyOverdueAssigned(token);
        setOverdueCount(items.length);
      } catch {
        setOverdueCount(0);
      }
    };
    fetchOverdue();
  }, [getToken, location.pathname]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <h2 className="text-lg font-bold">Todo App</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>メニュー</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>プロジェクト</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {loadingProjects && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <div className="text-sm text-gray-500">読み込み中...</div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {!loadingProjects && projects.length === 0 && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <div className="text-sm text-gray-500">参加中のプロジェクトなし</div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  {projects.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton asChild>
                        <a href={`/projects/${project.id}`}>
                          <FolderOpen className="h-4 w-4" />
                          <span>
                            {project.creator_username} / {project.name}
                          </span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <SidebarTrigger />
              {currentUser && (
                <div className="flex items-center gap-3">
                  <button
                    className="relative p-1 hover:bg-gray-100 rounded"
                    onClick={() => navigate("/tasks/overdue")}
                    title="期限超過タスクを見る"
                  >
                    <Bell className="h-5 w-5 text-gray-700" />
                    {overdueCount > 0 && (
                      <Badge className="absolute -top-1 -right-1">{overdueCount}</Badge>
                    )}
                  </button>
                  <img
                    src={`/images/kkrn_icon_user_${currentUser.icon}.png`}
                    alt={currentUser.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="text-sm font-medium">{currentUser.username}</div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
