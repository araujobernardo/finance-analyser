import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

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
      const response = await fetch(url, mergedInit);

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
