import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AuthApi } from "@/services/AuthApi";
import { StorageService } from "@/services/StorageService";
import { ERROR_MESSAGES } from "@/config/constants";

interface LoginFormState {
  username: string;
  password: string;
  error: string;
  isLoading: boolean;
}

export function LoginPage() {
  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
    error: "",
    isLoading: false,
  });
  const navigate = useNavigate();

  const handleInputChange = (field: keyof Omit<LoginFormState, "error" | "isLoading">) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForm((prev) => ({ ...prev, error: "", isLoading: true }));

    try {
      const data = await AuthApi.login(form.username, form.password);
      StorageService.setToken(data.access_token, data.token_type);
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
        <h1 className="text-2xl font-bold mb-6 text-center">ログイン</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              type="text"
              value={form.username}
              onChange={handleInputChange("username")}
              placeholder="ユーザー名を入力"
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
              placeholder="パスワードを入力"
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
            disabled={form.isLoading || !form.username || !form.password}
          >
            {form.isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
