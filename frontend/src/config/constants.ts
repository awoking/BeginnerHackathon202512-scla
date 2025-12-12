// API Configuration
// Docker環境: http://backend:8000, 開発環境: http://localhost:8000
const getApiBaseUrl = (): string => {
  // 環境変数で指定されている場合はそれを使用
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Docker環境か開発環境かを判定（簡易版）
  // Docker内では window.location.hostname が異なるため、フォールバック
  return "http://localhost:8000";
};

export const API_BASE_URL = getApiBaseUrl();

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  TOKEN_TYPE: "token_type",
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  LOGIN_FAILED: "ログインに失敗しました",
  INVALID_CREDENTIALS: "ユーザー名またはパスワードが間違っています",
  GENERIC_ERROR: "エラーが発生しました",
} as const;
