import { API_BASE_URL, ERROR_MESSAGES } from "@/config/constants";

interface LoginResponse {
  access_token: string;
  token_type?: string;
}

interface RegisterResponse {
  id: number;
  username: string;
}

export class AuthApi {
  static async login(username: string, password: string): Promise<LoginResponse> {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || ERROR_MESSAGES.LOGIN_FAILED);
    }

    return response.json();
  }

  static async register(username: string, password: string): Promise<RegisterResponse> {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "ユーザー登録に失敗しました"
      );
    }

    return response.json();
  }
}
