import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AuthApi } from "@/services/AuthApi";
import { StorageService } from "@/services/StorageService";
import { ERROR_MESSAGES } from "@/config/constants";

interface RegisterFormState {
  username: string;
  password: string;
  confirmPassword: string;
  error: string;
  isLoading: boolean;
}

export function RegisterPage() {
  const [form, setForm] = useState<RegisterFormState>({
    username: "",
    password: "",
    confirmPassword: "",
    error: "",
    isLoading: false,
  });
  const navigate = useNavigate();

  const handleInputChange = (field: keyof Omit<RegisterFormState, "error" | "isLoading">) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const validateForm = (): string | null => {
    if (!form.username.trim()) {
      return "ユーザー名を入力してください";
    }
    if (form.username.length < 3) {
      return "ユーザー名は3文字以上である必要があります";
    }
    if (!form.password) {
      return "パスワードを入力してください";
    }
    if (form.password.length < 6) {
      return "パスワードは6文字以上である必要があります";
    }
    if (form.password !== form.confirmPassword) {
      return "パスワードが一致しません";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForm((prev) => ({ ...prev, error: "" }));

    const validationError = validateForm();
    if (validationError) {
      setForm((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setForm((prev) => ({ ...prev, isLoading: true }));

    try {
      // ユーザー登録
      await AuthApi.register(form.username, form.password);

      // 登録後、自動的にログイン
      const loginData = await AuthApi.login(form.username, form.password);
      StorageService.setToken(loginData.access_token, loginData.token_type);

      // ダッシュボードにリダイレクト
      navigate("/");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR;
      setForm((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setForm((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">ユーザー登録</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              type="text"
              value={form.username}
              onChange={handleInputChange("username")}
              placeholder="ユーザー名を入力（3文字以上）"
              required
              disabled={form.isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={handleInputChange("password")}
              placeholder="パスワードを入力（6文字以上）"
              required
              disabled={form.isLoading}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              placeholder="パスワードを再入力"
              required
              disabled={form.isLoading}
            />
          </div>

          {form.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {form.error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={form.isLoading || !form.username || !form.password || !form.confirmPassword}
          >
            {form.isLoading ? "登録中..." : "登録"}
          </Button>

          <p className="text-center text-sm text-gray-600">
            既にアカウントをお持ちですか？{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              ログイン
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
