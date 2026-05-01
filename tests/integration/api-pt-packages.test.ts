import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockRequireAuth = vi.fn();
const mockCreatePtPackage = vi.fn();
const mockCreateNotification = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/pt", () => ({
  createPtPackage: mockCreatePtPackage,
  listBranchPtPackages: vi.fn(),
  listMemberPtPackages: vi.fn(),
  listTrainerPtPackages: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: mockCreateNotification,
}));

describe("app/api/pt/packages", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockCreatePtPackage.mockReset();
    mockCreateNotification.mockReset();
  });

  it("notifies the assigned trainer when a PT package is sold", async () => {
    const memberId = "33333333-3333-4333-8333-333333333333";
    const trainerId = "44444444-4444-4444-8444-444444444444";
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      role: "owner",
      actorType: "owner",
      actorId: "66666666-6666-4666-8666-666666666666",
    });
    mockCreatePtPackage.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      member_id: memberId,
      assigned_trainer_staff_user_id: trainerId,
      title: "Strength PT",
    });
    mockCreateNotification.mockResolvedValue({ id: "notification-1", recipients: 1 });

    const { POST } = await import("@/app/api/pt/packages/route");
    const response = await POST(
      createJsonRequest("/api/pt/packages", {
        member_id: memberId,
        assigned_trainer_staff_user_id: trainerId,
        title: "Strength PT",
        total_sessions: 10,
        price_paid: 1000,
        payment_method: "cash",
        valid_from: "2026-05-01",
        valid_until: "2026-06-01",
      })
    );
    const payload = await readJson<{ success: boolean }>(response);

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pt_package_assigned",
        actionUrl: `/dashboard/members/${memberId}`,
        metadata: expect.objectContaining({
          member_id: memberId,
          pt_package_id: "55555555-5555-4555-8555-555555555555",
          trainer_staff_user_id: trainerId,
        }),
      }),
      [{ organizationId: "22222222-2222-4222-8222-222222222222", branchId: "11111111-1111-4111-8111-111111111111" }]
    );
  });
});
