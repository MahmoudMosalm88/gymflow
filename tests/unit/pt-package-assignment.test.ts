import { describe, expect, it, vi } from "vitest";

const mockWithTransaction = vi.fn();
const mockQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
}));

describe("createPtPackage", () => {
  beforeEach(() => {
    vi.resetModules();
    mockWithTransaction.mockReset();
    mockQuery.mockReset();
  });

  it("creates the trainer-client assignment used by the trainer clients page", async () => {
    const client = {
      query: vi.fn(async (sql: string, _params?: unknown[]) => {
        if (sql.includes("FROM members")) {
          return { rows: [{ id: "33333333-3333-4333-8333-333333333333" }] };
        }
        if (sql.includes("FROM staff_users")) {
          return { rows: [{ id: "44444444-4444-4444-8444-444444444444", role: "trainer", is_active: true }] };
        }
        if (sql.includes("INSERT INTO pt_packages")) {
          return {
            rows: [
              {
                id: "55555555-5555-4555-8555-555555555555",
                organization_id: "22222222-2222-4222-8222-222222222222",
                branch_id: "11111111-1111-4111-8111-111111111111",
                member_id: "33333333-3333-4333-8333-333333333333",
                assigned_trainer_staff_user_id: "44444444-4444-4444-8444-444444444444",
                title: "PT Package",
                total_sessions: 10,
                sessions_used: 0,
                price_paid: 100,
                valid_from: "2026-05-01T00:00:00.000Z",
                valid_until: "2026-06-01T00:00:00.000Z",
                status: "active",
                notes: null,
                sessions_remaining: 10,
              },
            ],
          };
        }
        return { rows: [] };
      }),
    };
    mockWithTransaction.mockImplementation(async (executor) => executor(client));

    const { createPtPackage } = await import("@/lib/pt");
    await createPtPackage({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      memberId: "33333333-3333-4333-8333-333333333333",
      assignedTrainerStaffUserId: "44444444-4444-4444-8444-444444444444",
      soldByActorType: "owner",
      soldByActorId: "66666666-6666-4666-8666-666666666666",
      title: "PT Package",
      totalSessions: 10,
      pricePaid: 100,
      paymentMethod: "cash",
      validFrom: "2026-05-01",
      validUntil: "2026-06-01",
      notes: null,
    });

    const assignmentInsert = client.query.mock.calls.find(([sql]) =>
      String(sql).includes("INSERT INTO member_trainer_assignments")
    );
    expect(assignmentInsert).toBeDefined();
    expect(assignmentInsert?.[1]).toEqual(
      expect.arrayContaining([
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
        "owner",
        "66666666-6666-4666-8666-666666666666",
      ])
    );
  });
});
