import {
  getAllAttendanceLogs,
  getAllFreezes,
  getAllMembers,
  getAllPayments,
  getAllSubscriptions,
  getMember,
  getOfflineAgeSeconds,
  getSettingsMap,
  toIsoString,
} from "./cache";
import type {
  OfflineAttendanceLog,
  OfflineMember,
  OfflinePayment,
  OfflineSubscription,
} from "./db";
import { getCurrentSubscriptionAccessReferenceUnix, toSubscriptionAccessReferenceUnix } from "@/lib/subscription-dates";
import { getMonthlyCycleWindow } from "@/lib/billing-cycle";
import { getCairoDayStartUnix, getCairoHour } from "@/lib/cairo-time";

export type OfflineMemberListItem = Pick<OfflineMember, "id" | "name" | "phone" | "gender" | "card_code" | "created_at" | "sync_status" | "last_error"> & {
  sub_status: "active" | "expired" | "no_sub";
};

export type OfflineDashboardOverview = {
  totalMembers: number;
  activeSubscriptions: number;
  todayCheckIns: number;
  totalRevenue: number;
  todayStats: {
    allowed: number;
    warning: number;
    denied: number;
  };
};

export type OfflineActivityEntry = {
  id: string;
  timestamp: number;
  result: string;
  reason_code: string | null;
  scanned_value: string;
  member_name: string | null;
  sync_status?: string;
};

export type OfflinePaymentView = {
  id: string | number;
  date: string;
  type: string;
  paymentMethod: "cash" | "digital" | "unknown";
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
  sync_status?: string;
};

export type OfflineMemberPaymentRow = {
  id: string | number;
  amount: string;
  type: string;
  note: string | null;
  created_at: string;
  subscription_id: number | null;
  guest_pass_id: string | null;
  payment_method: "cash" | "digital" | null;
  plan_months: number | null;
  sessions_per_month: number | null;
  sync_status?: string;
};

function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

function startOfTodayUnix() {
  return getCairoDayStartUnix();
}

export function deriveSubscriptionStatus(sub: Pick<OfflineSubscription, "is_active" | "start_date" | "end_date">): "active" | "pending" | "expired" | "inactive" {
  const accessReference = getCurrentSubscriptionAccessReferenceUnix();
  if (!sub.is_active) return "inactive";
  if (sub.end_date <= accessReference) return "expired";
  if (sub.start_date > accessReference) return "pending";
  return "active";
}

function getDisplayStatus(sub: OfflineSubscription) {
  const status = deriveSubscriptionStatus(sub);
  return status === "inactive" ? "expired" : status;
}

function rankSubscriptions(now: number) {
  const accessReference = toSubscriptionAccessReferenceUnix(now);
  return (a: OfflineSubscription, b: OfflineSubscription) => {
    const rank = (subscription: OfflineSubscription) => {
      if (subscription.is_active && subscription.start_date <= accessReference && subscription.end_date > accessReference) return 0;
      if (subscription.is_active && subscription.start_date > accessReference) return 1;
      if (subscription.is_active) return 2;
      return 3;
    };
    return rank(a) - rank(b) || b.start_date - a.start_date || b.end_date - a.end_date || b.created_at - a.created_at;
  };
}

function getTopSubscriptionForMember(memberId: string, subscriptions: OfflineSubscription[]) {
  const now = nowUnix();
  return subscriptions
    .filter((item) => item.member_id === memberId)
    .sort(rankSubscriptions(now))[0] || null;
}

function deriveOfflineSessionsRemaining(
  subscription: OfflineSubscription,
  member: OfflineMember,
  accessReference: number
): number | null {
  if (subscription.sessions_per_month == null) return null;

  if (
    !member.subscription
    || member.subscription.id !== subscription.id
    || !member.subscription.is_active
    || subscription.start_date > accessReference
    || subscription.end_date <= accessReference
  ) {
    return null;
  }

  if (!member.quota) return null;

  const { cycleStart, cycleEnd } = getMonthlyCycleWindow({
    subscriptionStart: subscription.start_date,
    subscriptionEnd: subscription.end_date,
    reference: accessReference,
  });

  if (member.quota.cycle_start !== cycleStart || member.quota.cycle_end !== cycleEnd) {
    return null;
  }

  return Math.max(0, member.quota.sessions_cap - member.quota.sessions_used);
}

function buildMemberMap(members: OfflineMember[]) {
  return new Map(members.map((member) => [member.id, member]));
}

function buildIncomeEvents(subscriptions: OfflineSubscription[], payments: OfflinePayment[], members: OfflineMember[]) {
  const memberMap = buildMemberMap(members);
  const renewalTotals = new Map<number, number>();
  for (const payment of payments) {
    if (payment.type !== "renewal" || !payment.subscription_id) continue;
    renewalTotals.set(
      payment.subscription_id,
      (renewalTotals.get(payment.subscription_id) || 0) + Number(payment.amount || 0),
    );
  }

  const events: OfflinePaymentView[] = [];

  for (const subscription of subscriptions) {
    if (subscription.price_paid == null || Number(subscription.price_paid) <= 0) continue;
    const renewalTotal = subscription.id > 0 ? renewalTotals.get(subscription.id) || 0 : 0;
    const amount = Math.max(Number(subscription.price_paid) - renewalTotal, 0);
    if (amount <= 0) continue;

    const member = memberMap.get(subscription.member_id);
    events.push({
      id: `subscription:${subscription.id}`,
      date: toIsoString(subscription.created_at),
      type: subscription.renewed_from_subscription_id ? "renewal" : "subscription",
      paymentMethod: subscription.payment_method ?? "unknown",
      name: member?.name || subscription.member_name || "Unknown client",
      amount,
      planMonths: subscription.plan_months,
      sessionsPerMonth: subscription.sessions_per_month,
      sync_status: subscription.sync_status,
    });
  }

  for (const payment of payments) {
    if (payment.type !== "renewal" && payment.type !== "guest_pass") continue;
    const member = memberMap.get(payment.member_id);
    const linkedSubscription = payment.subscription_id
      ? subscriptions.find((item) => item.id === payment.subscription_id)
      : null;
    events.push({
      id: `${payment.type}:${payment.id}`,
      date: payment.created_at,
      type: payment.type,
      paymentMethod: payment.payment_method ?? "unknown",
      name: member?.name || "Unknown client",
      amount: Number(payment.amount || 0),
      planMonths: linkedSubscription?.plan_months || 0,
      sessionsPerMonth: linkedSubscription?.sessions_per_month || null,
      sync_status: payment.sync_status,
    });
  }

  return events.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export async function getCachedMembers(search = "") {
  const [members, subscriptions] = await Promise.all([getAllMembers(), getAllSubscriptions()]);
  const needle = search.trim().toLowerCase();

  return members
    .map<OfflineMemberListItem>((member) => {
      const current = getTopSubscriptionForMember(member.id, subscriptions);
      const subStatus = !current ? "no_sub" : getDisplayStatus(current) === "active" || getDisplayStatus(current) === "pending"
        ? "active"
        : "expired";
      return {
        id: member.id,
        name: member.name,
        phone: member.phone,
        gender: member.gender,
        card_code: member.card_code,
        created_at: member.created_at,
        sub_status: subStatus,
        sync_status: member.sync_status,
        last_error: member.last_error,
      };
    })
    .filter((member) => {
      if (!needle) return true;
      return member.name.toLowerCase().includes(needle)
        || member.phone.toLowerCase().includes(needle)
        || String(member.card_code || "").toLowerCase().includes(needle);
    })
    .sort((a, b) => b.created_at - a.created_at);
}

export async function getCachedMemberDetail(memberId: string) {
  const [member, subscriptions, logs, payments] = await Promise.all([
    getMember(memberId),
    getAllSubscriptions(),
    getAllAttendanceLogs(),
    getAllPayments(),
  ]);
  if (!member) return null;

  const accessReference = getCurrentSubscriptionAccessReferenceUnix();

  const memberSubs = subscriptions
    .filter((item) => item.member_id === memberId)
    .sort(rankSubscriptions(nowUnix()))
    .map((item) => ({
      ...item,
      sessions_remaining: item.sessions_remaining ?? deriveOfflineSessionsRemaining(item, member, accessReference),
      status: getDisplayStatus(item),
    }));

  const attendance = logs
    .filter((item) => item.member_id === memberId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
    .map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      method: item.method,
      sync_status: item.sync_status,
    }));

  const memberPayments = await getCachedMemberPayments(memberId);

  return {
    member,
    subscriptions: memberSubs,
    attendance,
    payments: memberPayments,
  };
}

export async function getCachedSubscriptions(memberId?: string) {
  const [subscriptions, members] = await Promise.all([getAllSubscriptions(), getAllMembers()]);
  const memberMap = buildMemberMap(members);
  const now = nowUnix();

  const filtered = memberId
    ? subscriptions.filter((item) => item.member_id === memberId)
    : subscriptions;

  return filtered
    .slice()
    .sort(rankSubscriptions(now))
    .map((item) => ({
      ...item,
      member_name: item.member_name || memberMap.get(item.member_id)?.name || item.member_id.slice(0, 8),
    }));
}

export async function getCachedMemberPayments(memberId: string): Promise<OfflineMemberPaymentRow[]> {
  const [subscriptions, payments] = await Promise.all([getAllSubscriptions(), getAllPayments()]);

  const subscriptionRows: OfflineMemberPaymentRow[] = subscriptions
    .filter((item) => item.member_id === memberId && item.price_paid != null && Number(item.price_paid) > 0)
    .map((item) => ({
      id: `subscription:${item.id}`,
      amount: String(item.price_paid ?? 0),
      type: item.renewed_from_subscription_id ? "renewal" : "subscription",
      note: null,
      created_at: toIsoString(item.created_at),
      subscription_id: item.id,
      guest_pass_id: null,
      payment_method: item.payment_method ?? null,
      plan_months: item.plan_months,
      sessions_per_month: item.sessions_per_month,
      sync_status: item.sync_status,
    }));

  const paymentRows: OfflineMemberPaymentRow[] = payments
    .filter((item) => item.member_id === memberId)
    .map((item) => ({
      id: item.id,
      amount: String(item.amount),
      type: item.type,
      note: item.note,
      created_at: item.created_at,
      subscription_id: item.subscription_id,
      guest_pass_id: item.guest_pass_id,
      payment_method: item.payment_method ?? null,
      plan_months: subscriptions.find((sub) => sub.id === item.subscription_id)?.plan_months ?? null,
      sessions_per_month: subscriptions.find((sub) => sub.id === item.subscription_id)?.sessions_per_month ?? null,
      sync_status: item.sync_status,
    }));

  return [...paymentRows, ...subscriptionRows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function getCachedDashboardOverview(): Promise<OfflineDashboardOverview> {
  const [members, subscriptions, payments, logs] = await Promise.all([
    getAllMembers(),
    getAllSubscriptions(),
    getAllPayments(),
    getAllAttendanceLogs(),
  ]);
  const todayStart = startOfTodayUnix();
  const activeSubscriptions = subscriptions.filter((item) => deriveSubscriptionStatus(item) === "active").length;
  const incomeEvents = buildIncomeEvents(subscriptions, payments, members);
  const todayLogs = logs.filter((item) => item.timestamp >= todayStart && item.timestamp < todayStart + 86400);

  return {
    totalMembers: members.length,
    activeSubscriptions,
    todayCheckIns: todayLogs.filter((item) => item.status === "success").length,
    totalRevenue: incomeEvents.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    todayStats: {
      allowed: todayLogs.filter((item) => item.status === "success").length,
      warning: todayLogs.filter((item) => item.status === "failure" && item.reason_code === "already_checked_in_today").length,
      denied: todayLogs.filter((item) => item.status === "failure" && item.reason_code !== "already_checked_in_today").length,
    },
  };
}

export async function getCachedRecentActivity(limit = 20): Promise<OfflineActivityEntry[]> {
  const logs = await getAllAttendanceLogs();
  return logs
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      result: item.status,
      reason_code: item.reason_code,
      scanned_value: item.scanned_value,
      member_name: item.member_name,
      sync_status: item.sync_status,
    }));
}

export async function getCachedTodayHourlyBars() {
  const logs = await getAllAttendanceLogs();
  const todayStart = startOfTodayUnix();
  const bars = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));

  for (const item of logs) {
    if (item.status !== "success") continue;
    if (item.timestamp < todayStart || item.timestamp >= todayStart + 86400) continue;
    const hour = getCairoHour(new Date(item.timestamp * 1000));
    if (hour >= 0 && hour < 24) {
      bars[hour].count += 1;
    }
  }

  return bars;
}

export async function getCachedIncomeSummary() {
  const [members, subscriptions, payments] = await Promise.all([getAllMembers(), getAllSubscriptions(), getAllPayments()]);
  const events = buildIncomeEvents(subscriptions, payments, members);
  const totalRevenue = events.reduce((sum, item) => sum + item.amount, 0);
  const current = toSubscriptionAccessReferenceUnix(nowUnix());
  const expectedMonthly = subscriptions
    .filter((item) => item.is_active && item.start_date <= current && item.end_date > current && item.price_paid != null)
    .reduce((sum, item) => sum + Number(item.price_paid || 0) / Math.max(1, item.plan_months || 1), 0);
  return { totalRevenue, expectedMonthly };
}

export async function getCachedMonthlyIncome() {
  const [members, subscriptions, payments] = await Promise.all([getAllMembers(), getAllSubscriptions(), getAllPayments()]);
  const events = buildIncomeEvents(subscriptions, payments, members);
  const rows = new Map<string, { month: string; revenue: number; subscriptionRevenue: number; guestRevenue: number; count: number }>();

  for (const event of events) {
    const month = event.date.slice(0, 7);
    const current = rows.get(month) || {
      month,
      revenue: 0,
      subscriptionRevenue: 0,
      guestRevenue: 0,
      count: 0,
    };
    current.revenue += event.amount;
    if (event.type === "guest_pass") current.guestRevenue += event.amount;
    if (event.type === "subscription" || event.type === "renewal") current.subscriptionRevenue += event.amount;
    current.count += 1;
    rows.set(month, current);
  }

  return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export async function getCachedIncomePayments(search = "", offset = 0, limit = 20) {
  const [members, subscriptions, payments] = await Promise.all([getAllMembers(), getAllSubscriptions(), getAllPayments()]);
  const events = buildIncomeEvents(subscriptions, payments, members);
  const needle = search.trim().toLowerCase();
  const filtered = events.filter((item) => !needle || item.name.toLowerCase().includes(needle));
  const page = filtered.slice(offset, offset + limit + 1);
  return {
    data: page.slice(0, limit),
    hasMore: page.length > limit,
  };
}

export async function getCachedRecentPayments(limit = 10) {
  const [members, subscriptions, payments] = await Promise.all([getAllMembers(), getAllSubscriptions(), getAllPayments()]);
  return buildIncomeEvents(subscriptions, payments, members).slice(0, limit);
}

export async function getOfflineWarningState() {
  const [settings, ageSeconds] = await Promise.all([getSettingsMap(), getOfflineAgeSeconds()]);
  const maxAgeHours = Number(settings.offline_max_age_hours || 72);
  const stale = Number.isFinite(ageSeconds) && ageSeconds > maxAgeHours * 3600;
  return {
    ageSeconds,
    stale,
    maxAgeHours,
  };
}

export async function getCachedFreezes(subscriptionId: number) {
  const freezes = await getAllFreezes();
  return freezes
    .filter((item) => item.subscription_id === subscriptionId)
    .sort((a, b) => b.created_at - a.created_at);
}

export async function getCachedAttendanceLogsForMember(memberId: string, limit = 20) {
  const logs = await getAllAttendanceLogs();
  return logs
    .filter((item) => item.member_id === memberId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
