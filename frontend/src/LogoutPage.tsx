import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function LogoutPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">ログアウトしました</h1>
        <p className="text-gray-600">再度利用するにはログインしてください。</p>
        <Button className="w-full" onClick={handleBackToLogin}>
          ログイン画面へ戻る
        </Button>
      </Card>
    </div>
  );
}
