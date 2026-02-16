"use client";

import { createContext, useContext } from "react";

export type Lang = "en" | "ar";

export const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
}>({
  lang: "en",
  setLang: () => {}
});

export function useLang() {
  return useContext(LangContext);
}

/** Dashboard navigation and shared labels */
export const t = {
  en: {
    dashboard: "Dashboard",
    members: "Members",
    subscriptions: "Subscriptions",
    reports: "Reports",
    settings: "Settings",
    import: "Import",
    logout: "Logout",
    search: "Search...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading...",
    noData: "No data found",
    error: "Something went wrong",
    retry: "Try again",
    back: "Back",
    next: "Next",
    create: "Create",
    edit: "Edit",
    actions: "Actions",
    name: "Name",
    phone: "Phone",
    gender: "Gender",
    male: "Male",
    female: "Female",
    status: "Status",
    active: "Active",
    expired: "Expired",
    total: "Total",
    date: "Date",
    scanner: "Scanner",
    scanPlaceholder: "Scan or type member ID...",
    checkIn: "Check in"
  },
  ar: {
    dashboard: "لوحة التحكم",
    members: "الأعضاء",
    subscriptions: "الاشتراكات",
    reports: "التقارير",
    settings: "الإعدادات",
    import: "استيراد",
    logout: "تسجيل الخروج",
    search: "بحث...",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    confirm: "تأكيد",
    loading: "جاري التحميل...",
    noData: "لا توجد بيانات",
    error: "حدث خطأ",
    retry: "حاول مرة أخرى",
    back: "رجوع",
    next: "التالي",
    create: "إنشاء",
    edit: "تعديل",
    actions: "إجراءات",
    name: "الاسم",
    phone: "الهاتف",
    gender: "الجنس",
    male: "ذكر",
    female: "أنثى",
    status: "الحالة",
    active: "نشط",
    expired: "منتهي",
    total: "المجموع",
    date: "التاريخ",
    scanner: "الماسح",
    scanPlaceholder: "امسح أو اكتب معرف العضو...",
    checkIn: "تسجيل دخول"
  }
} as const;
