import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Resolve the API base URL for fetch calls.
//
// Rules (applied in order):
//   1. VITE_API_URL="/api"  → ""  (double-prefix guard: call sites already include /api/)
//   2. VITE_API_URL starts with "http" → ""  (legacy absolute URL, e.g. old Railway host;
//      the app now runs same-domain on Vercel so same-origin fetch is correct)
//   3. Anything else (including "" / undefined) → use as-is
//
// This means the only safe non-empty value is a non-http relative prefix.
const _raw = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
export const API_BASE = _raw === "/api" || _raw.startsWith("http") ? "" : _raw;

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
