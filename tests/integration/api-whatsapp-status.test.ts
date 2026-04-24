import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockRequireAuth = vi.fn();
const mockGetWhatsAppStatusWithQueue = vi.fn();
const mockGetWhatsAppCompatibilityAudit = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/whatsapp-ops", () => ({
  getWhatsAppStatusWithQueue: mockGetWhatsAppStatusWithQueue,
  getWhatsAppCompatibilityAudit: mockGetWhatsAppCompatibilityAudit,
}));

describe("app/api/whatsapp/status", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockGetWhatsAppStatusWithQueue.mockReset();
    mockGetWhatsAppCompatibilityAudit.mockReset();
  });

  it("combines queue status and compatibility data for the dashboard", async () => {
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
      ownerId: "owner-1",
    });
    mockGetWhatsAppStatusWithQueue.mockResolvedValue({
      connectionState: "connected",
      queueDepth: 2,
    });
    mockGetWhatsAppCompatibilityAudit.mockResolvedValue({
      warnings: [],
    });

    const { GET } = await import("@/app/api/whatsapp/status/route");
    const response = await GET(createJsonRequest("/api/whatsapp/status"));
    const payload = await readJson<{
      success: boolean;
      data: {
        connectionState: string;
        queueDepth: number;
        compatibilityAudit: { warnings: unknown[] };
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        connectionState: "connected",
        queueDepth: 2,
        compatibilityAudit: { warnings: [] },
      },
    });
  });
});
