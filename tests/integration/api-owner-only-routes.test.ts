import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockRequireRoles = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireRoles: mockRequireRoles,
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/income-events", () => ({
  ensurePaymentsTable: vi.fn(),
  incomeEventsCte: "WITH income_events AS (SELECT 1)",
}));

describe("owner-only route boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireRoles.mockReset();
  });

  it("returns 403 for non-owner access to reports", async () => {
    const error = new Error("Forbidden") as Error & { code?: string };
    error.code = "FORBIDDEN";
    mockRequireRoles.mockRejectedValue(error);

    const { GET } = await import("@/app/api/reports/[report]/route");
    const response = await GET(createJsonRequest("/api/reports/revenue"), {
      params: { report: "revenue" },
    });
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  });

  it("returns 403 for non-owner access to income summary", async () => {
    const error = new Error("Forbidden") as Error & { code?: string };
    error.code = "FORBIDDEN";
    mockRequireRoles.mockRejectedValue(error);

    const { GET } = await import("@/app/api/income/summary/route");
    const response = await GET(createJsonRequest("/api/income/summary"));
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  });

  it("returns 403 for non-owner access to desktop import validation", async () => {
    const error = new Error("Forbidden") as Error & { code?: string };
    error.code = "FORBIDDEN";
    mockRequireRoles.mockRejectedValue(error);

    const { POST } = await import("@/app/api/migration/validate/route");
    const response = await POST(
      createJsonRequest("/api/migration/validate", {
        artifactId: "33333333-3333-4333-8333-333333333333",
      })
    );
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  });
});
