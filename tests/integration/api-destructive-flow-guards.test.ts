import { createJsonRequest, readJson } from "@/tests/helpers/http";
import { NextRequest } from "next/server";

const mockQuery = vi.fn();
const mockWithTransaction = vi.fn();
const mockRequireRoles = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
  withTransaction: mockWithTransaction,
}));

vi.mock("@/lib/auth", () => ({
  requireRoles: mockRequireRoles,
}));

describe("destructive flow guards", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockWithTransaction.mockReset();
    mockRequireRoles.mockReset();
    mockRequireRoles.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      role: "owner",
    });
  });

  it("requires explicit confirmation text before restoring a backup", async () => {
    const { POST } = await import("@/app/api/backup/restore/route");
    const response = await POST(
      createJsonRequest("/api/backup/restore", {
        artifactId: "33333333-3333-4333-8333-333333333333",
      })
    );
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      message: "Type RESTORE to confirm restoring this backup.",
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation text before executing a desktop import", async () => {
    const { POST } = await import("@/app/api/migration/execute/route");
    const response = await POST(
      createJsonRequest("/api/migration/execute", {
        artifactId: "33333333-3333-4333-8333-333333333333",
      })
    );
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      message: "Type IMPORT to confirm replacing the current branch data.",
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation text before restoring a desktop backup file", async () => {
    const { POST } = await import("@/app/api/backup/restore-db/route");
    const formData = new FormData();
    formData.append("file", new File(["db"], "backup.db"));
    const response = await POST(
      new NextRequest("http://localhost/api/backup/restore-db", {
        method: "POST",
        body: formData,
      })
    );
    const payload = await readJson<{ success: boolean; message: string }>(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      message: "Type RESTORE to confirm restoring this backup.",
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
