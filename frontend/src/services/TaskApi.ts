import { API_BASE_URL } from "@/config/constants";

export interface Task {
  id: number;
  title: string;
  description?: string;
  deadline?: string;
  owner_id: number;
  team_id?: number;
  created_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  deadline?: string;
}

export class TaskApi {
  static async getTasks(token: string): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks/`, {
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
}
