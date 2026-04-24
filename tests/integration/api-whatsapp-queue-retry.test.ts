import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockRequireAuth = vi.fn();
const mockRetryQueueItems = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/lib/whatsapp-ops", () => ({
  retryQueueItems: mockRetryQueueItems,
}));

describe("app/api/whatsapp/queue/retry", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRequireAuth.mockReset();
    mockRetryQueueItems.mockReset();
  });

  it("retries the requested queue items for the authenticated branch", async () => {
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
    });
    mockRetryQueueItems.mockResolvedValue({
      retried: 2,
      skipped: 0,
    });

    const { POST } = await import("@/app/api/whatsapp/queue/retry/route");
    const response = await POST(
      createJsonRequest("/api/whatsapp/queue/retry", {
        ids: [
          "44444444-4444-4444-8444-444444444444",
          "55555555-5555-4555-8555-555555555555",
        ],
      })
    );
    const payload = await readJson<{
      success: boolean;
      data: { retried: number; skipped: number };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        retried: 2,
        skipped: 0,
      },
    });
    expect(mockRetryQueueItems).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
      [
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555",
      ]
    );
  });
});
