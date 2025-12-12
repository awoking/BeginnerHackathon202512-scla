import { API_BASE_URL } from "@/config/constants";

export interface Project {
  id: number;
  name: string;
  description?: string;
  creator_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string; // "ADMIN" | "VIEWER"
  invited_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectMemberInvite {
  username: string;
  role: string; // "ADMIN" | "VIEWER"
}

export class ProjectApi {
  // プロジェクト一覧（自分が関連しているもの）
  static async getMyProjects(token: string): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "プロジェクトの取得に失敗しました");
    }

    return response.json();
  }

  // プロジェクト詳細取得
  static async getProject(token: string, projectId: number): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "プロジェクトの取得に失敗しました");
    }

    return response.json();
  }

  // プロジェクト作成
  static async createProject(
    token: string,
    project: ProjectCreate
  ): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/projects/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(project),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "プロジェクトの作成に失敗しました");
    }

    return response.json();
  }

  // メンバー招待
  static async inviteMember(
    token: string,
    projectId: number,
    invite: ProjectMemberInvite
  ): Promise<ProjectMember> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/members/invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invite),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "メンバーの招待に失敗しました"
      );
    }

    return response.json();
  }

  // メンバー一覧
  static async getMembers(
    token: string,
    projectId: number
  ): Promise<ProjectMember[]> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "メンバーの取得に失敗しました");
    }

    return response.json();
  }

  // ロール変更
  static async changeRole(
    token: string,
    projectId: number,
    userId: number,
    role: string
  ): Promise<ProjectMember> {
    const response = await fetch(
      `${API_BASE_URL}/projects/${projectId}/members/${userId}/role`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "ロール変更に失敗しました");
    }

    return response.json();
  }
}
