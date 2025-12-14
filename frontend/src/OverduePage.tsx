import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { TaskApi, type Task } from "@/services/TaskApi";
import { useAuth } from "@/hooks/useAuth";
import { ERROR_MESSAGES } from "@/config/constants";

export function OverduePage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      if (!token) throw new Error("認証トークンがありません");
      const data = await TaskApi.getMyOverdueAssigned(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "期限なし";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">期限超過の担当タスク</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">期限超過のタスクはありません。</p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <div className="text-sm text-gray-600">{t.project_name}</div>
                  {t.description && <div className="text-sm mt-2">{t.description}</div>}
                </div>
                <div className="text-sm text-gray-700 text-right">
                  <div>期限: {formatDate(t.deadline)}</div>
                  <div className="mt-2">優先度: {t.priority}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
