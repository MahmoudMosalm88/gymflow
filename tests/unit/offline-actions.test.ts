const mockApiPost = vi.fn();
const mockFetchAndStoreBundle = vi.fn();
const mockQueueMemberCreate = vi.fn();
const mockQueueMemberUpdate = vi.fn();
const mockQueueSubscriptionCreate = vi.fn();
const mockQueueSubscriptionFreeze = vi.fn();
const mockQueueSubscriptionRenew = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    post: mockApiPost,
  },
}));

vi.mock("@/lib/offline/offline-bundle", () => ({
  fetchAndStoreBundle: mockFetchAndStoreBundle,
}));

vi.mock("@/lib/offline/operations", () => ({
  queueMemberCreate: mockQueueMemberCreate,
  queueMemberUpdate: mockQueueMemberUpdate,
  queueSubscriptionCreate: mockQueueSubscriptionCreate,
  queueSubscriptionFreeze: mockQueueSubscriptionFreeze,
  queueSubscriptionRenew: mockQueueSubscriptionRenew,
}));

describe("offline actions", () => {
  beforeEach(() => {
    vi.resetModules();
    mockApiPost.mockReset();
    mockFetchAndStoreBundle.mockReset();
    mockQueueMemberCreate.mockReset();
    mockQueueMemberUpdate.mockReset();
    mockQueueSubscriptionCreate.mockReset();
    mockQueueSubscriptionFreeze.mockReset();
    mockQueueSubscriptionRenew.mockReset();

    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      configurable: true,
    });
    mockApiPost.mockResolvedValue({ success: true, data: { id: 99 } });
    mockFetchAndStoreBundle.mockResolvedValue(true);
  });

  it("does not send the offline subscription conflict guard for online creates", async () => {
    const { saveSubscriptionCreate } = await import("@/lib/offline/actions");

    await saveSubscriptionCreate({
      memberId: "33333333-3333-4333-8333-333333333333",
      memberName: "Test Member",
      startDate: 1777723200,
      planTemplateId: null,
      planMonths: 1,
      pricePaid: 250,
      paymentMethod: "cash",
      sessionsPerMonth: null,
      expectedActiveSubscriptionId: 42,
    });

    const postedBody = mockApiPost.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(mockApiPost).toHaveBeenCalledWith("/api/subscriptions", expect.any(Object));
    expect("expected_active_subscription_id" in postedBody).toBe(false);
    expect(mockQueueSubscriptionCreate).not.toHaveBeenCalled();
  });
});
