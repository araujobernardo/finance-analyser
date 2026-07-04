/**
 * FA-AI-001 / #944 — Integration tests for /api/summaries routes
 *
 * Covers:
 *   GET  /api/summaries/latest — { summary: null } when empty; most-recent summary otherwise
 *   GET  /api/summaries        — all summaries, newest-first
 *   POST /api/summaries        — creates summary; returns saved record (UUID id, ISO generatedAt)
 *   401  responses             — all three endpoints require a valid JWT
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports
// ---------------------------------------------------------------------------

vi.mock("../../db/index.ts", () => ({ db: {} }));

vi.mock("../middleware/authenticateToken.ts", () => ({
  authenticateToken: vi.fn(),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual };
});

// ---------------------------------------------------------------------------
// Static imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { db } from "../../db/index.ts";
import { authenticateToken } from "../middleware/authenticateToken.ts";
import { financialSummariesRouter } from "./financialSummaries.ts";

const mockDb = db as unknown as Record<string, unknown>;
const mockAuth = vi.mocked(authenticateToken);

// ---------------------------------------------------------------------------
// Test application
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());
app.use("/api/summaries", financialSummariesRouter);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FAKE_ROW_1 = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-001",
  generatedAt: new Date("2026-07-01T10:00:00.000Z"),
  content: "Your finances look great.",
  previousSummaryId: null,
};

const FAKE_ROW_2 = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  userId: "user-001",
  generatedAt: new Date("2026-06-01T10:00:00.000Z"),
  content: "Older summary.",
  previousSummaryId: null,
};

const EXPECTED_API_1 = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  generatedAt: "2026-07-01T10:00:00.000Z",
  content: "Your finances look great.",
  previousSummaryId: null,
};

const EXPECTED_API_2 = {
  id: "660e8400-e29b-41d4-a716-446655440001",
  generatedAt: "2026-06-01T10:00:00.000Z",
  content: "Older summary.",
  previousSummaryId: null,
};

// ---------------------------------------------------------------------------
// Helpers — Drizzle query chain mocks
// ---------------------------------------------------------------------------

/**
 * Sets up db.select() to return `rows` for both:
 *   - GET /api/summaries        → select().from().where().orderBy()       (await resolves)
 *   - GET /api/summaries/latest → select().from().where().orderBy().limit() (await resolves)
 */
function mockSelectChain(rows: object[]) {
  // orderByResult is both a Promise (for GET /) and has .limit() (for GET /latest)
  const orderByResult = Object.assign(Promise.resolve(rows), {
    limit: vi.fn().mockResolvedValue(rows),
  });
  const whereChain = {
    where: vi
      .fn()
      .mockReturnValue({ orderBy: vi.fn().mockReturnValue(orderByResult) }),
  };
  const fromChain = { from: vi.fn().mockReturnValue(whereChain) };
  mockDb.select = vi.fn().mockReturnValue(fromChain);
}

/** Sets up db.insert().values().returning() to return [row] */
function mockInsertChain(row: object) {
  const returningChain = { returning: vi.fn().mockResolvedValue([row]) };
  const valuesChain = { values: vi.fn().mockReturnValue(returningChain) };
  mockDb.insert = vi.fn().mockReturnValue(valuesChain);
}

// ---------------------------------------------------------------------------
// Default: authorize every request before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockAuth.mockImplementation((_req, res, next) => {
    (res.locals as { user: { userId: string } }).user = { userId: "user-001" };
    next();
  });
});

// ---------------------------------------------------------------------------
// GET /api/summaries/latest
// ---------------------------------------------------------------------------

describe("GET /api/summaries/latest", () => {
  it("returns { summary: null } for a user with no summaries", async () => {
    mockSelectChain([]);

    const res = await request(app)
      .get("/api/summaries/latest")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: null });
  });

  it("returns the most recent ApiFinancialSummary for a user with summaries", async () => {
    mockSelectChain([FAKE_ROW_1]);

    const res = await request(app)
      .get("/api/summaries/latest")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summary: EXPECTED_API_1 });
  });

  it("serialises generatedAt as an ISO 8601 string", async () => {
    mockSelectChain([FAKE_ROW_1]);

    const res = await request(app)
      .get("/api/summaries/latest")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body.summary.generatedAt).toBe("2026-07-01T10:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// GET /api/summaries
// ---------------------------------------------------------------------------

describe("GET /api/summaries", () => {
  it("returns all summaries newest-first", async () => {
    mockSelectChain([FAKE_ROW_1, FAKE_ROW_2]);

    const res = await request(app)
      .get("/api/summaries")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summaries: [EXPECTED_API_1, EXPECTED_API_2] });
  });

  it("returns an empty summaries array when user has no summaries", async () => {
    mockSelectChain([]);

    const res = await request(app)
      .get("/api/summaries")
      .set("Authorization", "Bearer fake-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ summaries: [] });
  });
});

// ---------------------------------------------------------------------------
// POST /api/summaries
// ---------------------------------------------------------------------------

describe("POST /api/summaries", () => {
  it("creates a summary and returns the saved record with status 201", async () => {
    mockInsertChain(FAKE_ROW_1);

    const res = await request(app)
      .post("/api/summaries")
      .set("Authorization", "Bearer fake-token")
      .send({ content: "Your finances look great.", previousSummaryId: null });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(EXPECTED_API_1);
  });

  it("returned record has a UUID id", async () => {
    mockInsertChain(FAKE_ROW_1);

    const res = await request(app)
      .post("/api/summaries")
      .set("Authorization", "Bearer fake-token")
      .send({ content: "Your finances look great.", previousSummaryId: null });

    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("returned record has a server-assigned ISO generatedAt timestamp", async () => {
    mockInsertChain(FAKE_ROW_1);

    const res = await request(app)
      .post("/api/summaries")
      .set("Authorization", "Bearer fake-token")
      .send({ content: "Your finances look great.", previousSummaryId: null });

    expect(typeof res.body.generatedAt).toBe("string");
    expect(res.body.generatedAt).toBe("2026-07-01T10:00:00.000Z");
  });

  it("returns 400 when content field is missing", async () => {
    const res = await request(app)
      .post("/api/summaries")
      .set("Authorization", "Bearer fake-token")
      .send({ previousSummaryId: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when content is an empty string", async () => {
    const res = await request(app)
      .post("/api/summaries")
      .set("Authorization", "Bearer fake-token")
      .send({ content: "", previousSummaryId: null });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

// ---------------------------------------------------------------------------
// 401 — all endpoints require a valid JWT
// ---------------------------------------------------------------------------

describe("401 — unauthenticated requests", () => {
  beforeEach(() => {
    // Override: reject every request without a valid token
    mockAuth.mockImplementation((_req, res) => {
      res.status(401).json({ error: "Authentication required" });
    });
  });

  it("GET /api/summaries/latest returns 401 without a valid JWT", async () => {
    const res = await request(app).get("/api/summaries/latest");
    expect(res.status).toBe(401);
  });

  it("GET /api/summaries returns 401 without a valid JWT", async () => {
    const res = await request(app).get("/api/summaries");
    expect(res.status).toBe(401);
  });

  it("POST /api/summaries returns 401 without a valid JWT", async () => {
    const res = await request(app)
      .post("/api/summaries")
      .send({ content: "test", previousSummaryId: null });
    expect(res.status).toBe(401);
  });
});
