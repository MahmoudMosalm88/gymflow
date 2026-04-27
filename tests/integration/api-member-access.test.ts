import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockQuery = vi.fn();
const mockRequireAuth = vi.fn();
const mockRequireRoles = vi.fn();
const mockTrainerHasMemberAccess = vi.fn();
const mockDeactivateExpiredSubscriptions = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
  requireRoles: mockRequireRoles,
}));

vi.mock("@/lib/trainers", () => ({
  trainerHasMemberAccess: mockTrainerHasMemberAccess,
}));

vi.mock("@/lib/subscription-status", () => ({
  deactivateExpiredSubscriptions: mockDeactivateExpiredSubscriptions,
}));

describe("member access boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockRequireAuth.mockReset();
    mockRequireRoles.mockReset();
    mockTrainerHasMemberAccess.mockReset();
    mockDeactivateExpiredSubscriptions.mockReset();
  });

  it("scopes trainer member list queries to the assigned trainer id", async () => {
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      role: "trainer",
      staffUserId: "44444444-4444-4444-8444-444444444444",
    });
    mockQuery.mockResolvedValue([]);

    const { GET } = await import("@/app/api/members/route");
    const response = await GET(createJsonRequest("/api/members"));
    const payload = await readJson<{ success: boolean; data: unknown[] }>(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[1]?.[3]).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("returns not found when a trainer requests a member outside their assignment", async () => {
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      role: "trainer",
      staffUserId: "44444444-4444-4444-8444-444444444444",
    });
    mockTrainerHasMemberAccess.mockResolvedValue(false);

    const { GET } = await import("@/app/api/members/[id]/route");
    const response = await GET(createJsonRequest("/api/members/member-1"), {
      params: { id: "member-1" },
    });
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      success: false,
      message: "Member not found",
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejects trainer access to the offline bundle", async () => {
    const error = new Error("Forbidden") as Error & { code?: string };
    error.code = "FORBIDDEN";
    mockRequireRoles.mockRejectedValue(error);

    const { GET } = await import("@/app/api/members/offline-bundle/route");
    const response = await GET(createJsonRequest("/api/members/offline-bundle"));
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      message: "You do not have permission to access this resource.",
    });
  });
});
