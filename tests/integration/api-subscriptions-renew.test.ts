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

describe("subscription renewal stale flow", () => {
  const organizationId = "22222222-2222-4222-8222-222222222222";
  const branchId = "11111111-1111-4111-8111-111111111111";
  const memberId = "33333333-3333-4333-8333-333333333333";
  const previousSubscriptionId = 42;
  const previousEndDate = 1779537600;

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

  function renewPayload(extra: Record<string, unknown> = {}) {
    return {
      member_id: memberId,
      previous_subscription_id: previousSubscriptionId,
      plan_months: 1,
      price_paid: 250,
      payment_method: "cash",
      sessions_per_month: 26,
      ...extra,
    };
  }

  function previousRow(extra: Record<string, unknown> = {}) {
    return {
      id: previousSubscriptionId,
      member_id: memberId,
      start_date: 1776945600,
      end_date: previousEndDate,
      plan_months: 1,
      sessions_per_month: 26,
      is_active: true,
      ...extra,
    };
  }

  it("treats an already-created renewal as success for online retries", async () => {
    const renewal = {
      id: 99,
      member_id: memberId,
      renewed_from_subscription_id: previousSubscriptionId,
      start_date: previousEndDate,
      end_date: 1782129600,
      plan_months: 1,
      price_paid: 250,
      payment_method: "cash",
      sessions_per_month: 26,
      is_active: true,
    };
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: memberId }] })
      .mockResolvedValueOnce({ rows: [previousRow()] })
      .mockResolvedValueOnce({ rows: [renewal] });
    mockWithTransaction.mockImplementation(async (callback) => callback({ query: clientQuery }));

    const { POST } = await import("@/app/api/subscriptions/renew/route");
    const response = await POST(createJsonRequest("/api/subscriptions/renew", renewPayload()));
    const payload = await readJson<{ success: boolean; data: { id: number } }>(response);

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe(99);
    expect(clientQuery).toHaveBeenCalledTimes(3);
  });

  it("treats a newer online cycle as success so stale modals refresh instead of failing", async () => {
    const newerCycle = {
      id: 100,
      member_id: memberId,
      renewed_from_subscription_id: null,
      start_date: previousEndDate,
      end_date: 1782129600,
      plan_months: 1,
      price_paid: 250,
      payment_method: "cash",
      sessions_per_month: 26,
      is_active: true,
    };
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: memberId }] })
      .mockResolvedValueOnce({ rows: [previousRow()] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [newerCycle] });
    mockWithTransaction.mockImplementation(async (callback) => callback({ query: clientQuery }));

    const { POST } = await import("@/app/api/subscriptions/renew/route");
    const response = await POST(createJsonRequest("/api/subscriptions/renew", renewPayload()));
    const payload = await readJson<{ success: boolean; data: { id: number } }>(response);

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe(100);
    expect(clientQuery).toHaveBeenCalledTimes(4);
  });

  it("still rejects an explicitly guarded offline renewal when the previous cycle changed", async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: memberId }] })
      .mockResolvedValueOnce({ rows: [previousRow({ end_date: previousEndDate + 86400 })] });
    mockWithTransaction.mockImplementation(async (callback) => callback({ query: clientQuery }));

    const { POST } = await import("@/app/api/subscriptions/renew/route");
    const response = await POST(
      createJsonRequest(
        "/api/subscriptions/renew",
        renewPayload({
          source: "offline_sync",
          expected_previous_end_date: previousEndDate,
          expected_previous_is_active: true,
        })
      )
    );
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(409);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("This subscription changed on another device. Review and try again.");
    expect(clientQuery).toHaveBeenCalledTimes(2);
  });
});
