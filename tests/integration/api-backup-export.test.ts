import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockRequireAuth = vi.fn();
const mockWithTransaction = vi.fn();
const mockBuildBranchArchive = vi.fn();
const mockCountArchiveRows = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/db", () => ({
  withTransaction: mockWithTransaction,
}));

vi.mock("@/lib/archive-engine", () => ({
  buildBranchArchive: mockBuildBranchArchive,
  countArchiveRows: mockCountArchiveRows,
}));

describe("app/api/backup/export", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockWithTransaction.mockReset();
    mockBuildBranchArchive.mockReset();
    mockCountArchiveRows.mockReset();
  });

  it("creates a backup artifact inside one transaction and returns row counts", async () => {
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
    });

    const archive = {
      version: "1",
      generated_at: "2026-04-24T00:00:00.000Z",
      tables: {
        members: [{ id: "member-1" }],
        subscriptions: [],
      },
    };
    const rowCounts = { members: 1, subscriptions: 0 };
    const mockClientQuery = vi.fn().mockResolvedValue({ rows: [] });

    mockBuildBranchArchive.mockResolvedValue(archive);
    mockCountArchiveRows.mockReturnValue(rowCounts);
    mockWithTransaction.mockImplementation(async (executor: unknown) => {
      return await (executor as (client: { query: typeof mockClientQuery }) => Promise<unknown>)({
        query: mockClientQuery,
      });
    });

    const { POST } = await import("@/app/api/backup/export/route");
    const response = await POST(createJsonRequest("/api/backup/export"));
    const payload = await readJson<{
      success: boolean;
      data: {
        backupId: string;
        artifactId: string;
        rowCounts: Record<string, number>;
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.backupId).toMatch(
      /^[0-9a-f-]{36}$/i
    );
    expect(payload.data.artifactId).toMatch(
      /^[0-9a-f-]{36}$/i
    );
    expect(payload.data.rowCounts).toEqual(rowCounts);
    expect(mockClientQuery).toHaveBeenCalledTimes(2);
  });
});
