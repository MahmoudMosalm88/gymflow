import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockQuery = vi.fn();
const mockWithTransaction = vi.fn();
const mockRequireAuth = vi.fn();
const mockDeactivateExpiredSubscriptions = vi.fn();
const mockEnsurePlanTemplateSchema = vi.fn();
const mockLoadPlanTemplateSnapshot = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/subscription-status", () => ({
  deactivateExpiredSubscriptions: mockDeactivateExpiredSubscriptions,
}));

vi.mock("@/lib/plan-templates", () => ({
  ensurePlanTemplateSchema: mockEnsurePlanTemplateSchema,
  loadPlanTemplateSnapshot: mockLoadPlanTemplateSnapshot,
}));

describe("subscription create conflict guard", () => {
  const organizationId = "22222222-2222-4222-8222-222222222222";
  const branchId = "11111111-1111-4111-8111-111111111111";
  const memberId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockWithTransaction.mockReset();
    mockRequireAuth.mockReset();
    mockDeactivateExpiredSubscriptions.mockReset();
    mockEnsurePlanTemplateSchema.mockReset();
    mockLoadPlanTemplateSnapshot.mockReset();

    mockQuery.mockResolvedValue({ rows: [] });
    mockRequireAuth.mockResolvedValue({
      organizationId,
      branchId,
      role: "owner",
      actorType: "owner",
      actorId: "44444444-4444-4444-8444-444444444444",
    });
    mockEnsurePlanTemplateSchema.mockResolvedValue(undefined);
    mockLoadPlanTemplateSnapshot.mockResolvedValue(null);
  });

  function createPayload(extra: Record<string, unknown> = {}) {
    return {
      member_id: memberId,
      start_date: 1777723200,
      plan_months: 1,
      price_paid: 250,
      payment_method: "cash",
      sessions_per_month: null,
      ...extra,
    };
  }

  it("allows online creates to replace the current active subscription when no guard is sent", async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: memberId }] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 99,
          organization_id: organizationId,
          branch_id: branchId,
          member_id: memberId,
          start_date: 1777723200,
          end_date: 1780315200,
          plan_months: 1,
          price_paid: 250,
          payment_method: "cash",
          sessions_per_month: null,
          is_active: true,
        }],
      });
    mockWithTransaction.mockImplementation(async (callback) => callback({ query: clientQuery }));

    const { POST } = await import("@/app/api/subscriptions/route");
    const response = await POST(createJsonRequest("/api/subscriptions", createPayload()));
    const payload = await readJson<{ success: boolean; data: { id: number } }>(response);

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe(99);
    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE subscriptions"),
      [organizationId, branchId, memberId]
    );
  });

  it("keeps rejecting explicit stale offline create guards", async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: memberId }] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] });
    mockWithTransaction.mockImplementation(async (callback) => callback({ query: clientQuery }));

    const { POST } = await import("@/app/api/subscriptions/route");
    const response = await POST(
      createJsonRequest("/api/subscriptions", createPayload({ expected_active_subscription_id: null }))
    );
    const payload = await readJson<{ success: boolean; message: string; code?: string }>(response);

    expect(response.status).toBe(409);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("This member's subscription changed on another device. Review and try again.");
    expect(clientQuery).toHaveBeenCalledTimes(2);
  });
});
