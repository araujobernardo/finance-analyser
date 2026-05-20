// Tests for AuthContext — covers the logout behaviour introduced in fix #677
// (ACTIVE_ACCOUNT_KEY must be cleared from localStorage on logout).

import { describe, it, expect, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { ACTIVE_ACCOUNT_KEY } from "./accountKeys";

// ── Helpers ────────────────────────────────────────────────────────────────

function ContextReader({
  onRender,
}: {
  onRender: (val: ReturnType<typeof useAuth>) => void;
}) {
  const ctx = useAuth();
  onRender(ctx);
  return null;
}

const FAKE_TOKEN = "eyJhbGciOiJIUzI1NiJ9.test.signature";
const FAKE_USER = { id: "user-1", email: "a@b.com", displayName: "A" };

beforeEach(() => {
  localStorage.clear();
});

// ── AuthProvider ───────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  it("starts unauthenticated when localStorage is empty", () => {
    let ctx!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AuthProvider>,
    );
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.user).toBeNull();
    expect(ctx.accessToken).toBeNull();
  });

  it("restores session from localStorage on mount", () => {
    localStorage.setItem("fa-auth-token", FAKE_TOKEN);
    localStorage.setItem("fa-auth-user", JSON.stringify(FAKE_USER));
    let ctx!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AuthProvider>,
    );
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.accessToken).toBe(FAKE_TOKEN);
    expect(ctx.user?.id).toBe("user-1");
  });

  it("login() sets token, user, and isAuthenticated", () => {
    let ctx!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AuthProvider>,
    );
    act(() => ctx.login(FAKE_TOKEN, FAKE_USER));
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.accessToken).toBe(FAKE_TOKEN);
    expect(ctx.user?.email).toBe("a@b.com");
    expect(localStorage.getItem("fa-auth-token")).toBe(FAKE_TOKEN);
  });

  it("logout() clears token, user, and isAuthenticated", () => {
    let ctx!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AuthProvider>,
    );
    act(() => ctx.login(FAKE_TOKEN, FAKE_USER));
    act(() => ctx.logout());
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.accessToken).toBeNull();
    expect(ctx.user).toBeNull();
    expect(localStorage.getItem("fa-auth-token")).toBeNull();
    expect(localStorage.getItem("fa-auth-user")).toBeNull();
  });

  it("logout() clears ACTIVE_ACCOUNT_KEY from localStorage (#677 fix)", () => {
    let ctx!: ReturnType<typeof useAuth>;
    render(
      <AuthProvider>
        <ContextReader onRender={(v) => (ctx = v)} />
      </AuthProvider>,
    );
    act(() => ctx.login(FAKE_TOKEN, FAKE_USER));
    // Simulate user having selected an account during their session
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "acc-user-a");
    act(() => ctx.logout());
    // The active account key must be cleared so it cannot leak to the next user
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBeNull();
  });
});
