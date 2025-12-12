/**
 * 日付をフォーマット（日本語表記、日付のみ）
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '期限なし';
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * 日付と時刻をフォーマット（日本語表記、時刻を含む）
 */
export const formatDateWithTime = (dateString?: string): string => {
  if (!dateString) return '期限なし';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 日付のキーを取得（YYYY-MM-DD形式）
 */
export const getDateKey = (dateString?: string): string => {
  if (!dateString) return '期限なし';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};
