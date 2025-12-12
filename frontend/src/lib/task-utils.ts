/**
 * タスクが期限超過しているかを判定
 * @param task タスク（期限とステータスを持つ）
 * @returns 期限超過かつ完了以外の場合true
 */
export const isOverdue = (task: { deadline?: string; status: string }): boolean => {
  if (!task.deadline || task.status === "completed") return false;
  const now = new Date();
  const deadline = new Date(task.deadline);
  return deadline < now;
};

/**
 * タスクのスタイルクラスを取得（完了時は blue-50、期限超過時は red-50）
 */
export const getTaskBackgroundClass = (task: { deadline?: string; status: string }): string => {
  if (task.status === "completed") {
    return "bg-blue-50";
  }
  if (isOverdue(task)) {
    return "bg-red-50";
  }
  return "";
};
