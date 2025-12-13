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
 * @param task タスク
 * @returns Tailwind CSS のクラス名
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

/**
 * カレンダーのタスク色を取得（より色分け）
 * @param task タスク
 * @returns Tailwind CSS のクラス名
 */
export const getCalendarTaskColorClass = (task: { status: string; deadline?: string }): string => {
  if (task.status === "completed") {
    return "bg-blue-100 text-blue-800";
  }
  if (isOverdue(task)) {
    return "bg-red-100 text-red-800";
  }
  return "bg-gray-100 text-gray-800";
};

