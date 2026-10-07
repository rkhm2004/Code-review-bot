const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function authToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("cs4_access_token") || "";
}
export function currentUser(): any {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem("cs4_user") || "null"); } catch { return null; }
}
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = authToken();
  if (token) headers.set("Authorization", "Bearer " + token);
  return fetch(API_BASE_URL + path, { ...init, headers });
}
export function logout() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("cs4_access_token");
    sessionStorage.removeItem("cs4_user");
    window.location.href = "/login";
  }
}
