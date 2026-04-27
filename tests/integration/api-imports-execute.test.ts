import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockQuery = vi.fn();
const mockWithTransaction = vi.fn();
const mockRequireRoles = vi.fn();
const mockUuidV4 = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
}));

vi.mock("@/lib/auth", () => ({
  requireRoles: mockRequireRoles,
}));

vi.mock("uuid", () => ({
  v4: mockUuidV4,
}));

describe("app/api/imports/execute", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockWithTransaction.mockReset();
    mockRequireRoles.mockReset();
    mockUuidV4.mockReset();

    mockRequireRoles.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("executes imports through batched member, subscription, and row-result writes", async () => {
    const jobId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const memberOneId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const memberThreeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const memberFourId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

    mockUuidV4
      .mockReturnValueOnce(jobId)
      .mockReturnValueOnce(memberOneId)
      .mockReturnValueOnce(memberThreeId)
      .mockReturnValueOnce(memberFourId);

    mockQuery
      .mockResolvedValueOnce([{ status: "validated" }])
      .mockResolvedValueOnce([
        {
          id: "row-1",
          row_number: 2,
          raw_row: {},
          normalized_row: {
            member: {
              name: "Alice",
              phone: "+201111111111",
              gender: "female",
              notes: "VIP",
              card_code: "A-1",
              joined_at: "2026-01-01T00:00:00.000Z",
            },
            subscription: {
              start_date: "2026-01-01T00:00:00.000Z",
              end_date: "2026-02-01T00:00:00.000Z",
              plan_months: 1,
              sessions_per_month: 12,
              amount_paid: 500,
            },
          },
          status: "valid",
          issues: [],
        },
        {
          id: "row-2",
          row_number: 3,
          raw_row: {},
          normalized_row: null,
          status: "duplicate",
          issues: [],
        },
        {
          id: "row-3",
          row_number: 4,
          raw_row: {},
          normalized_row: {
            member: {
              name: "Bob",
              phone: "+201111111112",
              gender: "male",
              notes: null,
              card_code: "A-2",
            },
            subscription: null,
          },
          status: "valid",
          issues: [],
        },
        {
          id: "row-4",
          row_number: 5,
          raw_row: {},
          normalized_row: {
            member: {
              name: "Carol",
              phone: "+201111111113",
              gender: "female",
              notes: null,
              card_code: "A-3",
            },
            subscription: {
              start_date: "2026-03-01T00:00:00.000Z",
              end_date: "2026-06-01T00:00:00.000Z",
              plan_months: 3,
              sessions_per_month: null,
              amount_paid: 1500,
            },
          },
          status: "warning",
          issues: [{ severity: "warning", field: "joined_at", message: "Join date skipped", code: "invalid_joined_at" }],
        },
        {
          id: "row-5",
          row_number: 6,
          raw_row: {},
          normalized_row: null,
          status: "invalid",
          issues: [{ severity: "error", field: "phone", message: "Invalid phone", code: "invalid_phone" }],
        },
      ]);

    const mockClientQuery = vi.fn(async (sql: string) => {
      if (sql.includes("SELECT id, phone, card_code")) {
        return { rows: [] };
      }
      if (sql.includes("SELECT seed.row_id, inserted.member_id, inserted.id AS subscription_id")) {
        return {
          rows: [
            { row_id: "row-1", member_id: memberOneId, subscription_id: 101 },
            { row_id: "row-4", member_id: memberFourId, subscription_id: 102 },
          ],
        };
      }
      return { rows: [] };
    });

    mockWithTransaction.mockImplementation(async (executor: unknown) => {
      return await (executor as (client: { query: typeof mockClientQuery }) => Promise<unknown>)({
        query: mockClientQuery,
      });
    });

    const { POST } = await import("@/app/api/imports/execute/route");
    const response = await POST(
      createJsonRequest("/api/imports/execute", {
        artifactId: "33333333-3333-4333-8333-333333333333",
        duplicate_mode: "skip_duplicates",
        suppressImportedAutomations: true,
      })
    );
    const payload = await readJson<{
      success: boolean;
      data: {
        jobId: string;
        artifactId: string;
        importedMembers: number;
        importedSubscriptions: number;
        skippedRows: number;
        failedRows: number;
      };
    }>(response);

    expect(response.status).toBe(201);
    expect(payload).toMatchObject({
      success: true,
      data: {
        jobId,
        artifactId: "33333333-3333-4333-8333-333333333333",
        importedMembers: 3,
        importedSubscriptions: 2,
        skippedRows: 1,
        failedRows: 0,
      },
    });

    expect(mockClientQuery.mock.calls.length).toBe(8);
    expect(
      mockClientQuery.mock.calls.some(([sql]) => String(sql).includes("FROM jsonb_to_recordset") && String(sql).includes("INSERT INTO members"))
    ).toBe(true);
    expect(
      mockClientQuery.mock.calls.some(([sql]) => String(sql).includes("WITH seed AS") && String(sql).includes("INSERT INTO subscriptions"))
    ).toBe(true);
    expect(
      mockClientQuery.mock.calls.some(([sql]) => String(sql).includes("UPDATE import_row_results AS target") && String(sql).includes("created_member_id"))
    ).toBe(true);
  });
});
