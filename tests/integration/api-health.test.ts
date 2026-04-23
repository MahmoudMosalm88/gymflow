import { readJson } from "@/tests/helpers/http";

describe("app/api/health", () => {
  it("returns process health plus the active release id", async () => {
    const { GET } = await import("@/app/api/health/route");

    const response = await GET();
    const payload = await readJson<{
      success: boolean;
      data: { status: string; releaseId: string };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        status: "ok",
        releaseId: "test-release",
      },
    });
  });
});
