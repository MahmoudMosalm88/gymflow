import { createJsonRequest, readJson } from "@/tests/helpers/http";

const mockCheckRateLimit = vi.fn();
const mockGetFirebaseAdminAuth = vi.fn();
const mockGetFirebaseAdminDiagnostics = vi.fn();
const mockGetActorAccessByFirebaseUid = vi.fn();
const mockGetActorAccessByPhone = vi.fn();
const mockToSessionProfile = vi.fn();
const mockGetFirebaseWebConfigDiagnostics = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getFirebaseAdminAuth: mockGetFirebaseAdminAuth,
  getFirebaseAdminDiagnostics: mockGetFirebaseAdminDiagnostics,
}));

vi.mock("@/lib/auth", () => ({
  getActorAccessByFirebaseUid: mockGetActorAccessByFirebaseUid,
  getActorAccessByPhone: mockGetActorAccessByPhone,
  toSessionProfile: mockToSessionProfile,
}));

vi.mock("@/lib/env", () => ({
  env: {
    FIREBASE_WEB_API_KEY: "test-api-key",
  },
  getFirebaseWebConfigDiagnostics: mockGetFirebaseWebConfigDiagnostics,
}));

describe("app/api/auth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCheckRateLimit.mockReset();
    mockGetFirebaseAdminAuth.mockReset();
    mockGetFirebaseAdminDiagnostics.mockReset();
    mockGetActorAccessByFirebaseUid.mockReset();
    mockGetActorAccessByPhone.mockReset();
    mockToSessionProfile.mockReset();
    mockGetFirebaseWebConfigDiagnostics.mockReset();
  });

  it("rejects requests that exceed the login rate limit", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: false,
      retryAfterMs: 5_000,
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      createJsonRequest("/api/auth/login", {
        email: "owner@example.com",
        password: "password123",
      })
    );
    const payload = await readJson<{ success: boolean; message: string }>(
      response
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(payload).toEqual({
      success: false,
      message: "Too many login attempts. Please try again later.",
    });
  });

  it("surfaces a configuration error when Firebase admin is unavailable", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
    mockGetFirebaseAdminAuth.mockReturnValue(null);
    mockGetFirebaseAdminDiagnostics.mockReturnValue({
      source: "env",
      usingApplicationDefault: false,
      error: "missing-key",
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      createJsonRequest("/api/auth/login", {
        idToken: "x".repeat(24),
      })
    );
    const payload = await readJson<{
      success: boolean;
      message: string;
      details: Record<string, unknown>;
    }>(response);

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Firebase admin is not configured correctly.");
    expect(payload.details).toMatchObject({
      source: "env",
      usingApplicationDefault: false,
      error: "missing-key",
    });
  });

  it("returns a session payload when an id token resolves to a provisioned actor", async () => {
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      retryAfterMs: 0,
    });
    mockGetFirebaseAdminAuth.mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "firebase-uid-1" }),
    });

    const accessRow = {
      actor_type: "owner",
      actor_id: "owner-1",
      owner_id: "owner-1",
      staff_user_id: null,
      firebase_uid: "firebase-uid-1",
      organization_id: "22222222-2222-4222-8222-222222222222",
      organization_name: "GymFlow HQ",
      branch_id: "11111111-1111-4111-8111-111111111111",
      branch_name: "Main Branch",
      role: "owner",
      name: "Owner One",
      email: "owner@example.com",
      phone: "+201111111111",
    };

    mockGetActorAccessByFirebaseUid.mockResolvedValue(accessRow);
    mockToSessionProfile.mockReturnValue({
      id: "owner-1",
      actorType: "owner",
      role: "owner",
      name: "Owner One",
      email: "owner@example.com",
      phone: "+201111111111",
      organizationId: accessRow.organization_id,
      organizationName: accessRow.organization_name,
      branchId: accessRow.branch_id,
      branchName: accessRow.branch_name,
    });

    const { POST } = await import("@/app/api/auth/login/route");
    const response = await POST(
      createJsonRequest(
        "/api/auth/login",
        { idToken: "x".repeat(24) },
        {
          headers: {
            "x-branch-id": accessRow.branch_id,
          },
        }
      )
    );
    const payload = await readJson<{
      success: boolean;
      data: {
        message: string;
        session: {
          branchId: string;
          organizationId: string;
          ownerId: string;
        };
      };
    }>(response);

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.message).toBe("Login successful");
    expect(payload.data.session).toMatchObject({
      branchId: accessRow.branch_id,
      organizationId: accessRow.organization_id,
      ownerId: accessRow.owner_id,
    });
  });
});
