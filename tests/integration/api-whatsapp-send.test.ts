import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockQuery = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/db", () => ({
  query: mockQuery,
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: mockRequireAuth,
}));

describe("app/api/whatsapp/send", () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockRequireAuth.mockReset();
  });

  it("queues a QR code with the member id when the client has no physical card code", async () => {
    const memberId = "33333333-3333-4333-8333-333333333333";
    mockRequireAuth.mockResolvedValue({
      organizationId: "22222222-2222-4222-8222-222222222222",
      branchId: "11111111-1111-4111-8111-111111111111",
    });
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM members")) {
        return [
          {
            id: memberId,
            name: "Sara",
            card_code: null,
            whatsapp_do_not_contact: false,
          },
        ];
      }
      if (sql.includes("FROM settings")) return [];
      if (sql.includes("INSERT INTO message_queue")) {
        return [{ id: "queue-1", status: "pending", scheduled_at: "2026-05-01T00:00:00.000Z" }];
      }
      return [];
    });

    const { POST } = await import("@/app/api/whatsapp/send/route");
    const response = await POST(
      createJsonRequest("/api/whatsapp/send", {
        memberId,
        type: "qr_code",
      })
    );
    const payload = await readJson<{ success: boolean; data: { id: string } }>(response);

    expect(response.status).toBe(202);
    expect(payload.success).toBe(true);

    const insertCall = mockQuery.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO message_queue"));
    expect(insertCall).toBeDefined();
    const queuePayload = JSON.parse(String(insertCall?.[1]?.[5])) as { code?: string; message?: string };
    expect(queuePayload.code).toBe(memberId);
    expect(queuePayload.message).toContain(memberId);
  });
});
