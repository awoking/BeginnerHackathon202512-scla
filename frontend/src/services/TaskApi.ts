import { API_BASE_URL } from "@/config/constants";

export interface Task {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  project_id: number; // 必須: すべてのタスクはプロジェクト配下
  parent_id?: number;
  status: string; // "not_started" | "in_progress" | "completed"
  priority: number;
  assignee_id?: number;
  project_name?: string;
  project_creator_username?: string;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  deadline?: string;
  project_id: number; // 必須: すべてのタスクはプロジェクト配下
  parent_id?: number;
  status?: string;
  priority?: number;
  assignee_id?: number;
}

export interface TaskStatusUpdate {
  status: string;
}

export interface TaskAssigneeUpdate {
  assignee_id: number | null;
}

export interface TaskPriorityUpdate {
  priority: number;
}

export class TaskApi {
  // プロジェクト内のすべてのタスクを取得（フィルター対応）
  static async getProjectTasks(
    token: string,
    projectId: number,
    filters?: {
      status?: string;
      assignee_id?: number;
      priority?: number;
      parent_id?: number;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.assignee_id) params.append("assignee_id", String(filters.assignee_id));
    if (filters?.priority) params.append("priority", String(filters.priority));
    if (filters?.parent_id) params.append("parent_id", String(filters.parent_id));
    if (filters?.search) params.append("search", filters.search);
    if (filters?.limit) params.append("limit", String(filters.limit));
    if (filters?.offset) params.append("offset", String(filters.offset));

    const queryString = params.toString();
    const url = `${API_BASE_URL}/tasks/projects/${projectId}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "タスクの取得に失敗しました");
    }

    return response.json();
  }

  // サブタスク取得
  static async getChildren(token: string, taskId: number): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/children`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "サブタスクの取得に失敗しました");
    }

    return response.json();
  }

  // 自分が担当のタスク一覧（プロジェクト情報付き）
  static async getMyAssignedTasks(token: string): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks/assigned/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "担当タスクの取得に失敗しました");
    }

    return response.json();
  }

  // タスク編集
  static async updateTask(
    token: string,
    taskId: number,
    payload: {
      title?: string;
      description?: string;
      deadline?: string;
      priority?: number;
      assignee_id?: number | null;
      parent_id?: number | null;
    }
  ): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "タスクの更新に失敗しました");
    }

    return response.json();
  }

  // 単一タスク取得
  static async getTask(token: string, taskId: number): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "タスクの取得に失敗しました");
    }

    return response.json();
  }

  // タスク作成
  static async createTask(token: string, task: TaskCreate): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "タスクの作成に失敗しました");
    }

    return response.json();
  }

  // タスク削除
  static async deleteTask(token: string, taskId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "タスクの削除に失敗しました");
    }
  }

  // ステータス更新
  static async updateStatus(
    token: string,
    taskId: number,
    status: string
  ): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "ステータスの更新に失敗しました");
    }

    return response.json();
  }

  // 担当者変更
  static async updateAssignee(
    token: string,
    taskId: number,
    assigneeId: number | null
  ): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/assignee`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assignee_id: assigneeId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "担当者の変更に失敗しました");
    }

    return response.json();
  }

  // 優先度更新
  static async updatePriority(
    token: string,
    taskId: number,
    priority: number
  ): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/priority`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ priority }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "優先度の更新に失敗しました");
    }

    return response.json();
  }
}
