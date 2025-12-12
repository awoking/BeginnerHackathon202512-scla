import { useCallback } from "react";
import { StorageService } from "@/services/StorageService";

export function useAuth() {
  const getToken = useCallback(() => {
    return StorageService.getToken();
  }, []);

  const isAuthenticated = useCallback(() => {
    return StorageService.hasToken();
  }, []);

  const logout = useCallback(() => {
    StorageService.clearToken();
  }, []);

  const fetchWithAuth = useCallback(
    async (
      url: string,
      options: RequestInit = {}
    ): Promise<Response> => {
      const token = getToken();
      const headers = {
        ...options.headers,
      } as Record<string, string>;

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [getToken]
  );

  return {
    getToken,
    isAuthenticated,
    logout,
    fetchWithAuth,
  };
}
