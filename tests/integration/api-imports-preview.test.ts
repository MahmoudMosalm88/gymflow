import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockQuery = vi.fn();
const mockWithTransaction = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

describe("app/api/imports/preview", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockWithTransaction.mockReset();
    mockRequireAuth.mockReset();

    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("returns 404 when the import artifact does not exist", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const { POST } = await import("@/app/api/imports/preview/route");
    const response = await POST(
      createJsonRequest("/api/imports/preview", {
        artifactId: "33333333-3333-4333-8333-333333333333",
        mapping: {
          member_name: "Name",
          phone: "Phone",
        },
        defaults: {
          gender_default: "male",
        },
      })
    );
    const payload = await readJson<{ success: boolean; message: string }>(
      response
    );

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      success: false,
      message: "Import artifact not found",
    });
  });

  it("builds the preview, persists row results, and returns the summary", async () => {
    mockQuery
      .mockResolvedValueOnce([
        {
          kind: "spreadsheet",
          payload: {
            kind: "spreadsheet",
            fileFormat: "csv",
            sheetName: "Members",
            headers: ["Name", "Phone", "Joined"],
            rows: [
              {
                Name: "Alice",
                Phone: "+201111111111",
                Joined: "2026-01-01",
              },
              {
                Name: "Broken Phone",
                Phone: "1234",
                Joined: "not-a-date",
              },
            ],
            totalRows: 2,
          },
        },
      ])
      .mockResolvedValueOnce([]);

    const mockClientQuery = vi.fn().mockResolvedValue({ rows: [] });
    mockWithTransaction.mockImplementation(async (executor: unknown) => {
      return await (executor as (client: { query: typeof mockClientQuery }) => Promise<unknown>)({
        query: mockClientQuery,
      });
    });

    const { POST } = await import("@/app/api/imports/preview/route");
    const response = await POST(
      createJsonRequest("/api/imports/preview", {
        artifactId: "33333333-3333-4333-8333-333333333333",
        mapping: {
          member_name: "Name",
          phone: "Phone",
          joined_at: "Joined",
        },
        defaults: {
          gender_default: "female",
        },
      })
    );
    const payload = await readJson<{
      success: boolean;
      data: {
        artifactId: string;
        summary: {
          totalRows: number;
          validRows: number;
          invalidRows: number;
        };
        rows: Array<{ status: string; rowNumber: number }>;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.artifactId).toBe(
      "33333333-3333-4333-8333-333333333333"
    );
    expect(payload.data.summary).toMatchObject({
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
    });
    expect(payload.data.rows).toHaveLength(2);
    expect(mockClientQuery).toHaveBeenCalledTimes(4);
  });
});
