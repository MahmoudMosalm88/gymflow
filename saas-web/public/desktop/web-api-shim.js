(function () {
  const SESSION_TOKEN_KEY = "session_token";
  const BRANCH_ID_KEY = "branch_id";
  const OWNER_PROFILE_KEY = "owner_profile";
  const GUEST_PASSES_KEY_PREFIX = "guestpasses:";

  const listeners = {
    qr: new Set(),
    status: new Set(),
    updates: new Set()
  };

  const nowUnix = () => Math.floor(Date.now() / 1000);

  function daysInMonthUtc(year, monthIndex) {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  }

  function addCalendarMonths(epoch, months) {
    const base = new Date(epoch * 1000);
    const anchorDay = base.getUTCDate();
    const totalMonths = base.getUTCMonth() + months;
    const targetYear = base.getUTCFullYear() + Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const day = Math.min(anchorDay, daysInMonthUtc(targetYear, targetMonth));

    return Math.floor(
      Date.UTC(
        targetYear,
        targetMonth,
        day,
        base.getUTCHours(),
        base.getUTCMinutes(),
        base.getUTCSeconds()
      ) / 1000
    );
  }

  function getMonthlyCycleWindow(subscriptionStart, subscriptionEnd, reference) {
    const start = Math.floor(subscriptionStart);
    const end = Math.max(Math.floor(subscriptionEnd), start + 1);
    const ref = Math.max(Math.floor(reference), start);

    let cycleIndex = 0;
    let cycleStart = start;
    let cycleEnd = Math.min(addCalendarMonths(start, cycleIndex + 1), end);

    while (cycleEnd <= ref && cycleEnd < end) {
      cycleIndex += 1;
      cycleStart = addCalendarMonths(start, cycleIndex);
      cycleEnd = Math.min(addCalendarMonths(start, cycleIndex + 1), end);
    }

    if (cycleEnd <= cycleStart) {
      cycleEnd = Math.min(cycleStart + 86400, end);
    }

    return { cycleStart, cycleEnd };
  }

  function toUnix(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
    }
    if (value instanceof Date) return Math.floor(value.getTime() / 1000);
    if (typeof value === "string") {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
      }
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
    }
    return 0;
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getToken() {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function getBranchId() {
    try {
      return localStorage.getItem(BRANCH_ID_KEY) || "";
    } catch {
      return "";
    }
  }

  function getGuestPassStoreKey() {
    const branch = getBranchId() || "default";
    return `${GUEST_PASSES_KEY_PREFIX}${branch}`;
  }

  function normalizeTier(value) {
    return value === "A" || value === "B" ? value : "A";
  }

  function normalizeMember(row) {
    const member = isPlainObject(row) ? row : {};
    return {
      id: String(member.id || ""),
      name: String(member.name || ""),
      phone: String(member.phone || ""),
      gender: member.gender === "female" ? "female" : "male",
      photo_path: typeof member.photo_path === "string" ? member.photo_path : null,
      access_tier: normalizeTier(member.access_tier),
      card_code: typeof member.card_code === "string" ? member.card_code : null,
      address: typeof member.address === "string" ? member.address : null,
      created_at: toUnix(member.created_at),
      updated_at: toUnix(member.updated_at)
    };
  }

  function normalizeSubscription(row) {
    const subscription = isPlainObject(row) ? row : {};
    return {
      id: Number(subscription.id || 0),
      member_id: String(subscription.member_id || ""),
      start_date: toUnix(subscription.start_date),
      end_date: toUnix(subscription.end_date),
      plan_months: Number(subscription.plan_months || 1),
      price_paid:
        subscription.price_paid === null || subscription.price_paid === undefined
          ? null
          : Number(subscription.price_paid),
      sessions_per_month:
        subscription.sessions_per_month === null || subscription.sessions_per_month === undefined
          ? null
          : Number(subscription.sessions_per_month),
      is_active: subscription.is_active ? 1 : 0,
      created_at: toUnix(subscription.created_at)
    };
  }

  function normalizeLog(row) {
    const log = isPlainObject(row) ? row : {};
    return {
      timestamp: toUnix(log.timestamp),
      status: String(log.status || ""),
      reason_code: String(log.reason_code || ""),
      scanned_value: String(log.scanned_value || ""),
      member_id: log.member_id ? String(log.member_id) : null
    };
  }

  function unwrapResponse(payload) {
    if (isPlainObject(payload) && "data" in payload) {
      return payload.data;
    }
    return payload;
  }

  function errorMessage(payload, fallback) {
    if (isPlainObject(payload) && typeof payload.message === "string" && payload.message) {
      return payload.message;
    }
    return fallback;
  }

  async function request(path, init) {
    const options = init || {};
    const headers = new Headers(options.headers || {});
    const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;

    if (options.body && !isFormDataBody && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (!headers.has("authorization")) {
      const token = getToken();
      if (token) headers.set("authorization", `Bearer ${token}`);
    }

    if (!headers.has("x-branch-id")) {
      const branchId = getBranchId();
      if (branchId) headers.set("x-branch-id", branchId);
    }

    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(errorMessage(payload, `Request failed (${response.status})`));
    }

    return unwrapResponse(payload);
  }

  function pickRestoreDbFile() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".db,application/x-sqlite3,application/vnd.sqlite3";
      input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
      input.click();
    });
  }

  function createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  }

  function listGuestPassesInternal() {
    const raw = readJson(getGuestPassStoreKey(), []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => isPlainObject(item))
      .map((item) => ({
        id: String(item.id || createId()),
        code: String(item.code || ""),
        name: String(item.name || ""),
        phone: typeof item.phone === "string" ? item.phone : null,
        price_paid:
          item.price_paid === null || item.price_paid === undefined ? null : Number(item.price_paid),
        created_at: toUnix(item.created_at) || nowUnix(),
        expires_at: toUnix(item.expires_at) || nowUnix(),
        used_at:
          item.used_at === null || item.used_at === undefined ? null : toUnix(item.used_at)
      }))
      .sort((a, b) => b.created_at - a.created_at);
  }

  function saveGuestPasses(list) {
    writeJson(getGuestPassStoreKey(), list);
  }

  function generateGuestCode() {
    const all = listGuestPassesInternal();
    const max = all.reduce((acc, item) => {
      const numeric = Number(item.code);
      if (!Number.isFinite(numeric)) return acc;
      return Math.max(acc, numeric);
    }, 0);
    const next = max + 1;
    return String(next).padStart(5, "0");
  }

  function emitStatus(status) {
    listeners.status.forEach((callback) => {
      try {
        callback(status);
      } catch {
        // ignore listener errors
      }
    });
  }

  async function getWhatsappStatusNormalized() {
    try {
      const data = await request("/api/whatsapp/status");
      const state = isPlainObject(data) && typeof data.state === "string" ? data.state : "disconnected";
      const authenticated = state === "authenticated" || state === "connected" || state === "ready";
      return {
        connected: authenticated,
        authenticated,
        qrCode: null,
        error: null
      };
    } catch {
      return {
        connected: false,
        authenticated: false,
        qrCode: null,
        error: null
      };
    }
  }

  async function getMembers() {
    const data = await request("/api/members");
    return Array.isArray(data) ? data.map(normalizeMember) : [];
  }

  async function getSubscriptions(memberId) {
    const query = memberId ? `?member_id=${encodeURIComponent(memberId)}` : "";
    const data = await request(`/api/subscriptions${query}`);
    return Array.isArray(data) ? data.map(normalizeSubscription) : [];
  }

  async function getLogs() {
    const data = await request("/api/reports/attendance");
    return Array.isArray(data) ? data.map(normalizeLog) : [];
  }

  function todayKey(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function calcTodayStats() {
    const logs = await getLogs();
    const key = todayKey(nowUnix());

    let allowed = 0;
    let warning = 0;
    let denied = 0;

    logs.forEach((log) => {
      if (todayKey(log.timestamp) !== key) return;

      if (log.status === "success") {
        allowed += 1;
        return;
      }

      if (log.reason_code === "already_checked_in_today") {
        warning += 1;
        return;
      }

      denied += 1;
    });

    return { allowed, warning, denied };
  }

  async function calcQuotaForMember(memberId) {
    const [member, subscriptions, logs] = await Promise.all([
      api.members.getById(memberId),
      api.subscriptions.getByMemberId(memberId),
      getLogs()
    ]);

    if (!member) return null;

    const active = (subscriptions || []).find((item) => item.is_active);
    if (!active) return null;

    const now = nowUnix();
    const { cycleStart, cycleEnd } = getMonthlyCycleWindow(
      active.start_date,
      active.end_date,
      now
    );

    const defaultCap = member.gender === "female" ? 30 : 26;
    const cap = Number(active.sessions_per_month || defaultCap);

    const sessionsUsed = logs.filter((log) => {
      return (
        log.status === "success" &&
        log.member_id === memberId &&
        log.timestamp >= cycleStart &&
        log.timestamp < cycleEnd
      );
    }).length;

    return {
      sessions_used: sessionsUsed,
      sessions_cap: cap,
      cycle_start: cycleStart,
      cycle_end: cycleEnd
    };
  }

  const api = {
    members: {
      getAll: async () => getMembers(),
      getById: async (id) => {
        const memberId = String(id || "");
        if (!memberId) return null;

        const bySearch = await request(`/api/members?q=${encodeURIComponent(memberId)}`).catch(() => []);
        if (Array.isArray(bySearch)) {
          const exact = bySearch.map(normalizeMember).find((row) => row.id === memberId);
          if (exact) return exact;
        }

        const all = await getMembers();
        return all.find((row) => row.id === memberId) || null;
      },
      getNextSerial: async () => {
        const members = await getMembers();
        const max = members.reduce((acc, member) => {
          const value = Number(member.card_code || 0);
          if (!Number.isFinite(value)) return acc;
          return Math.max(acc, value);
        }, 0);
        return String(max + 1).padStart(5, "0");
      },
      create: async (data) => {
        const payload = isPlainObject(data) ? data : {};
        const created = await request("/api/members", {
          method: "POST",
          body: JSON.stringify({
            id: payload.id || undefined,
            name: String(payload.name || ""),
            phone: String(payload.phone || ""),
            gender: payload.gender === "female" ? "female" : "male",
            access_tier: normalizeTier(payload.access_tier),
            photo_path: payload.photo_path || null,
            card_code: payload.card_code || null,
            address: payload.address || null
          })
        });
        return normalizeMember(created);
      },
      update: async (id, data) => {
        const payload = isPlainObject(data) ? data : {};
        const updated = await request(`/api/members/${encodeURIComponent(String(id || ""))}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: payload.name,
            phone: payload.phone,
            gender: payload.gender,
            access_tier:
              payload.access_tier === undefined ? undefined : normalizeTier(payload.access_tier),
            photo_path: payload.photo_path,
            card_code: payload.card_code,
            address: payload.address
          })
        });
        return normalizeMember(updated);
      },
      delete: async (id) => {
        return request(`/api/members/${encodeURIComponent(String(id || ""))}`, {
          method: "DELETE"
        });
      },
      search: async (query) => {
        const q = String(query || "").trim();
        if (!q) return getMembers();
        const data = await request(`/api/members?q=${encodeURIComponent(q)}`);
        return Array.isArray(data) ? data.map(normalizeMember) : [];
      }
    },

    cards: {
      getNextPreview: async () => {
        try {
          const next = await api.members.getNextSerial();
          return { success: true, next };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      generateBatch: async () => {
        return {
          success: false,
          error: "Pre-printed card batch generation is not available in web mode yet."
        };
      }
    },

    owner: {
      getStatus: async (token) => {
        const authToken = typeof token === "string" && token ? token : getToken();
        if (!authToken) {
          return { hasOwner: true, onboardingComplete: true, authenticated: false };
        }

        try {
          await request("/api/reports/overview", {
            headers: {
              authorization: `Bearer ${authToken}`,
              "x-branch-id": getBranchId()
            }
          });
          return { hasOwner: true, onboardingComplete: true, authenticated: true };
        } catch {
          return { hasOwner: true, onboardingComplete: true, authenticated: false };
        }
      },
      register: async () => ({ success: false, error: "Use the web Create Account screen." }),
      registerWithName: async () => ({ success: false, error: "Use the web Create Account screen." }),
      verifyOtp: async () => ({ success: false, error: "OTP flow is not used in web mode." }),
      login: async () => ({ success: false, error: "Use the web Login screen." }),
      logout: async () => {
        try {
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(BRANCH_ID_KEY);
          localStorage.removeItem(OWNER_PROFILE_KEY);
        } catch {
          // ignore
        }
        return { success: true };
      },
      requestPasswordReset: async () => ({ success: false, error: "Use Forgot Password on the login page." }),
      resetPassword: async () => ({ success: false, error: "Use Forgot Password on the login page." }),
      completeOnboarding: async () => ({ success: true }),
      changePassword: async () => ({ success: false, error: "Password change from this screen is not available yet." })
    },

    secureStore: {
      get: async (key) => {
        const storageKey = String(key || "");
        try {
          const value = localStorage.getItem(storageKey);
          return { success: true, value };
        } catch {
          return { success: false, value: null };
        }
      },
      set: async (key, value) => {
        try {
          localStorage.setItem(String(key || ""), String(value || ""));
          return { success: true };
        } catch {
          return { success: false };
        }
      },
      delete: async (key) => {
        try {
          localStorage.removeItem(String(key || ""));
          return { success: true };
        } catch {
          return { success: false };
        }
      }
    },

    subscriptions: {
      getByMemberId: async (memberId) => getSubscriptions(String(memberId || "")),
      create: async (data) => {
        const payload = isPlainObject(data) ? data : {};
        const planMonths = Number(payload.plan_months || 1);
        const startDate = toUnix(payload.start_date) || nowUnix();
        const endDate = toUnix(payload.end_date) || addCalendarMonths(startDate, planMonths);

        const created = await request("/api/subscriptions", {
          method: "POST",
          body: JSON.stringify({
            member_id: String(payload.member_id || ""),
            start_date: startDate,
            end_date: endDate,
            plan_months: planMonths,
            price_paid:
              payload.price_paid === undefined || payload.price_paid === null
                ? null
                : Number(payload.price_paid),
            sessions_per_month:
              payload.sessions_per_month === undefined || payload.sessions_per_month === null
                ? null
                : Number(payload.sessions_per_month)
          })
        });

        return normalizeSubscription(created);
      },
      renew: async (memberId, data) => {
        const payload = isPlainObject(data) ? data : {};
        return api.subscriptions.create({
          member_id: String(memberId || ""),
          plan_months: Number(payload.plan_months || 1),
          price_paid:
            payload.price_paid === undefined || payload.price_paid === null
              ? null
              : Number(payload.price_paid),
          sessions_per_month:
            payload.sessions_per_month === undefined || payload.sessions_per_month === null
              ? null
              : Number(payload.sessions_per_month)
        });
      },
      cancel: async (id) => {
        const data = await request("/api/subscriptions", {
          method: "PATCH",
          body: JSON.stringify({ id: Number(id), is_active: false })
        });
        return normalizeSubscription(data);
      },
      updatePricePaid: async (id, pricePaid) => {
        const data = await request("/api/subscriptions", {
          method: "PATCH",
          body: JSON.stringify({ id: Number(id), price_paid: Number(pricePaid) })
        });
        return normalizeSubscription(data);
      },
      freeze: async () => ({ success: false, error: "Subscription freeze is not available yet." }),
      getFreezes: async () => []
    },

    attendance: {
      check: async (scannedValue, method) => {
        const value = String(scannedValue || "").trim();
        const now = nowUnix();

        const passes = listGuestPassesInternal();
        const guestPass = passes.find((item) => item.code === value);
        if (guestPass) {
          if (guestPass.used_at) {
            return {
              status: "denied",
              reasonCode: "guest_used",
              guestPass
            };
          }
          if (guestPass.expires_at <= now) {
            return {
              status: "denied",
              reasonCode: "guest_expired",
              guestPass
            };
          }

          guestPass.used_at = now;
          saveGuestPasses(passes);

          return {
            status: "allowed",
            guestPass
          };
        }

        const result = await request("/api/attendance/check", {
          method: "POST",
          body: JSON.stringify({
            scannedValue: value,
            method: method === "manual" ? "manual" : "scan"
          })
        });

        if (!result || typeof result !== "object") {
          return { status: "denied", reasonCode: "unknown_error" };
        }

        if (result.success) {
          return {
            status: "allowed",
            member: result.member ? normalizeMember(result.member) : undefined,
            quota:
              typeof result.sessionsRemaining === "number"
                ? { sessions_used: 0, sessions_cap: result.sessionsRemaining }
                : undefined
          };
        }

        const reason = typeof result.reason === "string" ? result.reason : "unknown_reason";

        if (reason === "cooldown") {
          return { status: "ignored", reasonCode: reason };
        }

        if (reason === "already_checked_in_today") {
          return { status: "warning", reasonCode: reason };
        }

        return { status: "denied", reasonCode: reason };
      },
      getTodayLogs: async () => {
        const logs = await getLogs();
        const key = todayKey(nowUnix());
        return logs.filter((log) => todayKey(log.timestamp) === key);
      },
      getLogsByMember: async (memberId) => {
        const logs = await getLogs();
        return logs.filter((log) => log.member_id === String(memberId || ""));
      },
      getTodayStats: async () => calcTodayStats()
    },

    quotas: {
      getCurrentByMember: async (memberId) => calcQuotaForMember(String(memberId || "")),
      getHistory: async () => []
    },

    guestpasses: {
      create: async (data) => {
        const payload = isPlainObject(data) ? data : {};
        const now = nowUnix();
        const validityDays = Math.min(7, Math.max(1, Number(payload.validity_days || 1)));
        const pass = {
          id: createId(),
          code: generateGuestCode(),
          name: String(payload.name || "").trim(),
          phone: payload.phone ? String(payload.phone) : null,
          price_paid:
            payload.price_paid === undefined || payload.price_paid === null
              ? null
              : Number(payload.price_paid),
          created_at: now,
          expires_at: now + validityDays * 86400,
          used_at: null
        };

        const passes = listGuestPassesInternal();
        passes.unshift(pass);
        saveGuestPasses(passes);

        return pass;
      },
      list: async (limit) => {
        const passes = listGuestPassesInternal();
        if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
          return passes.slice(0, limit);
        }
        return passes;
      },
      getByCode: async (code) => {
        const passes = listGuestPassesInternal();
        return passes.find((item) => item.code === String(code || "")) || null;
      },
      markUsed: async (code) => {
        const value = String(code || "");
        const now = nowUnix();
        const passes = listGuestPassesInternal();
        const target = passes.find((item) => item.code === value);
        if (!target) return { success: false, error: "Guest pass not found" };
        target.used_at = now;
        saveGuestPasses(passes);
        return { success: true };
      }
    },

    settings: {
      get: async (key) => {
        const data = await request("/api/settings").catch(() => ({}));
        if (isPlainObject(data) && key in data) {
          return data[key];
        }

        if (key === "profile_phone") {
          const owner = readJson(OWNER_PROFILE_KEY, null);
          if (isPlainObject(owner) && typeof owner.phone === "string") {
            return owner.phone;
          }
        }

        return null;
      },
      getAll: async () => {
        const data = await request("/api/settings").catch(() => ({}));
        return isPlainObject(data) ? data : {};
      },
      set: async (key, value) => {
        await request("/api/settings", {
          method: "PUT",
          body: JSON.stringify({ values: { [String(key || "")]: value } })
        });
        return { success: true };
      },
      setAll: async (settings) => {
        await request("/api/settings", {
          method: "PUT",
          body: JSON.stringify({ values: isPlainObject(settings) ? settings : {} })
        });
        return { success: true };
      },
      resetDefaults: async () => ({ success: true })
    },

    whatsapp: {
      getStatus: async () => getWhatsappStatusNormalized(),
      connect: async () => {
        await request("/api/whatsapp/connect", { method: "POST" });
        const status = await getWhatsappStatusNormalized();
        emitStatus(status);
        return status;
      },
      disconnect: async () => {
        await request("/api/whatsapp/disconnect", { method: "POST" });
        const status = await getWhatsappStatusNormalized();
        emitStatus(status);
        return status;
      },
      sendMessage: async (memberId, type) => {
        return request("/api/whatsapp/send", {
          method: "POST",
          body: JSON.stringify({ memberId, type: type || "manual", payload: {} })
        });
      },
      sendQRCode: async (memberId, memberName, qrDataUrl, code) => {
        return request("/api/whatsapp/send", {
          method: "POST",
          body: JSON.stringify({
            memberId,
            type: "qrcode",
            payload: {
              memberName,
              qrDataUrl,
              code
            }
          })
        });
      },
      sendImmediate: async (memberId) => {
        return request("/api/whatsapp/send", {
          method: "POST",
          body: JSON.stringify({ memberId, type: "immediate", payload: {} })
        });
      },
      getQueueStatus: async () => ({ pending: 0, sent: 0, failed: 0 }),
      getQueueMessages: async () => [],
      requeueFailed: async () => ({ success: true }),
      onQRCode: (callback) => {
        listeners.qr.add(callback);
        return () => listeners.qr.delete(callback);
      },
      onStatusChange: (callback) => {
        listeners.status.add(callback);
        return () => listeners.status.delete(callback);
      }
    },

    import: {
      selectFile: async () => ({
        success: false,
        error: "Excel import is not available in web mode yet."
      }),
      parseExcel: async () => ({ valid: [], invalid: [], error: "Import parser unavailable in web mode." }),
      execute: async () => ({ success: 0, failed: 0, errors: [{ row: 0, error: "Import unavailable" }] }),
      getTemplate: async () => ({ success: false }),
      downloadTemplate: async () => ({ success: false, error: "Template download unavailable in web mode." })
    },

    app: {
      openDataFolder: async () => ({ success: false, error: "Not supported on web" }),
      showItemInFolder: async () => ({ success: false, error: "Not supported on web" }),
      openExternal: async (url) => {
        if (typeof url === "string" && url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return { success: true };
      },
      backup: async () => {
        try {
          const result = await request("/api/backup/export", { method: "POST" });
          return { success: true, ...result };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      restore: async () => {
        try {
          const file = await pickRestoreDbFile();
          if (!file) {
            return { success: false, error: "Restore canceled" };
          }

          const headers = new Headers();
          const token = getToken();
          const branchId = getBranchId();
          if (token) headers.set("authorization", `Bearer ${token}`);
          if (branchId) headers.set("x-branch-id", branchId);

          const body = new FormData();
          body.append("file", file, file.name);

          const response = await fetch("/api/backup/restore-db", {
            method: "POST",
            headers,
            body
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            return { success: false, error: errorMessage(payload, `Request failed (${response.status})`) };
          }

          return { success: true, ...unwrapResponse(payload) };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
      getVersion: async () => "web-saas",
      logError: async (payload) => {
        console.error("GymFlow renderer error", payload);
        return { success: true };
      },
      checkForUpdates: async () => ({ success: false }),
      downloadUpdate: async () => ({ success: false }),
      onUpdateAvailable: (callback) => {
        listeners.updates.add(callback);
        return () => listeners.updates.delete(callback);
      }
    },

    qrcode: {
      generate: async (memberId) => {
        const value = String(memberId || "");
        const endpoint = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
          value
        )}`;

        try {
          const response = await fetch(endpoint);
          if (!response.ok) {
            throw new Error("QR request failed");
          }

          const blob = await response.blob();
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          return {
            success: true,
            dataUrl,
            code: value
          };
        } catch (error) {
          return {
            success: false,
            error: String(error)
          };
        }
      }
    },

    photos: {
      save: async (dataUrl) => {
        if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
          return { success: true, path: dataUrl };
        }
        return { success: false, error: "Unsupported photo payload" };
      }
    },

    reports: {
      getDailyStats: async (days) => {
        const range = Math.max(1, Number(days || 30));
        const rows = await request(`/api/reports/daily-stats?days=${encodeURIComponent(range)}`);
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          date: String(row.date || ""),
          allowed: Number(row.allowed || 0),
          warning: Number(row.warning || 0),
          denied: Number(row.denied || 0)
        }));
      },

      getHourlyDistribution: async () => {
        const rows = await request("/api/reports/hourly-distribution");
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          hour: Number(row.hour || 0),
          count: Number(row.count || 0)
        }));
      },

      getTopMembers: async (days, limit) => {
        const range = Math.max(1, Number(days || 30));
        const cap = Math.max(1, Number(limit || 10));
        const rows = await request(
          `/api/reports/top-members?days=${encodeURIComponent(range)}&limit=${encodeURIComponent(cap)}`
        );
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          member_id: String(row.member_id || ""),
          name: String(row.name || "Unknown"),
          visits: Number(row.visits || 0)
        }));
      },

      getDenialReasons: async (days) => {
        const range = Math.max(1, Number(days || 30));
        const rows = await request(`/api/reports/denial-reasons?days=${encodeURIComponent(range)}`);
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          reason_code: String(row.reason_code || "unknown"),
          count: Number(row.count || 0)
        }));
      },

      getOverview: async () => {
        const overview = await request("/api/reports/overview");
        const totalMembers = Number((overview && overview.totalMembers) || 0);
        const activeSubscriptions = Number((overview && overview.activeSubscriptions) || 0);
        const totalRevenue = Number((overview && overview.totalRevenue) || 0);
        const todayStats = {
          allowed: Number(overview?.todayStats?.allowed || 0),
          warning: Number(overview?.todayStats?.warning || 0),
          denied: Number(overview?.todayStats?.denied || 0)
        };

        return {
          totalMembers,
          memberCount: totalMembers,
          activeSubscriptions,
          expiredSubscriptions: Number((overview && overview.expiredSubscriptions) || 0),
          totalRevenue,
          todayStats,
          queueStats: {
            pending: 0,
            sent: 0,
            failed: 0
          }
        };
      },

      getExpiringSubscriptions: async (days) => {
        const windowDays = Math.max(1, Number(days || 7));
        const rows = await request(
          `/api/reports/expiring-subscriptions?days=${encodeURIComponent(windowDays)}`
        );
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          id: Number(row.id || 0),
          member_id: String(row.member_id || ""),
          end_date: Number(row.end_date || 0),
          name: String(row.name || "Unknown"),
          phone: String(row.phone || "")
        }));
      },

      getLowSessionMembers: async (threshold) => {
        const limit = Math.max(0, Number(threshold || 3));
        const rows = await request(
          `/api/reports/low-sessions?threshold=${encodeURIComponent(limit)}&limit=200`
        );
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          member_id: String(row.member_id || ""),
          name: String(row.name || "Unknown"),
          phone: String(row.phone || ""),
          sessions_remaining: Number(row.sessions_remaining || 0)
        }));
      },

      getDeniedEntries: async (days, limit) => {
        const range = Math.max(1, Number(days || 30));
        const cap = Math.max(1, Number(limit || 100));
        const rows = await request(
          `/api/reports/denied-entries?days=${encodeURIComponent(range)}&limit=${encodeURIComponent(cap)}`
        );
        if (!Array.isArray(rows)) return [];
        return rows.map((row) => ({
          name: String(row.name || "Unknown"),
          timestamp: Number(row.timestamp || 0),
          reason_code: String(row.reason_code || "unknown")
        }));
      }
    },

    income: {
      getSummary: async () => {
        const [subscriptions, guestPasses] = await Promise.all([
          getSubscriptions(),
          api.guestpasses.list(1000)
        ]);

        const totalSubscriptions = subscriptions.reduce((sum, item) => {
          return sum + (item.price_paid || 0);
        }, 0);

        const totalGuestPasses = guestPasses.reduce((sum, item) => {
          return sum + (item.price_paid || 0);
        }, 0);

        const expectedMonthly = subscriptions
          .filter((item) => item.is_active)
          .reduce((sum, item) => {
            const paid = item.price_paid || 0;
            const months = Math.max(1, Number(item.plan_months || 1));
            return sum + paid / months;
          }, 0);

        return {
          totalRevenue: totalSubscriptions + totalGuestPasses,
          expectedMonthly
        };
      },

      getRecent: async (limit) => {
        const cap = Math.max(1, Number(limit || 20));
        const [members, subscriptions, guestPasses] = await Promise.all([
          getMembers(),
          getSubscriptions(),
          api.guestpasses.list(cap)
        ]);

        const memberById = new Map(members.map((member) => [member.id, member]));

        const subEntries = subscriptions
          .filter((item) => item.price_paid !== null && item.price_paid !== undefined)
          .map((item) => {
            const member = memberById.get(item.member_id);
            return {
              type: "subscription",
              name: member ? member.name : "Unknown",
              phone: member ? member.phone : null,
              amount: Number(item.price_paid || 0),
              created_at: item.created_at || item.start_date,
              plan_months: item.plan_months,
              sessions_per_month: item.sessions_per_month
            };
          });

        const guestEntries = guestPasses
          .filter((item) => item.price_paid !== null && item.price_paid !== undefined)
          .map((item) => ({
            type: "guest_pass",
            name: item.name,
            phone: item.phone,
            amount: Number(item.price_paid || 0),
            created_at: item.created_at,
            code: item.code
          }));

        return [...subEntries, ...guestEntries]
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, cap);
      }
    }
  };

  window.api = api;
})();
