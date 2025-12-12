// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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
