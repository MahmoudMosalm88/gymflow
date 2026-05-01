import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockRequireAuth = vi.fn();
const mockQuery = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/db", () => ({
  query: mockQuery,
}));

describe("trainer notification targeting", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockQuery.mockReset();
  });

  it("scopes trainer unread counts to notifications targeted to that trainer", async () => {
    const trainerId = "44444444-4444-4444-8444-444444444444";
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      role: "trainer",
      staffUserId: trainerId,
    });
    mockQuery.mockResolvedValue([{ count: "1" }]);

    const { GET } = await import("@/app/api/notifications/unread-count/route");
    const response = await GET(createJsonRequest("/api/notifications/unread-count"));
    const payload = await readJson<{ success: boolean; data: { unread: number } }>(response);

    expect(response.status).toBe(200);
    expect(payload.data.unread).toBe(1);
    expect(String(mockQuery.mock.calls[0]?.[0])).toContain("trainer_staff_user_id");
    expect(mockQuery.mock.calls[0]?.[1]?.[2]).toBe(trainerId);
  });
});
