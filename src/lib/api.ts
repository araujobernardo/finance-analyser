import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// When VITE_API_URL="/api", all call sites would produce /api/api/... double-prefix.
// Strip a trailing "/api" so the effective base is always the origin (call sites
// already include /api/ in their own paths).
const _raw = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
export const API_BASE = _raw === "/api" ? "" : _raw;

export function useApi() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const apiFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      if (accessToken !== null && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      const mergedInit: RequestInit = { ...init, headers };
      const response = await fetch(API_BASE + url, mergedInit);

      if (response.status === 401) {
        const clone = response.clone();
        try {
          const body = (await clone.json()) as { code?: string };
          if (body.code === "TOKEN_EXPIRED") {
            logout();
            navigate("/login");
          }
        } catch {
          // not JSON — ignore
        }
      }

      return response;
    },
    [accessToken, logout, navigate],
  );

  return { apiFetch };
}
