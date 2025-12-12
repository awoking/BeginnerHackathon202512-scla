import { STORAGE_KEYS } from "@/config/constants";

export class StorageService {
  static getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  static getTokenType(): string {
    return localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE) || "bearer";
  }

  static setToken(token: string, tokenType: string = "bearer"): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, tokenType);
  }

  static clearToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_TYPE);
  }

  static hasToken(): boolean {
    return !!this.getToken();
  }
}
